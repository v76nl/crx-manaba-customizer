import { getSettings } from "../utils/storage.js";

// manabaのSSOで発生するリダイレクトループ (ERR_TOO_MANY_REDIRECTS) の自動復旧
const LOOP_ERROR = "net::ERR_TOO_MANY_REDIRECTS";

const MANABA_HOST = "room.chuo-u.ac.jp";
const IDP_HOST = "gakunin-idp.c.chuo-u.ac.jp";
const SSO_COOKIE_DOMAIN = "c.chuo-u.ac.jp";

const LOGOUT_URL = `https://${IDP_HOST}/sso/timeout.cgi?logout=true`;
const FALLBACK_URL = `https://${MANABA_HOST}/ct/home_library_query`;

// ログアウト処理でサーバーが削除するCookie
const SSO_COOKIE_NAMES = ["auth_tkt", "samsessid", "auth_login", "authselect"];
// 1段階目で直らなかった場合に追加で削除するCookie
const IDP_SESSION_COOKIE_PREFIX = "SimpleSAML";
const MANABA_SESSION_COOKIE_PREFIXES = ["_shibsession_", "_opensaml_req_"];

const MAX_ATTEMPTS = 2;
const ATTEMPT_WINDOW_MS = 60 * 1000;
const LOGOUT_TIMEOUT_MS = 8000;
const MAX_LOG_ENTRIES = 20;

const LOG_KEY = "redirectRecoveryLog";
const returnUrlKey = (tabId) => `redirectRecovery:returnUrl:${tabId}`;
const attemptsKey = (tabId) => `redirectRecovery:attempts:${tabId}`;
const startedOnSsoKey = (tabId) => `redirectRecovery:startedOnSso:${tabId}`;

// 指定条件に一致するCookieを削除し、削除したCookie名を返す
async function removeCookies(domain, shouldRemove) {
    const cookies = await chrome.cookies.getAll({ domain });
    const targets = cookies.filter((cookie) => shouldRemove(cookie.name));

    await Promise.all(
        targets.map((cookie) =>
            chrome.cookies.remove({
                url: `https://${cookie.domain.replace(/^\./, "")}${cookie.path}`,
                name: cookie.name
            })
        )
    );
    return targets.map((cookie) => cookie.name);
}

// 1段階目: サーバーのログアウト処理を呼び、SSOのCookieを削除する
async function clearSsoSession() {
    try {
        await fetch(LOGOUT_URL, {
            credentials: "include",
            redirect: "manual",
            cache: "no-store",
            signal: AbortSignal.timeout(LOGOUT_TIMEOUT_MS)
        });
    } catch (err) {
        console.warn("[manaba-customizer] SSO logout failed:", err);
    }
    return removeCookies(SSO_COOKIE_DOMAIN, (name) =>
        SSO_COOKIE_NAMES.includes(name)
    );
}

// 2段階目: IdPとmanabaのセッションCookieも削除する
async function clearAllSessions() {
    const ssoCookies = await clearSsoSession();
    const idpCookies = await removeCookies(IDP_HOST, (name) =>
        name.startsWith(IDP_SESSION_COOKIE_PREFIX)
    );
    const manabaCookies = await removeCookies(MANABA_HOST, (name) =>
        MANABA_SESSION_COOKIE_PREFIXES.some((prefix) =>
            name.startsWith(prefix)
        )
    );
    return [...ssoCookies, ...idpCookies, ...manabaCookies];
}

// 一定時間内の復旧回数を数える
async function nextAttempt(tabId) {
    const key = attemptsKey(tabId);
    const { [key]: previous } = await chrome.storage.session.get(key);
    const now = Date.now();
    const isActive = previous && now - previous.startedAt < ATTEMPT_WINDOW_MS;
    const attempts = {
        startedAt: isActive ? previous.startedAt : now,
        count: isActive ? previous.count + 1 : 1
    };
    await chrome.storage.session.set({ [key]: attempts });
    return attempts.count;
}

// 原因調査用の記録 (Cookieの値とURLのクエリは保存しない)
async function appendLog(entry) {
    const { [LOG_KEY]: log = [] } = await chrome.storage.local.get(LOG_KEY);
    await chrome.storage.local.set({
        [LOG_KEY]: [...log, entry].slice(-MAX_LOG_ENTRIES)
    });
}

async function notifyRecoveryFailed(tabId) {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#c62828" });
    await chrome.action.setBadgeText({ tabId, text: "!" });
    await chrome.action.setTitle({
        tabId,
        title: "manabaのログインを自動復旧できませんでした"
    });
}

async function recover({ tabId, url }) {
    const settings = await getSettings();
    if (!settings.enabled || !settings.autoRecoverRedirectLoop) return;

    // 外部サイトから誘導されたリダイレクトではセッションを削除しない
    const startedKey = startedOnSsoKey(tabId);
    const { [startedKey]: startedOnSso } =
        await chrome.storage.session.get(startedKey);
    if (!startedOnSso) return;

    const attempt = await nextAttempt(tabId);
    const { host, pathname } = new URL(url);
    const logEntry = { at: new Date().toISOString(), host, pathname, attempt };

    if (attempt > MAX_ATTEMPTS) {
        await appendLog({ ...logEntry, result: "gave-up" });
        await notifyRecoveryFailed(tabId);
        return;
    }

    const removedCookies =
        attempt === 1 ? await clearSsoSession() : await clearAllSessions();
    await appendLog({ ...logEntry, result: "retried", removedCookies });

    const key = returnUrlKey(tabId);
    const { [key]: returnUrl } = await chrome.storage.session.get(key);
    await chrome.tabs.update(tabId, { url: returnUrl || FALLBACK_URL });
}

export function registerRedirectRecovery() {
    // タブごとに移動の開始元と、復旧後に戻るmanabaのURLを記憶する
    chrome.webNavigation.onBeforeNavigate.addListener(
        ({ tabId, frameId, url }) => {
            if (frameId !== 0) return;

            const { protocol, hostname, pathname } = new URL(url);
            const isHttps = protocol === "https:";
            const updates = {
                [startedOnSsoKey(tabId)]:
                    isHttps && [MANABA_HOST, IDP_HOST].includes(hostname)
            };
            if (
                isHttps &&
                hostname === MANABA_HOST &&
                pathname.startsWith("/ct/")
            ) {
                updates[returnUrlKey(tabId)] = url;
            }
            chrome.storage.session.set(updates);
        }
    );

    chrome.webNavigation.onErrorOccurred.addListener(
        (details) => {
            if (details.frameId !== 0 || details.error !== LOOP_ERROR) return;
            recover(details).catch((err) => {
                console.error("[manaba-customizer] Recovery failed:", err);
            });
        },
        { url: [{ hostEquals: MANABA_HOST }, { hostEquals: IDP_HOST }] }
    );

    chrome.tabs.onRemoved.addListener((tabId) => {
        chrome.storage.session.remove([
            returnUrlKey(tabId),
            attemptsKey(tabId),
            startedOnSsoKey(tabId)
        ]);
    });
}

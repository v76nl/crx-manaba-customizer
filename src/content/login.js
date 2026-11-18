(() => {
    const POLL_INTERVAL_MS = 200;
    const STABLE_DURATION_MS = 500;
    const WAIT_TIMEOUT_MS = 30 * 1000;
    // ログイン失敗時に同じ内容で再送信し続けないための待機時間
    const RETRY_GUARD_MS = 60 * 1000;
    const LAST_CLICK_KEY = "manabaCustomizer:autoLoginClickedAt";

    const byId = (id) => document.getElementById(id);
    const isVisible = (el) => Boolean(el) && el.getClientRects().length > 0;

    let timerId = null;
    let stableSince = null;
    let lastSnapshot = null;

    function stop() {
        clearInterval(timerId);
        document.removeEventListener("keydown", handleKeydown, true);
        document.removeEventListener("paste", stop, true);
        document.removeEventListener("submit", stop, true);
    }

    // 利用者が手入力を始めたら、入力途中で送信しないよう自動クリックを止める
    function handleKeydown(event) {
        if (!event.isTrusted) return;
        const isTyping =
            event.key.length === 1 ||
            ["Backspace", "Delete", "Enter"].includes(event.key);
        if (isTyping) stop();
    }

    function hasLoginError() {
        return Boolean(byId("comment")?.textContent.trim());
    }

    function clickedRecently() {
        const clickedAt = Number(sessionStorage.getItem(LAST_CLICK_KEY));
        return Date.now() - clickedAt < RETRY_GUARD_MS;
    }

    // 入力済みでログインボタンを押せる状態なら、入力値の長さを返す
    function readySnapshot() {
        const username = byId("username_input");
        const password = byId("password_input");
        const button = byId("login_button");

        const canSubmit =
            username?.value &&
            password?.value &&
            isVisible(password) &&
            isVisible(button) &&
            !button.disabled &&
            !isVisible(byId("otp_send_button"));

        return canSubmit
            ? `${username.value.length}:${password.value.length}`
            : null;
    }

    function tick(deadline) {
        if (Date.now() > deadline || hasLoginError()) {
            stop();
            return;
        }

        const snapshot = readySnapshot();
        if (snapshot !== lastSnapshot) {
            lastSnapshot = snapshot;
            stableSince = Date.now();
            return;
        }
        if (!snapshot || Date.now() - stableSince < STABLE_DURATION_MS) return;

        stop();
        sessionStorage.setItem(LAST_CLICK_KEY, String(Date.now()));
        byId("login_button").click();
    }

    function start() {
        if (hasLoginError() || clickedRecently()) return;

        document.addEventListener("keydown", handleKeydown, true);
        document.addEventListener("paste", stop, true);
        document.addEventListener("submit", stop, true);

        const deadline = Date.now() + WAIT_TIMEOUT_MS;
        timerId = setInterval(() => tick(deadline), POLL_INTERVAL_MS);
    }

    const defaults = { enabled: true, autoLogin: true };
    chrome.storage.sync.get(defaults, (items) => {
        const useSettings = (settings) => {
            if (settings.enabled && settings.autoLogin) start();
        };
        if (chrome.runtime.lastError) {
            chrome.storage.local.get(defaults, useSettings);
        } else {
            useSettings(items);
        }
    });
})();

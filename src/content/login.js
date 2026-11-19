(() => {
    const POLL_INTERVAL_MS = 200;
    const STABLE_DURATION_MS = 500;
    const WAIT_TIMEOUT_MS = 30 * 1000;
    // ログイン失敗時に同じ内容で再送信し続けないための待機時間
    const RETRY_GUARD_MS = 60 * 1000;
    const LAST_CLICK_KEY = "manabaCustomizer:autoLoginClickedAt";
    const CLICK_HINT_ID = "manaba-customizer-login-hint";

    const byId = (id) => document.getElementById(id);
    const isVisible = (el) => Boolean(el) && el.getClientRects().length > 0;

    let timerId = null;
    let deadline = 0;
    let stableSince = null;
    let lastSnapshot = null;

    function showClickHint() {
        if (byId(CLICK_HINT_ID)) return;

        const hint = document.createElement("div");
        hint.id = CLICK_HINT_ID;
        hint.setAttribute("role", "status");
        hint.textContent = "画面をクリックするとログインします";
        Object.assign(hint.style, {
            position: "fixed",
            top: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: "2147483647",
            padding: "10px 16px",
            background: "#1f2937",
            color: "#ffffff",
            fontSize: "14px",
            pointerEvents: "none"
        });
        document.documentElement.append(hint);
    }

    function hideClickHint() {
        byId(CLICK_HINT_ID)?.remove();
    }

    // ブラウザの保存済みパスワードは、ページを操作するまで値を読み取れない
    function isAwaitingClick() {
        const password = byId("password_input");
        return Boolean(
            password &&
            !password.value &&
            password.matches(":-webkit-autofill")
        );
    }

    function stop() {
        clearInterval(timerId);
        hideClickHint();
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

    function tick() {
        const awaitingClick = isAwaitingClick();
        if (awaitingClick) {
            showClickHint();
        } else {
            hideClickHint();
        }
        if (awaitingClick || document.hidden) {
            deadline = Date.now() + WAIT_TIMEOUT_MS;
        }

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

        deadline = Date.now() + WAIT_TIMEOUT_MS;
        timerId = setInterval(tick, POLL_INTERVAL_MS);
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

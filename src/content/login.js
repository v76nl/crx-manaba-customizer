(() => {
    const SELECTOR = "button#login_button.login_button";
    let hasClicked = false;

    function checkAndClick() {
        if (hasClicked) return;

        chrome.storage.sync.get({ enabled: true, autoLogin: true }, (items) => {
            if (chrome.runtime.lastError) {
                chrome.storage.local.get(
                    { enabled: true, autoLogin: true },
                    (localItems) => proceed(localItems)
                );
            } else {
                proceed(items);
            }
        });

        function proceed(settings) {
            if (!settings.enabled || !settings.autoLogin) return;

            const btn = document.querySelector(SELECTOR);
            if (!btn || btn.disabled) return;

            hasClicked = true;
            setTimeout(() => {
                if (!btn.isConnected || btn.disabled) return;
                btn.click();
            }, 1000);
        }
    }

    if (document.readyState === "complete") {
        checkAndClick();
    } else {
        window.addEventListener("load", checkAndClick);
    }

    const observer = new MutationObserver(() => {
        if (document.readyState === "complete" && !hasClicked) {
            checkAndClick();
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
})();

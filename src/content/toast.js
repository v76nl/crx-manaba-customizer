// ページ上トースト通知ユーティリティ
(() => {
    function showToast(message, type = "info", duration = 3000) {
        let toastContainer = document.getElementById(
            "manaba-customizer-toast-container"
        );
        if (!toastContainer) {
            toastContainer = document.createElement("div");
            toastContainer.id = "manaba-customizer-toast-container";
            toastContainer.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 999999;
                display: flex;
                flex-direction: column;
                gap: 8px;
                pointer-events: none;
                font-family: "BIZ UDPGothic", "Hiragino Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            `;
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement("div");
        toast.className = `manaba-customizer-toast ${type}`;

        const bgColors = {
            info: "#1e293b",
            success: "#2e7d32",
            warning: "#d97706",
            error: "#dc2626"
        };

        toast.style.cssText = `
            background-color: ${bgColors[type] || bgColors.info};
            color: #ffffff;
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 500;
            border: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: auto;
            max-width: 380px;
            line-height: 1.5;
        `;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // フェードイン
        requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translateY(0)";
        });

        // フェードアウトと破棄
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(10px)";
            setTimeout(() => {
                toast.remove();
                if (toastContainer.childNodes.length === 0) {
                    toastContainer.remove();
                }
            }, 200);
        }, duration);
    }

    window.showToast = showToast;
})();

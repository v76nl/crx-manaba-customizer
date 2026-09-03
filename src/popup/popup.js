import {
    DEFAULT_SETTINGS,
    getSettings,
    resetSettings,
    saveSettings
} from "../utils/storage.js";

document.addEventListener("DOMContentLoaded", async () => {
    // UI要素の取得
    const enabledInput = document.getElementById("enabled");
    const enhanceFormsInput = document.getElementById("enhanceForms");
    const highlightNegativeWordsInput = document.getElementById(
        "highlightNegativeWords"
    );
    const enableReplacementsInput =
        document.getElementById("enableReplacements");
    const renameTabTitleInput = document.getElementById("renameTabTitle");
    const removeSaturdayInput = document.getElementById("removeSaturday");
    const enableSubjectTitlesInput = document.getElementById(
        "enableSubjectTitles"
    );
    const addSyllabusLinkInput = document.getElementById("addSyllabusLink");
    const customCssInput = document.getElementById("customCss");

    const startEditSubjectBtn = document.getElementById("startEditSubjectBtn");
    const editStatusMsg = document.getElementById("editStatusMsg");
    const resetBtn = document.getElementById("resetBtn");
    const openOptionsBtn = document.getElementById("openOptionsBtn");

    let currentSettings = await getSettings();

    // フォームに現在の設定値を反映
    function updateUI(settings) {
        enabledInput.checked = Boolean(settings.enabled);

        enhanceFormsInput.checked = Boolean(settings.enhanceForms);
        highlightNegativeWordsInput.checked = Boolean(
            settings.highlightNegativeWords
        );
        enableReplacementsInput.checked = Boolean(settings.enableReplacements);
        renameTabTitleInput.checked = Boolean(settings.renameTabTitle);
        removeSaturdayInput.checked = Boolean(settings.removeSaturday);
        enableSubjectTitlesInput.checked = Boolean(
            settings.enableSubjectTitles
        );
        addSyllabusLinkInput.checked = Boolean(settings.addSyllabusLink);

        customCssInput.value = settings.customCss || "";
    }

    updateUI(currentSettings);

    // 設定変更ハンドラー
    async function handleSettingChange(key, value) {
        currentSettings[key] = value;
        await saveSettings(currentSettings);
    }

    // チェックボックスイベント
    const checkboxMap = [
        { input: enabledInput, key: "enabled" },
        { input: enhanceFormsInput, key: "enhanceForms" },
        { input: highlightNegativeWordsInput, key: "highlightNegativeWords" },
        { input: enableReplacementsInput, key: "enableReplacements" },
        { input: renameTabTitleInput, key: "renameTabTitle" },
        { input: removeSaturdayInput, key: "removeSaturday" },
        { input: enableSubjectTitlesInput, key: "enableSubjectTitles" },
        { input: addSyllabusLinkInput, key: "addSyllabusLink" }
    ];

    checkboxMap.forEach(({ input, key }) => {
        input.addEventListener("change", () => {
            handleSettingChange(key, input.checked);
        });
    });

    // カスタムCSS（デバウンス保存）
    let cssTimeout = null;
    customCssInput.addEventListener("input", () => {
        clearTimeout(cssTimeout);
        cssTimeout = setTimeout(() => {
            handleSettingChange("customCss", customCssInput.value);
        }, 400);
    });

    // 科目名編集モードの開始
    startEditSubjectBtn.addEventListener("click", async () => {
        editStatusMsg.hidden = true;
        editStatusMsg.textContent = "";

        const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });
        const activeTab = tabs[0];

        if (
            !activeTab ||
            !activeTab.url ||
            !activeTab.url.includes("room.chuo-u.ac.jp/ct/")
        ) {
            editStatusMsg.hidden = false;
            editStatusMsg.textContent =
                "※ manabaのコース画面を開いた状態で実行してください";
            return;
        }

        try {
            await chrome.tabs.sendMessage(activeTab.id, {
                action: "enterSelectionMode"
            });
            window.close(); // 編集をスムーズに行えるようポップアップを閉じる
        } catch (err) {
            editStatusMsg.hidden = false;
            editStatusMsg.textContent =
                "※ ページを再読み込みしてから再度お試しください";
        }
    });

    // 詳細設定を開く
    openOptionsBtn.addEventListener("click", () => {
        chrome.runtime.openOptionsPage();
    });

    // リセットボタン
    resetBtn.addEventListener("click", async () => {
        if (confirm("すべての設定を初期状態にリセットしますか？")) {
            await resetSettings();
            currentSettings = await getSettings();
            updateUI(currentSettings);
        }
    });

    // ツールチップ初期化 (0.2秒待機で表示)
    function initTooltips() {
        const tooltipEl = document.getElementById("customTooltip");
        if (!tooltipEl) return;

        let showTimer = null;

        document.querySelectorAll("[data-tooltip]").forEach((targetEl) => {
            targetEl.addEventListener("mouseenter", () => {
                const text = targetEl.getAttribute("data-tooltip");
                if (!text) return;

                clearTimeout(showTimer);
                showTimer = setTimeout(() => {
                    tooltipEl.textContent = text;
                    tooltipEl.classList.add("show");

                    // 位置の計算
                    const rect = targetEl.getBoundingClientRect();
                    const tooltipRect = tooltipEl.getBoundingClientRect();

                    // 基本は要素の下側に表示。画面下端に近ければ上側に配置
                    let top = rect.bottom + 6;
                    if (top + tooltipRect.height > window.innerHeight - 8) {
                        top = Math.max(8, rect.top - tooltipRect.height - 6);
                    }

                    // 水平位置: 中央揃えしつつ、左右の端からはみ出さないよう制限
                    let left = rect.left + (rect.width - tooltipRect.width) / 2;
                    left = Math.max(
                        8,
                        Math.min(
                            left,
                            window.innerWidth - tooltipRect.width - 8
                        )
                    );

                    tooltipEl.style.top = `${Math.round(top)}px`;
                    tooltipEl.style.left = `${Math.round(left)}px`;
                }, 200); // 0.2秒 (200ms) 待機
            });

            const hide = () => {
                clearTimeout(showTimer);
                tooltipEl.classList.remove("show");
            };

            targetEl.addEventListener("mouseleave", hide);
            targetEl.addEventListener("mousedown", hide);
        });
    }

    initTooltips();
});

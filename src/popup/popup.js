import {
    DEFAULT_SETTINGS,
    getSettings,
    resetSettings,
    saveSettings
} from "../utils/storage.js";

document.addEventListener("DOMContentLoaded", async () => {
    // UI要素の取得
    const enabledInput = document.getElementById("enabled");
    const themeRadios = document.querySelectorAll('input[name="themeMode"]');
    const autoLoginInput = document.getElementById("autoLogin");
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
    const customCssInput = document.getElementById("customCss");

    const startEditSubjectBtn = document.getElementById("startEditSubjectBtn");
    const editStatusMsg = document.getElementById("editStatusMsg");
    const resetBtn = document.getElementById("resetBtn");
    const openOptionsBtn = document.getElementById("openOptionsBtn");

    let currentSettings = await getSettings();

    // フォームに現在の設定値を反映
    function updateUI(settings) {
        enabledInput.checked = Boolean(settings.enabled);

        themeRadios.forEach((radio) => {
            radio.checked = radio.value === settings.themeMode;
        });

        autoLoginInput.checked = Boolean(settings.autoLogin);
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
        { input: autoLoginInput, key: "autoLogin" },
        { input: enhanceFormsInput, key: "enhanceForms" },
        { input: highlightNegativeWordsInput, key: "highlightNegativeWords" },
        { input: enableReplacementsInput, key: "enableReplacements" },
        { input: renameTabTitleInput, key: "renameTabTitle" },
        { input: removeSaturdayInput, key: "removeSaturday" },
        { input: enableSubjectTitlesInput, key: "enableSubjectTitles" }
    ];

    checkboxMap.forEach(({ input, key }) => {
        input.addEventListener("change", () => {
            handleSettingChange(key, input.checked);
        });
    });

    // テーマ選択イベント
    themeRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
            if (radio.checked) {
                handleSettingChange("themeMode", radio.value);
            }
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
});

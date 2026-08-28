import {
    DEFAULT_SETTINGS,
    getSettings,
    resetSettings,
    saveSettings
} from "../utils/storage.js";

document.addEventListener("DOMContentLoaded", async () => {
    // UI要素の取得
    const optEnabled = document.getElementById("optEnabled");
    const optThemeMode = document.getElementById("optThemeMode");
    const optAutoLogin = document.getElementById("optAutoLogin");
    const optEnhanceForms = document.getElementById("optEnhanceForms");
    const optRenameTabTitle = document.getElementById("optRenameTabTitle");
    const optRemoveSaturday = document.getElementById("optRemoveSaturday");
    const optHighlightNegativeWords = document.getElementById(
        "highlightNegativeWords"
    );
    const optHighlightWords = document.getElementById("optHighlightWords");
    const optEnableReplacements = document.getElementById(
        "optEnableReplacements"
    );
    const optReplacements = document.getElementById("optReplacements");
    const optEnableSubjectTitles = document.getElementById(
        "optEnableSubjectTitles"
    );
    const subjectTitlesList = document.getElementById("subjectTitlesList");
    const clearSubjectTitlesBtn = document.getElementById(
        "clearSubjectTitlesBtn"
    );
    const optCustomCss = document.getElementById("optCustomCss");

    const exportBtn = document.getElementById("exportBtn");
    const importInput = document.getElementById("importInput");
    const optResetBtn = document.getElementById("optResetBtn");

    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMsg");

    let currentSettings = await getSettings();

    // トースト表示ヘルパー
    let toastTimeout = null;
    function showNotification(message) {
        toastMsg.textContent = message;
        toast.classList.add("show");
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove("show");
        }, 2200);
    }

    // 置換ルールの辞書 <-> 文字列変換
    function replacementsToString(rules) {
        return Object.entries(rules || {})
            .map(([from, to]) => `${from}=>${to}`)
            .join("\n");
    }

    function stringToReplacements(text) {
        const rules = {};
        text.split("\n").forEach((line) => {
            const [from, to] = line.split("=>");
            if (from && to !== undefined) {
                rules[from.trim()] = to.trim();
            }
        });
        return rules;
    }

    // 科目名リストのレンダリング
    function renderSubjectTitlesList(titles) {
        subjectTitlesList.innerHTML = "";
        const entries = Object.entries(titles || {});

        if (entries.length === 0) {
            subjectTitlesList.innerHTML = `
                <div class="empty-state">
                    現在登録されている個別カスタム科目名はありません。<br>
                    （デフォルトのゼミ名置換辞書は自動適用されます）
                </div>
            `;
            return;
        }

        entries.forEach(([key, val]) => {
            const row = document.createElement("div");
            row.className = "subject-item-row";

            const info = document.createElement("div");
            info.innerHTML = `
                <span class="subject-key">${key}</span>:
                <span class="subject-val">${val}</span>
            `;

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "subject-delete-btn";
            delBtn.textContent = "削除";
            delBtn.addEventListener("click", async () => {
                delete currentSettings.subjectTitles[key];
                await saveSettings(currentSettings);
                renderSubjectTitlesList(currentSettings.subjectTitles);
                showNotification(`「${val}」の設定を削除しました`);
            });

            row.appendChild(info);
            row.appendChild(delBtn);
            subjectTitlesList.appendChild(row);
        });
    }

    // 全UIの更新
    function updateUI(settings) {
        optEnabled.checked = Boolean(settings.enabled);
        optThemeMode.value = settings.themeMode || "system";
        optAutoLogin.checked = Boolean(settings.autoLogin);
        optEnhanceForms.checked = Boolean(settings.enhanceForms);
        optRenameTabTitle.checked = Boolean(settings.renameTabTitle);
        optRemoveSaturday.checked = Boolean(settings.removeSaturday);
        optHighlightNegativeWords.checked = Boolean(
            settings.highlightNegativeWords
        );
        optHighlightWords.value = settings.highlightWords || "";
        optEnableReplacements.checked = Boolean(settings.enableReplacements);
        optReplacements.value = replacementsToString(settings.replacements);
        optEnableSubjectTitles.checked = Boolean(settings.enableSubjectTitles);
        optCustomCss.value = settings.customCss || "";

        renderSubjectTitlesList(settings.subjectTitles);
    }

    updateUI(currentSettings);

    // 設定保存共通処理
    async function persistChanges(notify = true) {
        await saveSettings(currentSettings);
        if (notify) showNotification("設定を保存しました");
    }

    // トグル・セレクトボックスのリスナー登録
    const formBindings = [
        { el: optEnabled, key: "enabled", isCheck: true },
        { el: optThemeMode, key: "themeMode", isCheck: false },
        { el: optAutoLogin, key: "autoLogin", isCheck: true },
        { el: optEnhanceForms, key: "enhanceForms", isCheck: true },
        { el: optRenameTabTitle, key: "renameTabTitle", isCheck: true },
        { el: optRemoveSaturday, key: "removeSaturday", isCheck: true },
        {
            el: optHighlightNegativeWords,
            key: "highlightNegativeWords",
            isCheck: true
        },
        { el: optEnableReplacements, key: "enableReplacements", isCheck: true },
        {
            el: optEnableSubjectTitles,
            key: "enableSubjectTitles",
            isCheck: true
        }
    ];

    formBindings.forEach(({ el, key, isCheck }) => {
        el.addEventListener("change", () => {
            currentSettings[key] = isCheck ? el.checked : el.value;
            persistChanges();
        });
    });

    // テキストエリア（デバウンス保存）
    function setupDebouncedInput(el, onSave) {
        let timer = null;
        el.addEventListener("input", () => {
            clearTimeout(timer);
            timer = setTimeout(async () => {
                await onSave();
                persistChanges();
            }, 400);
        });
    }

    setupDebouncedInput(optHighlightWords, () => {
        currentSettings.highlightWords = optHighlightWords.value;
    });

    setupDebouncedInput(optReplacements, () => {
        currentSettings.replacements = stringToReplacements(
            optReplacements.value
        );
    });

    setupDebouncedInput(optCustomCss, () => {
        currentSettings.customCss = optCustomCss.value;
    });

    // カスタム科目名の全クリア
    clearSubjectTitlesBtn.addEventListener("click", async () => {
        if (confirm("登録されているカスタム科目名をすべてクリアしますか？")) {
            currentSettings.subjectTitles = {};
            await persistChanges(false);
            renderSubjectTitlesList({});
            showNotification("カスタム科目名をクリアしました");
        }
    });

    // 設定のエクスポート
    exportBtn.addEventListener("click", () => {
        const jsonStr = JSON.stringify(currentSettings, null, 4);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `manaba-customizer-settings-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showNotification("設定ファイルをエクスポートしました");
    });

    // 設定のインポート
    importInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                currentSettings = { ...DEFAULT_SETTINGS, ...imported };
                await saveSettings(currentSettings);
                updateUI(currentSettings);
                showNotification("設定を正常にインポートしました");
            } catch (err) {
                alert(
                    "設定ファイルの読み込みに失敗しました。正しいJSONファイルか確認してください。"
                );
            }
        };
        reader.readAsText(file);
        importInput.value = "";
    });

    // 初期設定リセット
    optResetBtn.addEventListener("click", async () => {
        if (confirm("すべての設定を初期デフォルト値に戻しますか？")) {
            await resetSettings();
            currentSettings = await getSettings();
            updateUI(currentSettings);
            showNotification("すべての設定を初期化しました");
        }
    });
});

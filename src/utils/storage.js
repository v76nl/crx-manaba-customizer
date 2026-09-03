// 設定のデフォルト値定義
export const DEFAULT_SETTINGS = {
    // 拡張機能全体の有効/無効
    enabled: true,

    // テーマ設定 ("system": デバイス設定連動, "light": ライト固定, "dark": ダーク固定)
    themeMode: "system",

    // 1. manaba自動ログイン（学認認証）
    autoLogin: true,

    // 2. 回答フォーム外観調整
    enhanceForms: true,

    // 3. 誤答選択問題の強調表示
    highlightNegativeWords: true,
    highlightWords: "誤っている\n誤り\n間違っている\n間違い",

    // 4. 任意文字列の置換
    enableReplacements: true,
    replacements: {},

    // 5. わかりやすいタブタイトル
    renameTabTitle: true,

    // 6. 時間割の土曜日非表示
    removeSaturday: true,

    // 7. 科目名のカスタム表示・編集
    enableSubjectTitles: true,
    subjectTitles: {},

    // 8. シラバス検索リンクの追加
    addSyllabusLink: true,

    // ユーザー定義カスタムCSS
    customCss: ""
};

// chrome.storageから現在の設定を取得する
export async function getSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
            if (chrome.runtime.lastError) {
                // syncが失敗した場合はlocalストレージへフォールバック
                chrome.storage.local.get(DEFAULT_SETTINGS, (fallbackItems) => {
                    resolve({ ...DEFAULT_SETTINGS, ...fallbackItems });
                });
            } else {
                resolve({ ...DEFAULT_SETTINGS, ...items });
            }
        });
    });
}

// 変更後の設定をchrome.storageに保存する
export async function saveSettings(settings) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set(settings, () => {
            if (chrome.runtime.lastError) {
                chrome.storage.local.set(settings, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    });
}

// すべての設定を初期デフォルト値にリセットする
export async function resetSettings() {
    return saveSettings(DEFAULT_SETTINGS);
}

// 設定のデフォルト値定義
export const DEFAULT_SETTINGS = {
    // 拡張機能全体の有効/無効
    enabled: true,

    // 1. 回答フォーム外観調整
    enhanceForms: true,

    // 2. 誤答選択問題の強調表示
    highlightNegativeWords: true,
    highlightWords: "誤っている\n誤り\n間違っている\n間違い",

    // 3. 任意文字列の置換
    enableReplacements: true,
    replacements: {},

    // 4. わかりやすいタブタイトル
    renameTabTitle: true,

    // 5. 時間割の土曜日非表示
    removeSaturday: true,

    // 6. 科目名のカスタム表示・編集
    enableSubjectTitles: true,
    subjectTitles: {},

    // 7. シラバス検索リンクの追加
    addSyllabusLink: true,

    // 8. ログインのリダイレクトループ自動復旧
    autoRecoverRedirectLoop: true,

    // 9. ログインボタンの自動クリック
    autoLogin: true,

    // ユーザー定義カスタムCSS
    customCss: ""
};

const SUBJECT_KEY_PATTERN = /^course_\d+$/;

const isPlainObject = (value) =>
    typeof value === "object" && value !== null && !Array.isArray(value);

function pickStringEntries(map, keyPattern) {
    return Object.fromEntries(
        Object.entries(map).filter(
            ([key, value]) =>
                typeof value === "string" && (!keyPattern || keyPattern.test(key))
        )
    );
}

// 読み込んだ設定ファイルから、既知の項目と正しい型の値だけを取り出す
export function sanitizeImportedSettings(imported) {
    if (!isPlainObject(imported)) {
        throw new Error("設定ファイルの形式が正しくありません");
    }

    const settings = { ...DEFAULT_SETTINGS };
    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
        const value = imported[key];
        if (isPlainObject(defaultValue)) {
            if (isPlainObject(value)) {
                settings[key] = pickStringEntries(
                    value,
                    key === "subjectTitles" ? SUBJECT_KEY_PATTERN : null
                );
            }
        } else if (typeof value === typeof defaultValue) {
            settings[key] = value;
        }
    }
    return settings;
}

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

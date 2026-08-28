import {
    DEFAULT_SETTINGS,
    getSettings,
    saveSettings
} from "../utils/storage.js";

// 拡張機能インストール/更新時の初期化処理
chrome.runtime.onInstalled.addListener(async (details) => {
    try {
        const currentSettings = await getSettings();
        // 初期値が設定されていない項目があればマージして保存
        const mergedSettings = { ...DEFAULT_SETTINGS, ...currentSettings };
        await saveSettings(mergedSettings);
    } catch (err) {
        console.error("[manaba-customizer] Initialization failed:", err);
    }
});

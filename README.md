# manaba-customizer

中央大学manabaの見た目や利便性を総合的に向上させるChrome拡張機能。

## 目次

1. [概要](#概要)
2. [仕組み](#仕組み)
3. [構造](#構造)
4. [インストール手順](#インストール手順)
5. [機能一覧](#機能一覧)

## 概要

中央大学のmanabaにおいて、7つの便利機能を1つに統合し、CampusSquare Customizerと同等の統一スクエアUIでそれぞれの機能を個別にON/OFFできる拡張機能です。ポップアップおよび詳細設定ページから外観テーマや各種最適化の設定が可能です。

## 仕組み

- プラットフォーム: Google Chrome / Microsoft Edge (Manifest V3 準拠)
- 言語: JavaScript (ES Modules), CSS, HTML
- 設定保存: `chrome.storage.sync` (フォールバック: `chrome.storage.local`)
- DOM制御: MutationObserverによる動的ノード監視、リアルタイム設定反映

## 構造

```text
manaba-customizer/
├── manifest.json            - 拡張機能マニフェスト (Manifest V3)
├── package.json             - パッケージ情報
├── .gitignore
├── .prettierrc
├── README.md
├── icons/
│   ├── icon.svg             - ブランドベクターアイコン (黄緑)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── src/
    ├── background/
    │   └── background.js    - Service Worker (初期設定初期化)
    ├── utils/
    │   ├── default_titles.js - デフォルト科目置換辞書 (ゼミ等)
    │   └── storage.js       - chrome.storage アクセス共通ラッパー
    ├── content/
    │   ├── content.css      - フォーム拡大・土曜日削除等のスタイル
    │   ├── content.js       - メイン制御・DOM監視・科目名編集・ハイライト
    │   ├── login.js         - 学認認証画面の自動ログインクリック処理
    │   └── toast.js         - 画面内トースト通知コンポーネント
    ├── popup/
    │   ├── popup.html       - 拡張機能ポップアップUI
    │   ├── popup.css        - ポップアップ用スタイル (スクエアデザイン)
    │   └── popup.js         - ポップアップのイベント連携
    └── options/
        ├── options.html     - 詳細設定ページ
        ├── options.css      - 詳細設定用スタイル
        └── options.js       - 詳細設定・インポート/エクスポート処理
```

## インストール手順

| ステップ | 操作内容 |
| :--- | :--- |
| 1 | Google Chromeで `chrome://extensions/` を開く |
| 2 | 右上の「デベロッパー モード」をONにする |
| 3 | 左上の「パッケージ化されていない拡張機能を読み込む」をクリックする |
| 4 | この `manaba-customizer` フォルダを選択して読み込む |

## 機能一覧

| 機能名 | 対象ページ | 概要 |
| :--- | :--- | :--- |
| **学認自動ログイン** | `https://gakunin-idp.c.chuo-u.ac.jp/*` | ログイン画面で「ログイン」ボタンを1秒後に自動クリック |
| **回答フォーム外観調整** | `https://room.chuo-u.ac.jp/ct/*` | 小テスト・レポート等の入力欄 (textarea) やフォームを見やすく拡大・整形 |
| **誤答選択問題の強調表示** | `https://room.chuo-u.ac.jp/ct/*` | 「誤っている」「間違い」などの誤答選択肢・否定設問を黄色で目立たせる |
| **任意文字列の置換** | `https://room.chuo-u.ac.jp/ct/*` | 本名や学籍番号などを指定した文字列に置換して匿名化 |
| **わかりやすいタブタイトル** | `https://room.chuo-u.ac.jp/ct/*` | コース名やシラバスに応じてブラウザタブのタイトルを分かりやすく変更 |
| **時間割の土曜日非表示** | `https://room.chuo-u.ac.jp/ct/*` | マイページの週間時間割から土曜日列を非表示にして平日を拡大 |
| **科目名カスタム表示・編集** | `https://room.chuo-u.ac.jp/ct/*` | 画面上で科目を直接クリックして名前を変更 (ゼミ名辞書内蔵) |
| **カスタムCSS注入** | `https://room.chuo-u.ac.jp/ct/*` | 独自のCSSを記述してページへ注入可能 |
| **設定バックアップ/復元** | オプション画面 | 設定内容をJSON形式でエクスポート / インポート可能 |

# X Clipper for Obsidian - 開発ドキュメント

## 概要

X(Twitter)のポストをObsidianに保存するChrome拡張機能。

## 技術スタック

- **Manifest V3** - Chrome拡張機能の最新仕様
- **TypeScript** - 型安全な開発
- **Vite + CRXJS** - 高速ビルド、HMR対応
- **Obsidian Local REST API** - Obsidianとの連携

## プロジェクト構成

```
x-clipper-for-obsidian/
├── public/
│   └── icons/              # 拡張機能アイコン
├── src/
│   ├── _locales/           # 多言語対応（ja/en）
│   ├── background/         # Service Worker
│   ├── lib/                # 共通ライブラリ
│   │   ├── obsidian-api.ts # Obsidian REST API クライアント
│   │   ├── storage.ts      # chrome.storage ラッパー
│   │   └── tweet-parser.ts # ツイート解析・Markdown変換
│   ├── popup/              # ポップアップUI
│   ├── types/              # TypeScript型定義
│   └── manifest.json       # 拡張機能マニフェスト
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 開発コマンド

```bash
# 開発サーバー起動（HMR対応）
npm run dev

# プロダクションビルド
npm run build

# テスト実行
npm test
```

## Chromeへのインストール方法

1. `npm run build` でビルド
2. Chrome で `chrome://extensions` を開く
3. 「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. `dist` フォルダを選択

## 必要な環境

### Obsidian側の設定

1. **Obsidian Local REST API** プラグインをインストール
2. プラグインの設定でHTTPサーバーを有効化（ポート: 27124）
3. APIキーを設定（任意）

### Chrome拡張の設定

1. ポップアップの設定ボタンからAPIキーを設定

## 実装フェーズ

### Phase 1: MVP ✅
- [x] プロジェクトセットアップ
- [x] Manifest V3設定
- [x] ポップアップUI
- [x] Obsidian API連携
- [x] ツイート解析（oEmbed API）

### Phase 2: 画像対応（未実装）
- [ ] 画像ダウンロード機能
- [ ] Obsidianへの画像保存
- [ ] Markdown内の画像リンク

### Phase 3: UX向上（未実装）
- [ ] オンボーディング画面
- [ ] 設定画面
- [ ] エラーハンドリング強化

### Phase 4: Chrome Web Store公開（未実装）
- [ ] プライバシーポリシー
- [ ] スクリーンショット
- [ ] ストア申請

## 保存されるMarkdown形式

```markdown
---
author: "@username"
author_name: "表示名"
saved_at: 2024-01-15T10:30:00
original_url: https://x.com/username/status/123456789
tweet_id: "123456789"
tags: [twitter, saved-tweet]
---

# @username のポスト

ツイート本文がここに入る

---
*保存日時: 2024/1/15 10:30:00*
```

## 参考リンク

- [Obsidian Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api)
- [CRXJS Vite Plugin](https://crxjs.dev/vite-plugin)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate)
- [Twitter oEmbed API](https://developer.twitter.com/en/docs/twitter-for-websites/oembed-api)

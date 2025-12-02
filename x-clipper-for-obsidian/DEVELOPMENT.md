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

### Phase 2: 画像対応 ✅
- [x] Content Scriptで画像URL抽出
- [x] 画像ダウンロード機能
- [x] Obsidianへの画像保存（attachmentsフォルダ）
- [x] Markdown内の画像リンク
- [x] プロフィールページURLをfrontmatterに追加

### Phase 3: UX向上
- [x] タグ入力機能（カンマ区切り、x-clipper自動追加）
- [x] オンボーディング画面
- [ ] 設定画面
- [ ] エラーハンドリング強化

### Phase 4: Chrome Web Store公開（未実装）

#### 必要な画像アセット
- [ ] 拡張機能アイコン: 128x128px（PNG、96x96の実サイズ + 16pxパディング）
- [ ] 小プロモーション画像: 440x280px（**必須**）
- [ ] マーキー画像: 1400x560px（オプション、トップページ掲載時に使用）
- [ ] スクリーンショット: 1280x800px（最低1枚、最大5枚）

#### 法的ドキュメント
- [ ] プライバシーポリシー（**必須** - 個人データを扱う場合）
- [ ] 利用規約（推奨）
  - 免責事項（Disclaimer of Warranties）
  - 責任制限（Limitation of Liability）
  - ユーザー行動規範
  - 知的財産権

#### ストア申請
- [ ] デベロッパーダッシュボードに登録
- [ ] 説明文（日本語/英語）
- [ ] カテゴリ選択
- [ ] 審査申請

---

## セキュリティに関する説明

### HTTP（暗号化なし）での通信について

本拡張機能は Obsidian Local REST API と `http://127.0.0.1` または `http://localhost` で通信します。

**これが安全な理由：**

[MDN Web Docs - Secure Contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) によると：

> "Locally-delivered resources such as those with `http://127.0.0.1`, `http://localhost`, and `http://*.localhost` URLs are not delivered using HTTPS, but they can be considered to have been delivered securely because **they are on the same device as the browser**."

つまり：
- ローカルホスト通信はブラウザと**同じデバイス上**で完結
- 外部ネットワークを経由しないため、**中間者攻撃（MITM）のリスクがない**
- ブラウザはこれらを「潜在的に信頼できるオリジン」として扱う

### API Keyの取り扱い

- API Keyは `chrome.storage.local` に保存され、拡張機能内でのみアクセス可能
- 外部サーバーには送信されない
- ローカル通信のため、ネットワーク上で傍受されるリスクはない

---

## 免責事項（ユーザー向けドキュメント用）

```
本拡張機能は「現状のまま」提供され、いかなる種類の保証も行いません。
本拡張機能の使用によって生じた損害について、開発者は一切の責任を負いません。

THE EXTENSION IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
THE DEVELOPER SHALL NOT BE LIABLE FOR ANY DAMAGES ARISING FROM THE USE OF THIS EXTENSION.
```

**注意**: Chrome Web Storeでは免責事項の記載は許可されており、一般的な慣行です。
参考: [TermsFeed - Legal Agreements for Chrome Extensions](https://www.termsfeed.com/blog/legal-agreements-chrome-extensions/)

## 保存されるMarkdown形式

```markdown
---
author: "@username"
author_name: "表示名"
author_url: "https://x.com/username"
saved_at: 2024-01-15T10:30:00
original_url: https://x.com/username/status/123456789
post_id: "123456789"
has_images: true
image_count: 2
has_quote: true
quoted_url: "https://x.com/quoted/status/987654321"
tags: [x-clipper, important, reference]
---

# @username のポスト

ツイート本文がここに入る

![[attachments/tweet-123456789-1.jpg]]
![[attachments/tweet-123456789-2.jpg]]

### 引用元

> 引用元のツイート内容
>
> — @quoted
> https://x.com/quoted/status/987654321

---
*保存日時: 2024/1/15 10:30:00*
```

## 参考リンク

- [Obsidian Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api)
- [CRXJS Vite Plugin](https://crxjs.dev/vite-plugin)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate)
- [Twitter oEmbed API](https://developer.twitter.com/en/docs/twitter-for-websites/oembed-api)

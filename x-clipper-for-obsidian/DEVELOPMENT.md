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
- [x] 設定ダイアログ
- [x] エラーハンドリング強化（エラーメッセージの詳細化）

### Phase 3.5: 今後検討する改善案

以下は優先度が低いが、将来的に実装を検討する機能：

#### エラーハンドリングの更なる強化
- [ ] ネットワークエラーの詳細な区別（タイムアウト、接続拒否、DNSエラーなど）
- [ ] oEmbed API失敗時のフォールバック処理
- [ ] 一時的なエラー時の自動リトライ機能
- [ ] エラー時のユーザーガイド（「何をすればいいか」を表示）

#### UX改善
- [ ] 保存成功時のトースト通知
- [ ] 保存履歴の表示
- [ ] お気に入りフォルダのクイックアクセス

### Phase 4: Chrome Web Store公開

#### 必要な画像アセット ✅
- [x] 拡張機能アイコン: 128x128px（`public/icons/icon-128.png`）
- [x] 小プロモーション画像: 440x280px（`public/icons/promo-small.png`）**必須**
- [x] マーキー画像: 1400x560px（`public/icons/promo-marquee.png`）
- [x] スクリーンショット: 1280x800px（`public/screenshots/screenshot-1.png`, `screenshot-2.png`）

#### 法的ドキュメント ✅
- [x] プライバシーポリシー（[docs/PRIVACY_POLICY.md](./docs/PRIVACY_POLICY.md)）
- [x] 利用規約（[docs/TERMS_OF_SERVICE.md](./docs/TERMS_OF_SERVICE.md)）
  - 免責事項（Disclaimer of Warranties）
  - 責任制限（Limitation of Liability）
  - 著作権に関する注意（私的使用の範囲）
  - 知的財産権

#### ストア申請ドキュメント ✅
- [x] 説明文（[docs/STORE_DESCRIPTION.md](./docs/STORE_DESCRIPTION.md)）
- [x] 申請手順ガイド（[docs/STORE_SUBMISSION_GUIDE.md](./docs/STORE_SUBMISSION_GUIDE.md)）

#### ストア申請作業（手動）
- [ ] デベロッパーダッシュボードに登録（$5）
- [ ] ZIP ファイルをアップロード
- [ ] プライバシーポリシー URL を設定
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

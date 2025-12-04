# X Clipper for Obsidian プライバシーポリシー / Privacy Policy

*最終更新日 / Last Updated: 2024-12-04*

---

## 日本語版

### はじめに

X Clipper for Obsidian（以下「本拡張機能」）は、ユーザーのプライバシーを最優先に設計されています。本ポリシーでは、本拡張機能がどのようにデータを扱うかを説明します。

### 収集しないデータ

本拡張機能は以下のデータを**一切収集しません**：

- 個人情報（氏名、メールアドレス等）
- 閲覧履歴
- 利用統計・テレメトリデータ
- 保存したポストの内容

**すべてのデータはあなたのデバイスにローカル保存され、外部サーバーには送信されません。**

### ローカルに保存されるデータ

以下のデータは `chrome.storage.local` に保存され、本拡張機能からのみアクセス可能です：

| データ | 目的 |
|--------|------|
| Obsidian API Key | Obsidian Local REST API への認証 |
| 保存先フォルダ設定 | ポストの保存先指定 |
| 添付ファイル保存先設定 | 画像の保存先指定 |
| タグ設定 | デフォルトタグの設定 |

### 通信先

本拡張機能は以下との通信のみを行います：

#### 1. ローカルホスト（127.0.0.1:27124）
- **目的**: Obsidian Local REST API との通信
- **送信データ**: 保存するポストの Markdown コンテンツ、画像データ
- **注記**: この通信はあなたのコンピュータ内で完結し、インターネットを経由しません

#### 2. X/Twitter oEmbed API（publish.twitter.com）
- **目的**: ポストの著者名・本文の取得
- **送信データ**: ポストの URL
- **受信データ**: ポストの HTML 形式テキスト

#### 3. X/Twitter 画像 CDN（pbs.twimg.com）
- **目的**: ポストに添付された画像のダウンロード
- **送信データ**: 画像 URL へのリクエスト
- **受信データ**: 画像バイナリデータ

### 第三者サービス

本拡張機能の利用には **Obsidian Local REST API** プラグインが必要です。このプラグインは Obsidian のコミュニティプラグインとして提供されています。プラグインのプライバシーポリシーについては、プラグインの開発者にお問い合わせください。

### データの保護

- API Key は `chrome.storage.local` に保存され、本拡張機能のスクリプトからのみアクセス可能です
- ローカルホストとの通信は暗号化されていませんが、デバイス内で完結するため中間者攻撃のリスクはありません

### お問い合わせ

プライバシーに関するご質問は、GitHub Issues でお問い合わせください：
- https://github.com/[username]/x-clipper-for-obsidian/issues

---

## English Version

### Introduction

X Clipper for Obsidian (hereinafter "the Extension") is designed with user privacy as a top priority. This policy explains how the Extension handles data.

### Data We Do NOT Collect

The Extension does **NOT** collect any of the following:

- Personal information (name, email, etc.)
- Browsing history
- Usage statistics or telemetry data
- Content of saved posts

**All data is stored locally on your device and is never transmitted to external servers.**

### Data Stored Locally

The following data is stored in `chrome.storage.local` and is accessible only by the Extension:

| Data | Purpose |
|------|---------|
| Obsidian API Key | Authentication with Obsidian Local REST API |
| Save folder setting | Specifying where posts are saved |
| Attachments folder setting | Specifying where images are saved |
| Tag settings | Default tag configuration |

### Network Communication

The Extension only communicates with the following:

#### 1. Localhost (127.0.0.1:27124)
- **Purpose**: Communication with Obsidian Local REST API
- **Data sent**: Markdown content of posts, image data
- **Note**: This communication is entirely within your computer and does not traverse the internet

#### 2. X/Twitter oEmbed API (publish.twitter.com)
- **Purpose**: Retrieving post author name and text content
- **Data sent**: Post URL
- **Data received**: Post content in HTML format

#### 3. X/Twitter Image CDN (pbs.twimg.com)
- **Purpose**: Downloading images attached to posts
- **Data sent**: Image URL request
- **Data received**: Image binary data

### Third-Party Services

The Extension requires the **Obsidian Local REST API** plugin to function. This plugin is available as an Obsidian community plugin. For questions about the plugin's privacy policy, please contact the plugin developer.

### Data Protection

- API Keys are stored in `chrome.storage.local` and are accessible only by the Extension's scripts
- Communication with localhost is not encrypted, but since it stays within your device, there is no risk of man-in-the-middle attacks

### Contact

For privacy-related questions, please contact us via GitHub Issues:
- https://github.com/[username]/x-clipper-for-obsidian/issues

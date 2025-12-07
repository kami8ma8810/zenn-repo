# Chrome Web Store 申請手順ガイド

Chrome Web Store に拡張機能を公開するためのステップバイステップガイドです。

---

## 事前準備

### 必要なもの

- [ ] Google アカウント
- [ ] クレジットカード（登録料 $5 の支払い）
- [ ] ビルド済みの拡張機能

### 必要なファイル（すべて用意済み）

| ファイル | パス | サイズ |
|---------|------|-------|
| アイコン | `public/icons/icon-128.png` | 128x128px |
| プロモーション画像（小） | `public/icons/promo-small.png` | 440x280px |
| マーキー画像 | `public/icons/promo-marquee.png` | 1400x560px |
| スクリーンショット 1 | `public/screenshots/screenshot-1.png` | 1280x800px |
| スクリーンショット 2 | `public/screenshots/screenshot-2.png` | 1280x800px |
| プライバシーポリシー | `docs/PRIVACY_POLICY.md` | - |
| 利用規約 | `docs/TERMS_OF_SERVICE.md` | - |
| 説明文 | `docs/STORE_DESCRIPTION.md` | - |

---

## Step 1: デベロッパーアカウント登録

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) にアクセス
2. Google アカウントでログイン
3. 「デベロッパーとして登録」をクリック
4. 登録料 **$5**（一回払い）を支払う
5. デベロッパー利用規約に同意

> **注意**: 登録料は一度支払えば永久に有効です。

---

## Step 2: 拡張機能のビルドとパッケージング

```bash
# プロジェクトディレクトリに移動
cd x-clipper-for-obsidian

# 依存関係をインストール（初回のみ）
npm install

# プロダクションビルド
npm run build
```

ビルドが成功すると `dist/` フォルダが生成されます。

### ZIP ファイルの作成

```bash
# dist フォルダを zip 圧縮
cd dist
zip -r ../x-clipper-for-obsidian.zip .
cd ..
```

または、Finder で `dist` フォルダを右クリック → 「"dist"を圧縮」

---

## Step 3: ダッシュボードへのアップロード

1. [Developer Dashboard](https://chrome.google.com/webstore/devconsole) を開く
2. 「新しいアイテム」ボタンをクリック
3. ZIP ファイルをドラッグ＆ドロップまたは選択してアップロード
4. アップロードが完了するまで待機
5. マニフェストが自動解析され、基本情報が表示される

---

## Step 4: ストア掲載情報の入力

### 4.1 基本情報

| 項目 | 入力値 |
|-----|-------|
| **言語** | 日本語（プライマリ）、英語 |
| **カテゴリ** | Productivity（生産性） |

### 4.2 説明文

`docs/STORE_DESCRIPTION.md` から該当言語の説明文をコピー＆ペースト

### 4.3 グラフィックアセット

以下のファイルをアップロード：

1. **アイコン**: `public/icons/icon-128.png`
2. **小プロモーション画像**: `public/icons/promo-small.png`（**必須**）
3. **マーキープロモーション画像**: `public/icons/promo-marquee.png`（オプション）
4. **スクリーンショット**:
   - `public/screenshots/screenshot-1.png`
   - `public/screenshots/screenshot-2.png`

---

## Step 5: プライバシー設定

### 5.1 プライバシーポリシー

プライバシーポリシーのURLを設定します。

**オプション A**: GitHub Pages でホスト
```
https://[username].github.io/x-clipper-for-obsidian/PRIVACY_POLICY.html
```

**オプション B**: GitHub リポジトリの raw URL
```
https://github.com/[username]/x-clipper-for-obsidian/blob/main/docs/PRIVACY_POLICY.md
```

### 5.2 データ使用の開示

以下の質問に回答：

| 質問 | 回答 |
|-----|------|
| ユーザーの個人情報を収集しますか？ | **いいえ** |
| 認証情報を収集しますか？ | **いいえ** |
| ユーザーのアクティビティを追跡しますか？ | **いいえ** |
| データを外部に送信しますか？ | **いいえ**（ローカル通信のみ） |

### 5.3 パーミッションの正当性説明

| パーミッション | 用途の説明 |
|--------------|-----------|
| `storage` | ユーザーの設定（API Key、保存先フォルダ、タグ設定）をローカルに保存するために使用 |
| `activeTab` | 現在表示中の X（Twitter）ポストから情報を取得するために使用 |
| `host_permissions` | Obsidian Local REST API（localhost）への接続、Twitter oEmbed API からのポスト情報取得、Twitter 画像 CDN からの画像ダウンロードに使用 |

---

## Step 6: 審査申請

1. すべての情報が正しく入力されていることを確認
2. 「審査のために送信」ボタンをクリック
3. 確認ダイアログで「送信」を選択

### 審査期間

- **通常**: 1〜3 営業日
- **繁忙期**: 最大 1 週間

審査状況はダッシュボードで確認できます。

---

## Step 7: 審査後の対応

### 承認された場合

- 自動的に Chrome Web Store に公開されます
- ダッシュボードに「公開済み」と表示されます
- 検索で見つかるようになるまで数時間かかる場合があります

### 却下された場合

1. ダッシュボードで却下理由を確認
2. 指摘された問題を修正
3. 新しい ZIP ファイルをアップロード
4. 再度審査を申請

**よくある却下理由**:
- 説明文と実際の機能が一致しない
- プライバシーポリシーが不十分
- パーミッションの正当性が説明されていない
- スクリーンショットが実際の UI と異なる

---

## 公開後のメンテナンス

### バージョンアップ

1. `manifest.json` の `version` を更新
2. `npm run build` で再ビルド
3. 新しい ZIP ファイルをダッシュボードからアップロード
4. 審査を申請（通常、更新は初回より早く承認される）

### 統計情報

ダッシュボードで以下の情報を確認できます：

- インストール数
- アクティブユーザー数
- 評価・レビュー
- エラーレポート

---

## 参考リンク

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies)
- [Chrome Web Store Best Practices](https://developer.chrome.com/docs/webstore/best-practices)
- [Publishing your extension](https://developer.chrome.com/docs/webstore/publish)

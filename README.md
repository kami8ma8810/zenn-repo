# DDD × Firebase × React SNS ハンズオン

ドメイン駆動設計（DDD）を学びながら、実際に動くSNSアプリケーションを作るハンズオン教材です。

## 📚 章構成とブランチ

各章ごとにブランチが用意されており、段階的に学習できます：

| 章 | ブランチ名 | 内容 |
|---|-----------|------|
| 0 | `chapter-0-setup` | 初期セットアップ |
| 1 | `chapter-1-domain-basics` | ドメインモデルの基礎 |
| 2 | `chapter-2-entities-vo` | エンティティと値オブジェクト |
| 3 | `chapter-3-aggregates` | 集約パターン |
| 4 | `chapter-4-repository` | リポジトリパターン |
| 5 | `chapter-5-application-service` | アプリケーションサービス |
| 6 | `chapter-6-strategic-design` | 戦略的設計（完成版） |

## 🚀 はじめ方

### 1. 環境準備

必要なもの：
- Node.js 18以上
- pnpm
- Firebaseアカウント
- Git

### 2. プロジェクトのクローン

```bash
git clone [repository-url]
cd ddd-firebase-sns
```

### 3. 依存関係のインストール

```bash
pnpm install
```

### 4. Firebase設定

1. [Firebase Console](https://console.firebase.google.com/)でプロジェクトを作成
2. 認証、Firestore、Storageを有効化
3. `.env`ファイルを作成（`.env.example`を参考）
4. Firebase設定値を記入

詳細は`articles/firebase-setup-guide.md`を参照してください。

### 5. 章の選択

学習したい章のブランチに切り替えます：

```bash
# 例：第1章から始める場合
git checkout chapter-1-domain-basics
```

## 📖 学習の進め方

1. **記事を読む**：`articles/`フォルダ内の該当章の記事を読む
2. **コードを確認**：現在のブランチのコードを確認
3. **演習に取り組む**：TODOコメントの箇所を実装
4. **次の章へ**：完成したら次の章のブランチへ

### 演習の例

各章にはTODOコメントが含まれています：

```typescript
// TODO: ここにPostエンティティを実装してください
// ヒント：
// - idは必須
// - textとimageUrlのどちらかは必須
// - 300文字制限
```

## 🛠️ 開発コマンド

```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# テスト実行
pnpm test

# Firebase Emulator起動
firebase emulators:start
```

## 🏗️ プロジェクト構造

```
.
├── packages/
│   ├── domain/          # ドメイン層
│   ├── application/     # アプリケーション層
│   ├── infrastructure/  # インフラ層
│   └── web/            # プレゼンテーション層（React）
├── articles/           # 各章の記事
├── firebase.json       # Firebase設定
└── README.md          # このファイル
```

## 📚 参考資料

- [ドメイン駆動設計をはじめよう](https://www.amazon.co.jp/dp/479813161X)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev)

## 🤔 困ったときは

- 各章の記事の最後にある「よくある質問」を確認
- GitHubのIssuesで質問
- 完成版（`main`ブランチ）のコードを参考に

Happy Learning! 🎉
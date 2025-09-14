# 🎓 DDD × Firebase SNS ハンズオン - 第0章：初期セットアップ

## 📚 この章で学ぶこと

- プロジェクトの構成を理解する
- Firebaseの基本設定を行う
- 開発環境を構築する

## 🎯 学習目標

1. **モノレポ構成の理解**
   - pnpm workspaceの仕組み
   - レイヤーごとのパッケージ分離

2. **Firebase環境の準備**
   - プロジェクトの作成
   - 認証・Firestore・Storageの有効化

3. **開発環境の立ち上げ**
   - エミュレーターの起動
   - フロントエンドの起動

## 📂 プロジェクト構造

```
zenn-repo/
├── packages/
│   ├── domain/        # ドメイン層（まだ空）
│   ├── application/   # アプリケーション層（まだ空）
│   ├── infrastructure/# インフラ層（まだ空）
│   └── web/          # プレゼンテーション層（基本構成のみ）
├── firebase.json      # Firebase設定
├── firestore.rules   # セキュリティルール
└── pnpm-workspace.yaml
```

## 🚀 セットアップ手順

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. 以下の機能を有効化：
   - Authentication（メール/パスワード認証）
   - Firestore Database
   - Storage

### 3. Firebase設定ファイルの作成

`packages/web/.env.local`を作成：

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 4. エミュレーターの起動

```bash
# 別ターミナルで実行
pnpm emulators
```

### 5. 開発サーバーの起動

```bash
pnpm dev
```

## ✅ 確認ポイント

- [ ] `http://localhost:5173`でアプリが表示される
- [ ] `http://localhost:4000`でEmulator UIが表示される
- [ ] コンソールにエラーが出ていない

## 📝 演習課題

### 課題1：プロジェクト構造の理解

各パッケージのroleを説明してください：
- `domain/`: ?
- `application/`: ?
- `infrastructure/`: ?
- `web/`: ?

### 課題2：レイヤードアーキテクチャ

なぜパッケージを分離するのか、その利点を3つ挙げてください。

## 🎯 次の章へ

セットアップが完了したら、第1章へ進みましょう！

```bash
git checkout chapter-1-domain-basics
```

第1章では、ドメイン駆動設計の基本概念を学びながら、最初のドメインモデルを実装します。

## 🆘 トラブルシューティング

### エミュレーターが起動しない

```bash
# Java 11以上が必要
java -version

# Firebase CLIの更新
npm install -g firebase-tools
```

### TypeScriptエラーが出る

```bash
# 型定義の再生成
pnpm typecheck
```

## 📚 参考資料

- [Firebase Documentation](https://firebase.google.com/docs)
- [pnpm Workspace](https://pnpm.io/workspaces)
- [Vite Guide](https://vitejs.dev/guide/)
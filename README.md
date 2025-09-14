# 🌟 SNS DDD × Firebase - 小さなSNSを作りながら学ぶDDD

DDDの設計原則とFirebaseを組み合わせた、実践的なハンズオンプロジェクトです。

## 📚 概要

このプロジェクトは、ドメイン駆動設計（DDD）の原則に従って設計された小規模なSNSアプリケーションです。バックエンドインフラはFirebase（Auth/Firestore/Storage/Hosting）で完結させ、フロントエンドはReact + Viteで構築しています。

## 🏗️ アーキテクチャ

```
sns-ddd-firebase/
├─ packages/
│  ├─ domain/                 # 純粋なTypeScript: Entity/ValueObject/Aggregate
│  ├─ application/            # UseCase (サービス) + ポート（Repository IF）
│  ├─ infrastructure/         # Firebase実装（Firestore/Storage/Auth）+ mappers
│  └─ web/                    # React(Vite) UI（presentation層）
├─ firebase.json              # Hosting / Emulators設定
├─ firestore.rules            # Firestoreセキュリティルール
└─ storage.rules              # Storageセキュリティルール
```

### レイヤー構成

- **ドメイン層（domain）**: ビジネスロジックと不変条件を管理。Firebaseに依存しない純粋なTypeScript
- **アプリケーション層（application）**: ユースケースとポート定義。複数のリポジトリを協調
- **インフラ層（infrastructure）**: Firebase SDKの実装。DTO ⇔ ドメインモデルの変換
- **プレゼンテーション層（web）**: React UIコンポーネント

## 🚀 機能

- ✅ Googleアカウントでのサインイン
- ✅ テキスト + 画像投稿
- ✅ タイムライン表示
- ✅ いいね機能
- ✅ フォロー/アンフォロー
- ✅ プロフィール管理

## 🛠️ セットアップ

### 必要環境

- Node.js 18以上
- pnpm 8以上
- Firebase CLIツール

### インストール

```bash
# 依存関係のインストール
pnpm install

# Firebase CLIのインストール（未インストールの場合）
npm install -g firebase-tools
```

### 環境変数の設定

`packages/web/.env`ファイルを作成し、Firebase設定を追加：

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_USE_EMULATOR=true
```

## 🏃 実行方法

### 開発環境

```bash
# Firebase Emulatorを起動
pnpm emulator

# 別ターミナルで開発サーバーを起動
pnpm dev
```

アプリケーションは http://localhost:3000 で起動します。
Firebase Emulator UIは http://localhost:4000 で確認できます。

### ビルド

```bash
# 全パッケージをビルド
pnpm build
```

### テスト

```bash
# 全パッケージのテストを実行
pnpm test
```

## 📝 DDD設計のポイント

### 集約の境界

- **User集約**: プロフィール編集の不変条件を管理
- **Post集約**: 投稿の作成/編集、いいね数の管理
- **FollowRelation集約**: フォロー関係の管理（重複防止、自己フォロー禁止）

### 不変条件の例

```typescript
// Post集約の不変条件
- 投稿には本文または画像のどちらかが必須
- 本文は300文字以内
- 編集は作成者のみ可能
- いいね数は0未満にならない
```

## 🔥 Firebase設計

### Firestoreデータモデル

```
/users/{userId}                    # ユーザー情報
/posts/{postId}                    # 投稿
/follows/{userId}/to/{followeeId}  # フォロー関係
/likes/{postId}/by/{userId}        # いいね
```

### セキュリティルール

- 認証ユーザーのみ投稿・いいね・フォローが可能
- 自分の投稿のみ編集・削除可能
- プロフィールは本人のみ編集可能

## 📚 学習リソース

この実装を通じて学べること：

1. **DDDの基本概念**
   - エンティティとバリューオブジェクト
   - 集約とリポジトリパターン
   - ユースケース層の設計

2. **クリーンアーキテクチャ**
   - レイヤー間の依存関係
   - ポートとアダプタパターン
   - テスタビリティの向上

3. **Firebase実践**
   - Firestoreのデータモデリング
   - セキュリティルールの設計
   - エミュレータを使った開発

## 🤝 コントリビューション

Issue や Pull Request は歓迎です！

## 📄 ライセンス

MIT

---

Built with 💜 using DDD principles and Firebase
# 🎓 DDD × Firebase SNS ハンズオン - 第6章：戦略的設計と完成版

## 🎉 おめでとうございます！

ここまで来たあなたは、DDDの基本的な戦術パターンをマスターしました。
最終章では、戦略的設計を学び、完成版のコードを確認します。

## 📚 この章で学ぶこと

- 境界づけられた文脈の発見
- コンテキストマッピング
- イベントストーミング
- 完成版の実装確認

## 🎯 学習目標

1. **戦略的設計の理解**
   - ビジネスドメインの分析
   - 文脈の境界決定
   - チーム構造との整合

2. **イベントストーミング**
   - ドメインイベントの発見
   - 集約の識別
   - プロセスの可視化

3. **完成版の動作確認**
   - 全機能の統合
   - デプロイメント
   - 運用考慮事項

## 📂 完成版のコード構造

```
packages/
├── domain/           # 完全なドメインモデル
│   ├── post/
│   ├── user/
│   ├── followRelation/
│   └── like/
├── application/      # すべてのユースケース
│   ├── usecases/
│   └── services/
├── infrastructure/   # Firebase統合
│   ├── firebase/
│   └── adapters/
└── web/             # React UI
    ├── components/
    ├── hooks/
    └── pages/
```

## 🎨 イベントストーミング演習

### ステップ1：ドメインイベントを洗い出す

付箋を使って、SNSで起きるイベントを書き出してください：

```
[ユーザーが登録された]
[投稿が作成された]
[いいねされた]
[フォローされた]
[コメントが追加された]
[投稿が削除された]
[ユーザーがブロックされた]
```

### ステップ2：時系列に並べる

```
登録 → プロフィール設定 → 投稿 → いいね/コメント → ...
```

### ステップ3：集約を見つける

イベントをグループ化して集約を発見：

- **User集約**: 登録、プロフィール更新
- **Post集約**: 投稿作成、編集、削除
- **FollowRelation集約**: フォロー、アンフォロー、ブロック
- **Like集約**: いいね、いいね解除

## 🗺️ コンテキストマップ

```
┌─────────────────┐     ┌─────────────────┐
│   Identity      │────▶│   Social        │
│   Context       │     │   Context       │
│  (User管理)     │     │ (フォロー関係)   │
└─────────────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   Content       │────▶│   Analytics     │
│   Context       │     │   Context       │
│  (投稿管理)     │     │  (分析・統計)    │
└─────────────────┘     └─────────────────┘
```

### 文脈間の関係

- **Shared Kernel**: 共通の値オブジェクト（UserId, PostId）
- **Upstream/Downstream**: Identity → Social（ユーザー情報の提供）
- **Anti-Corruption Layer**: 外部サービスとの境界

## 🚀 完成版の機能確認

### 実装済み機能

- ✅ ユーザー登録・ログイン
- ✅ 投稿の作成・編集・削除
- ✅ いいね機能
- ✅ フォロー/アンフォロー
- ✅ タイムライン表示
- ✅ 画像アップロード
- ✅ リアルタイム更新

### 動作確認手順

```bash
# 1. 環境変数の設定
cp .env.example .env.local
# Firebaseの設定値を記入

# 2. 依存関係のインストール
pnpm install

# 3. エミュレーター起動
pnpm emulators

# 4. 開発サーバー起動
pnpm dev

# 5. ブラウザで確認
open http://localhost:5173
```

## 🏗️ デプロイメント

### Firebase Hostingへのデプロイ

```bash
# ビルド
pnpm build

# デプロイ
firebase deploy

# 本番URLで確認
open https://your-app.web.app
```

### CI/CD設定（GitHub Actions）

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to Firebase
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build
      - uses: FirebaseExtended/action-hosting-deploy@v0
```

## 📊 今後の拡張アイデア

### 機能拡張

1. **通知機能**
   - Firebase Cloud Messaging
   - プッシュ通知

2. **検索機能**
   - Algolia連携
   - 全文検索

3. **DM機能**
   - 新しい境界づけられた文脈
   - リアルタイムメッセージング

### アーキテクチャ改善

1. **CQRS実装**
   - 読み書きの分離
   - イベントソーシング

2. **マイクロサービス化**
   - 文脈ごとにサービス分割
   - API Gateway

## 💡 学んだことの振り返り

### DDDの戦術的パターン

- ✅ エンティティと値オブジェクト
- ✅ 集約とトランザクション境界
- ✅ リポジトリによる永続化の抽象化
- ✅ アプリケーションサービス
- ✅ ドメインサービス

### DDDの戦略的設計

- ✅ ユビキタス言語
- ✅ 境界づけられた文脈
- ✅ コンテキストマッピング
- ✅ イベントストーミング

## 🎯 完了チェックリスト

- [ ] すべての機能が動作する
- [ ] テストがすべて通る
- [ ] Firebaseにデプロイできる
- [ ] ドメインモデルが理解できる
- [ ] 新機能を追加できる自信がある

## 📚 さらなる学習のために

### 推薦図書

- 『ドメイン駆動設計』Eric Evans
- 『実践ドメイン駆動設計』Vaughn Vernon
- 『ドメイン駆動設計 モデリング/実装ガイド』松岡幸一郎

### オンラインリソース

- [DDD Community](https://www.dddcommunity.org/)
- [Domain-Driven Design Europe](https://dddeurope.com/)
- [Event Storming](https://www.eventstorming.com/)

## 🙏 おわりに

DDDの学習お疲れさまでした！

このハンズオンで学んだパターンは、実際のプロジェクトで必ず役立ちます。
完成版のコードを参考に、ぜひ自分のプロジェクトでDDDを実践してください。

**Happy Domain-Driven Designing! 🚀**

---

## 📧 フィードバック

質問や改善提案があれば、GitHubのIssuesまでお願いします。

[GitHub Repository](https://github.com/your-username/ddd-firebase-sns)
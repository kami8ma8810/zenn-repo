---
title: "小さなSNSを作りながら学ぶDDD — デプロイ & 小さな拡張【第6回】"
emoji: "🚀"
type: "tech"
topics: ["firebase", "ddd", "cloudfunctions", "設計", "デプロイ"]
published: false
---

# 第6回：デプロイ & 小さな拡張

最終回です！作ったSNSをデプロイし、実践的な拡張を考えます。

## 🚀 Hosting一発デプロイ

### 1. ビルド設定

```json
// packages/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@domain': '../domain/src',
      '@application': '../application/src',
      '@infrastructure': '../infrastructure/src',
    },
  },
});
```

### 2. Firebase Hosting設定

```json
// firebase.json
{
  "hosting": {
    "public": "packages/web/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

### 3. デプロイコマンド

```bash
# ビルド
pnpm build

# ルール・インデックスのデプロイ
firebase deploy --only firestore:rules,firestore:indexes,storage

# Hostingへデプロイ
firebase deploy --only hosting

# 全部一気に
firebase deploy
```

### 4. 環境変数の管理

```typescript
// packages/web/src/config/firebase.ts
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 本番環境の判定
export const isProduction = import.meta.env.PROD;
export const isDevelopment = import.meta.env.DEV;
```

```bash
# .env.production
VITE_FIREBASE_API_KEY=your-production-key
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
# ...

# .env.development
VITE_FIREBASE_API_KEY=your-dev-key
VITE_USE_EMULATOR=true
# ...
```

## 🔄 いいね数の整合性（カウント再計算 / Cloud Functions案）

### 問題：カウンターの不整合

```typescript
// 現在の実装（楽観的更新）
class ToggleLike {
  async exec() {
    // 1. いいねを追加
    await this.likes.save(like);
    
    // 2. カウンター更新（失敗する可能性）
    post.applyLike(1);
    await this.posts.save(post);  // ここでエラーになるとカウンターがズレる
  }
}
```

### 解決策1: Cloud Functionsで整合性を保つ

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// いいね追加時のトリガー
export const onLikeCreated = functions.firestore
  .document('likes/{postId}/by/{userId}')
  .onCreate(async (snap, context) => {
    const { postId } = context.params;
    
    // カウンターをインクリメント
    await admin.firestore()
      .doc(`posts/${postId}`)
      .update({
        likeCount: admin.firestore.FieldValue.increment(1)
      });
  });

// いいね削除時のトリガー
export const onLikeDeleted = functions.firestore
  .document('likes/{postId}/by/{userId}')
  .onDelete(async (snap, context) => {
    const { postId } = context.params;
    
    // カウンターをデクリメント
    await admin.firestore()
      .doc(`posts/${postId}`)
      .update({
        likeCount: admin.firestore.FieldValue.increment(-1)
      });
  });
```

### 解決策2: 定期的な再計算バッチ

```typescript
// functions/src/recalculate.ts
export const recalculateLikeCounts = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const posts = await admin.firestore()
      .collection('posts')
      .get();
    
    for (const postDoc of posts.docs) {
      // 実際のいいね数を数える
      const likes = await admin.firestore()
        .collection(`likes/${postDoc.id}/by`)
        .count()
        .get();
      
      const actualCount = likes.data().count;
      const currentCount = postDoc.data().likeCount;
      
      // ズレがあれば修正
      if (actualCount !== currentCount) {
        await postDoc.ref.update({
          likeCount: actualCount
        });
        
        console.log(`Fixed like count for ${postDoc.id}: ${currentCount} -> ${actualCount}`);
      }
    }
  });
```

## 📊 イベント駆動アーキテクチャへの道筋

### ドメインイベントの実装

```typescript
// packages/domain/src/events/DomainEvent.ts
export abstract class DomainEvent {
  readonly occurredAt: Date = new Date();
  abstract readonly eventName: string;
}

// packages/domain/src/post/events/PostCreated.ts
export class PostCreated extends DomainEvent {
  readonly eventName = 'PostCreated';
  
  constructor(
    readonly postId: PostId,
    readonly authorId: UserId,
    readonly text: string,
    readonly imageUrl: string | null
  ) {
    super();
  }
}
```

### イベントの発行

```typescript
// packages/domain/src/post/Post.ts
export class Post {
  private events: DomainEvent[] = [];
  
  static create(args: CreateArgs) {
    const post = new Post(...);
    
    // イベントを記録
    post.events.push(new PostCreated(
      post.id,
      post.authorId,
      post.text,
      post.imageUrl
    ));
    
    return post;
  }
  
  // イベントを取り出す
  pullEvents(): DomainEvent[] {
    const events = [...this.events];
    this.events = [];
    return events;
  }
}
```

### イベントハンドラー

```typescript
// packages/application/src/eventHandlers/PostEventHandler.ts
export class PostEventHandler {
  async handle(event: DomainEvent) {
    switch (event.eventName) {
      case 'PostCreated':
        await this.handlePostCreated(event as PostCreated);
        break;
      case 'PostLiked':
        await this.handlePostLiked(event as PostLiked);
        break;
    }
  }
  
  private async handlePostCreated(event: PostCreated) {
    // 通知送信
    await this.notificationService.notifyFollowers(
      event.authorId,
      `新しい投稿: ${event.text.slice(0, 50)}...`
    );
    
    // タイムライン更新（Materialized View）
    await this.timelineService.addToFollowersTimeline(
      event.authorId,
      event.postId
    );
  }
}
```

## 🔮 データメッシュへの進化

### Read Model の分離

```typescript
// 書き込み用（Command）
interface PostWriteModel {
  id: PostId;
  authorId: UserId;
  text: string;
  imageUrl: string | null;
}

// 読み込み用（Query）
interface PostReadModel {
  id: string;
  authorName: string;      // Joinされた情報
  authorPhotoUrl: string;
  text: string;
  imageUrl: string | null;
  likeCount: number;
  isLikedByMe: boolean;   // ユーザー固有の情報
  createdAt: Date;
}
```

### CQRS実装例

```typescript
// Command側
class CreatePostCommand {
  async execute(input: CreatePostInput): Promise<void> {
    const post = Post.create(...);
    await this.writeRepo.save(post);
    
    // イベント発行
    await this.eventBus.publish(post.pullEvents());
  }
}

// Query側（非正規化されたデータ）
class GetTimelineQuery {
  async execute(userId: string): Promise<PostReadModel[]> {
    // 事前に構築されたタイムラインビューから取得
    return await this.readRepo.getTimeline(userId);
  }
}
```

## 🎓 学んだDDD原則の振り返り

### 1. 境界づけられた文脈

```
Identity ← → SocialGraph ← → Content
   ↓            ↓               ↓
  User       Follow           Post
```

各文脈が独立して進化できる設計。

### 2. 集約とトランザクション境界

```typescript
// 集約内で不変条件を守る
class Post {
  edit(by: UserId, ...) {
    if (by !== this.authorId) throw new Error("権限なし");
    // ...
  }
}
```

### 3. レイヤードアーキテクチャ

```
UI → Application → Domain ← Infrastructure
```

ドメインロジックがインフラに依存しない。

## 🏁 完成！そして次のステップ

### できたこと

- ✅ DDDの基本パターンを実装
- ✅ Firebaseでインフラを簡略化
- ✅ テスタブルな設計
- ✅ 実際に動くSNS

### 次のステップ

1. **スケーラビリティ**
   - Materialized Viewでタイムライン最適化
   - Cloud Functionsで非同期処理

2. **機能拡張**
   - リアルタイム通知（FCM）
   - DM機能（新しい境界づけられた文脈）
   - 検索機能（Algolia連携）

3. **運用**
   - モニタリング（Firebase Performance）
   - A/Bテスト（Firebase Remote Config）
   - 分析（Firebase Analytics）

## 📚 参考資料

- [Domain-Driven Design](https://www.amazon.co.jp/dp/4798121967)
- [実践ドメイン駆動設計](https://www.amazon.co.jp/dp/479813161X)
- [Firebase Documentation](https://firebase.google.com/docs)

## 📝 学びの要点まとめ（3行）

1. **小さく始めて**段階的に拡張
2. **イベント駆動**で疎結合を保つ
3. **進化する設計**を前提に作る

## 🙏 おわりに

6回にわたる連載、お疲れさまでした！

DDDは「銀の弾丸」ではありませんが、複雑なビジネスロジックを整理する強力な武器です。

今回作ったSNSをベースに、ぜひ自分なりの拡張を試してみてください。

**Happy Coding! 🎉**

---

質問やフィードバックは、コメント欄またはTwitter（@your_handle）まで！

GitHubリポジトリ: [https://github.com/your-name/sns-ddd-firebase](https://github.com/)
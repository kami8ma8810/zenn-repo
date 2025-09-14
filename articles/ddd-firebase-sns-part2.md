---
title: "小さなSNSを作りながら学ぶDDD — ドメインモデルを書く（純TS）【第2回】"
emoji: "💎"
type: "tech"
topics: ["ddd", "typescript", "テスト", "設計", "firebase"]
published: false
---

# 第2回：ドメインモデルを書く（純TS）

前回はDDDの概要とFirebaseを使う理由を説明しました。今回は**ドメイン層の実装**に入ります。

## 📦 パッケージ構成

```bash
packages/domain/
├─ src/
│  ├─ shared/
│  │  └─ ids.ts          # ValueObject（ID型）
│  ├─ post/
│  │  ├─ Post.ts         # Post集約
│  │  └─ Like.ts         # Likeエンティティ
│  ├─ user/
│  │  └─ User.ts         # User集約
│  └─ social-graph/
│     └─ FollowRelation.ts # フォロー関係
└─ package.json
```

## 💎 ValueObject / Entity / Aggregate の実装

### ValueObject（値オブジェクト）

IDを**ブランド型**で型安全に：

```typescript
// packages/domain/src/shared/ids.ts
export type UserId = string & { readonly brand: unique symbol };
export type PostId = string & { readonly brand: unique symbol };

export const UserId = (v: string) => v as UserId;
export const PostId = (v: string) => v as PostId;
```

**なぜブランド型？**
```typescript
// これはコンパイルエラーになる！
const userId: UserId = "user-123";     // ❌ 型エラー
const postId: PostId = UserId("123");  // ❌ 型エラー

// 正しい使い方
const userId = UserId("user-123");     // ✅
const postId = PostId("post-456");     // ✅
```

### Entity（エンティティ）

**Post集約**の実装：

```typescript
// packages/domain/src/post/Post.ts
import { PostId, UserId } from "../shared/ids";

export class Post {
  private constructor(
    readonly id: PostId,
    readonly authorId: UserId,
    private _text: string,
    private _imageUrl: string | null,
    readonly createdAt: Date,
    private _likeCount: number
  ) {}

  static create(args: {
    id: PostId; 
    authorId: UserId; 
    text: string; 
    imageUrl?: string | null; 
    now: Date;
  }) {
    const text = (args.text ?? "").trim();
    
    // 不変条件1: 空投稿は禁止
    if (text.length === 0 && !args.imageUrl) {
      throw new Error("空投稿は禁止");
    }
    
    // 不変条件2: 文字数制限
    if (text.length > 300) {
      throw new Error("本文は300文字以内");
    }
    
    return new Post(
      args.id, 
      args.authorId, 
      text, 
      args.imageUrl ?? null, 
      args.now, 
      0
    );
  }

  // Getters
  get text() { return this._text; }
  get imageUrl() { return this._imageUrl; }
  get likeCount() { return this._likeCount; }

  // ビジネスロジック: 編集
  edit(by: UserId, next: { text?: string; imageUrl?: string | null }) {
    // 権限チェック
    if (by !== this.authorId) {
      throw new Error("編集権限なし");
    }
    
    const t = (next.text ?? this._text).trim();
    
    // 不変条件を再チェック
    if (t.length === 0 && !next.imageUrl) {
      throw new Error("空投稿は禁止");
    }
    if (t.length > 300) {
      throw new Error("本文は300文字以内");
    }
    
    this._text = t;
    this._imageUrl = next.imageUrl ?? this._imageUrl;
  }

  // ビジネスロジック: いいね
  applyLike(delta: 1 | -1) {
    this._likeCount = Math.max(0, this._likeCount + delta);
  }
}
```

## 🛡️ 不変条件・ガードの置き場

### なぜコンストラクタをprivateに？

```typescript
export class Post {
  // privateコンストラクタ
  private constructor(...) {}

  // ファクトリメソッド経由でのみ生成可能
  static create(args: CreateArgs) {
    // ここで不変条件をチェック
    // ...
    return new Post(...);
  }

  // リポジトリからの復元用
  static reconstruct(
    id: PostId,
    authorId: UserId,
    text: string,
    // ...
  ) {
    // DBから取得したデータは信頼して、チェックをスキップ
    return new Post(id, authorId, text, ...);
  }
}
```

**メリット**：
1. **生成時に必ず不変条件をチェック**
2. **用途別のファクトリメソッド**を提供可能
3. **DBからの復元**と**新規作成**を区別

## 🧪 単体テスト（Vitest）でドメインを守る

```typescript
// packages/domain/src/post/Post.test.ts
import { describe, it, expect } from 'vitest';
import { Post } from './Post';
import { PostId, UserId } from '../shared/ids';

describe('Post', () => {
  describe('create', () => {
    it('正常に投稿を作成できる', () => {
      const post = Post.create({
        id: PostId('post-1'),
        authorId: UserId('user-1'),
        text: 'テスト投稿',
        imageUrl: null,
        now: new Date('2024-01-01'),
      });

      expect(post.id).toBe('post-1');
      expect(post.text).toBe('テスト投稿');
      expect(post.likeCount).toBe(0);
    });

    it('空投稿は禁止', () => {
      expect(() => {
        Post.create({
          id: PostId('post-1'),
          authorId: UserId('user-1'),
          text: '',
          imageUrl: null,
          now: new Date(),
        });
      }).toThrow('空投稿は禁止');
    });

    it('300文字を超える投稿は禁止', () => {
      const longText = 'あ'.repeat(301);
      
      expect(() => {
        Post.create({
          id: PostId('post-1'),
          authorId: UserId('user-1'),
          text: longText,
          imageUrl: null,
          now: new Date(),
        });
      }).toThrow('本文は300文字以内');
    });
  });

  describe('edit', () => {
    it('作成者は編集できる', () => {
      const post = Post.create({
        id: PostId('post-1'),
        authorId: UserId('user-1'),
        text: '元のテキスト',
        now: new Date(),
      });

      post.edit(UserId('user-1'), { text: '編集後' });
      
      expect(post.text).toBe('編集後');
    });

    it('作成者以外は編集できない', () => {
      const post = Post.create({
        id: PostId('post-1'),
        authorId: UserId('user-1'),
        text: 'テスト',
        now: new Date(),
      });

      expect(() => {
        post.edit(UserId('user-2'), { text: '編集' });
      }).toThrow('編集権限なし');
    });
  });
});
```

## 🎯 他の集約の実装

### User集約

```typescript
// packages/domain/src/user/User.ts
export class User {
  private constructor(
    readonly id: UserId,
    private _displayName: string,
    private _photoURL: string | null,
    readonly email: string,
    private _bio: string,
    readonly createdAt: Date
  ) {}

  static create(args: UserCreateArgs) {
    // 不変条件: 表示名は必須
    if (!args.displayName.trim()) {
      throw new Error("表示名は必須です");
    }
    
    // 不変条件: 表示名の長さ
    if (args.displayName.length > 50) {
      throw new Error("表示名は50文字以内");
    }
    
    return new User(...);
  }

  editProfile(args: { displayName?: string; bio?: string }) {
    // プロフィール編集のビジネスロジック
  }
}
```

### FollowRelation集約

```typescript
// packages/domain/src/social-graph/FollowRelation.ts
export class FollowRelation {
  private constructor(
    readonly followerId: UserId,
    readonly followeeId: UserId,
    readonly createdAt: Date
  ) {}

  static create(followerId: UserId, followeeId: UserId, now: Date) {
    // 不変条件: 自己フォロー禁止
    if (followerId === followeeId) {
      throw new Error("自分自身をフォローすることはできません");
    }
    
    return new FollowRelation(followerId, followeeId, now);
  }
}
```

## 🔧 テスト実行

```bash
# domain層のテスト実行
cd packages/domain
pnpm test

# カバレッジ付き
pnpm test --coverage
```

## 📝 学びの要点まとめ（3行）

1. **ValueObject**でプリミティブ型の混同を防ぐ
2. **不変条件**はファクトリメソッドで守る
3. **テスト**でドメインロジックの正しさを保証

## 🎯 次回予告

第3回では、**アプリケーションサービス（UseCase）とポート**：
- CreatePost / FollowUser / ToggleLike
- ポート設計（Repository / Storage）
- 「トランザクション境界」の現実

ドメインモデルを活用する層を実装します！
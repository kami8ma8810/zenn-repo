---
title: "小さなSNSを作りながら学ぶDDD — アプリケーションサービス：ユースケースの司令塔【第5回】"
emoji: "🎮"
type: "tech"
topics: ["ddd", "ドメイン駆動設計", "設計", "アーキテクチャ", "ユースケース"]
published: false
---

# 第5回：アプリケーションサービスとドメインサービス

## 🤔 ビジネスロジックはどこに書く？

### よくある混乱

```typescript
// ❌ すべてをControllerに書く（Fat Controller）
class PostController {
  async create(req: Request) {
    // バリデーション
    if (!req.body.text) throw new Error();
    
    // ビジネスルール
    if (req.body.text.length > 300) throw new Error();
    
    // 権限チェック
    const user = await findUser(req.userId);
    if (!user.canPost) throw new Error();
    
    // DB操作
    const post = await db.posts.create({...});
    
    // 通知
    await notifyFollowers(user.id);
    
    return post;
  }
}
```

問題：
- **責任が不明確**（UIとビジネスロジックが混在）
- **テストが困難**（HTTPリクエストが必要）
- **再利用不可**（別のUIから使えない）

## 🎯 アプリケーションサービスの役割

### オーケストレーター（指揮者）として

> アプリケーションサービスは、ドメインオブジェクトを組み合わせてユースケースを実現する

```typescript
// アプリケーションサービス：ユースケースの実装
export class CreatePostUseCase {
  constructor(
    private postRepository: PostRepository,
    private userRepository: UserRepository,
    private notificationService: NotificationService
  ) {}
  
  async execute(input: CreatePostInput): Promise<CreatePostOutput> {
    // 1. 準備：必要なドメインオブジェクトを取得
    const author = await this.userRepository.findById(
      new UserId(input.authorId)
    );
    
    if (!author) {
      throw new UserNotFoundError();
    }
    
    // 2. ドメインロジックの実行（ドメインオブジェクトに委譲）
    const post = author.createPost({
      text: input.text,
      imageUrl: input.imageUrl
    });
    
    // 3. 永続化
    await this.postRepository.save(post);
    
    // 4. 副作用の処理
    await this.notificationService.notifyNewPost(post);
    
    // 5. 結果の返却
    return {
      postId: post.id.value,
      createdAt: post.createdAt
    };
  }
}
```

### アプリケーションサービスの責務

1. **トランザクション管理**
2. **ドメインオブジェクトの取得と永続化**
3. **ユースケースの流れの制御**
4. **外部サービスとの連携**
5. **DTO（Data Transfer Object）への変換**

## 🔮 ドメインサービスが必要な場面

### 複数の集約にまたがるビジネスロジック

```typescript
// ドメインサービス：複数の集約を扱うビジネスロジック
export class FollowDomainService {
  // フォローの可否を判定（ビジネスルール）
  canFollow(
    follower: User,
    followee: User
  ): FollowPossibility {
    // 自己フォローの禁止
    if (follower.id.equals(followee.id)) {
      return FollowPossibility.cannotFollowSelf();
    }
    
    // ブロックされている場合
    if (followee.hasBlocked(follower.id)) {
      return FollowPossibility.blocked();
    }
    
    // プライベートアカウントの場合
    if (followee.isPrivate()) {
      return FollowPossibility.requiresApproval();
    }
    
    return FollowPossibility.allowed();
  }
  
  // 相互フォロー判定
  isMutualFollow(
    relation1: FollowRelation,
    relation2: FollowRelation
  ): boolean {
    return relation1.isFollowing(relation2.followerId) &&
           relation2.isFollowing(relation1.followerId);
  }
}
```

### ドメインサービスの特徴

- **状態を持たない**（ステートレス）
- **ビジネスロジックのみ**（技術的関心事なし）
- **複数の集約を扱う**（単一集約なら不要）

## 🎭 責任の分離：誰が何をするか

### レイヤーごとの責任

```typescript
// 1️⃣ プレゼンテーション層：UIの関心事
class PostController {
  async create(req: Request, res: Response) {
    // リクエストの変換
    const input: CreatePostInput = {
      authorId: req.user.id,
      text: req.body.text,
      imageUrl: req.body.imageUrl
    };
    
    // ユースケースの実行
    const result = await this.createPostUseCase.execute(input);
    
    // レスポンスの生成
    res.json({
      id: result.postId,
      createdAt: result.createdAt
    });
  }
}

// 2️⃣ アプリケーション層：ユースケースの調整
class CreatePostUseCase {
  async execute(input: CreatePostInput) {
    // ドメインオブジェクトの組み立て
    const author = await this.userRepo.findById(input.authorId);
    const post = Post.create({...});
    
    // ドメインサービスの利用
    if (this.spamDetector.isSpam(post)) {
      throw new SpamDetectedError();
    }
    
    // 永続化と通知
    await this.postRepo.save(post);
    await this.notifier.notify(post);
  }
}

// 3️⃣ ドメイン層：ビジネスルール
class Post {
  static create(args: CreateArgs): Post {
    // ビジネスルールの実装
    if (!args.text && !args.imageUrl) {
      throw new EmptyPostError();
    }
    // ...
  }
}

// 4️⃣ インフラ層：技術的実装
class FirestorePostRepository {
  async save(post: Post) {
    // Firestoreへの保存
    await this.firestore.collection('posts').doc(post.id).set({...});
  }
}
```

## 💡 実践的なパターン

### パターン1：Result型でエラーハンドリング

```typescript
// 成功と失敗を型で表現
export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

export class FollowUserUseCase {
  async execute(
    input: FollowUserInput
  ): Promise<Result<FollowUserOutput, FollowError>> {
    const follower = await this.userRepo.findById(input.followerId);
    const followee = await this.userRepo.findById(input.followeeId);
    
    if (!follower || !followee) {
      return {
        success: false,
        error: new UserNotFoundError()
      };
    }
    
    // ドメインサービスで判定
    const possibility = this.followService.canFollow(follower, followee);
    
    if (!possibility.isAllowed) {
      return {
        success: false,
        error: possibility.reason
      };
    }
    
    const relation = FollowRelation.create(follower.id, followee.id);
    await this.followRepo.save(relation);
    
    return {
      success: true,
      value: {
        relationId: relation.id.value,
        followedAt: relation.followedAt
      }
    };
  }
}
```

### パターン2：ユースケース間の連携

```typescript
export class PublishPostUseCase {
  constructor(
    private createPost: CreatePostUseCase,
    private notifyFollowers: NotifyFollowersUseCase,
    private updateTimeline: UpdateTimelineUseCase
  ) {}
  
  async execute(input: PublishPostInput): Promise<void> {
    // 1. 投稿を作成
    const postResult = await this.createPost.execute({
      authorId: input.authorId,
      text: input.text,
      imageUrl: input.imageUrl
    });
    
    if (!postResult.success) {
      throw postResult.error;
    }
    
    // 2. フォロワーに通知（非同期でも可）
    await this.notifyFollowers.execute({
      authorId: input.authorId,
      postId: postResult.value.postId,
      message: `新しい投稿: ${input.text.slice(0, 50)}...`
    });
    
    // 3. タイムラインを更新
    await this.updateTimeline.execute({
      postId: postResult.value.postId,
      authorId: input.authorId
    });
  }
}
```

### パターン3：バリデーションの階層

```typescript
export class CreatePostUseCase {
  async execute(input: CreatePostInput): Promise<CreatePostOutput> {
    // 1️⃣ 入力バリデーション（形式的な検証）
    this.validateInput(input);
    
    // 2️⃣ 権限チェック（認可）
    const author = await this.userRepo.findById(input.authorId);
    if (!author.canPost()) {
      throw new InsufficientPermissionError();
    }
    
    // 3️⃣ ビジネスルールの検証（ドメイン層）
    const post = Post.create({
      authorId: author.id,
      text: input.text,
      imageUrl: input.imageUrl
    });  // ここでビジネスルール違反があれば例外
    
    // 4️⃣ 外部制約の検証
    if (await this.isDuplicate(post)) {
      throw new DuplicatePostError();
    }
    
    await this.postRepo.save(post);
    
    return { postId: post.id.value };
  }
  
  private validateInput(input: CreatePostInput): void {
    // 形式的なバリデーション
    if (!input.authorId) {
      throw new ValidationError('authorId is required');
    }
    // ...
  }
  
  private async isDuplicate(post: Post): Promise<boolean> {
    // 重複投稿のチェック（外部制約）
    const recent = await this.postRepo.findRecentByAuthor(
      post.authorId,
      5  // 直近5件
    );
    
    return recent.some(p => 
      p.content.equals(post.content) &&
      p.createdAt.getTime() > Date.now() - 60000  // 1分以内
    );
  }
}
```

## 🔄 イベント駆動との統合

### ドメインイベントの処理

```typescript
export class CreatePostUseCase {
  async execute(input: CreatePostInput): Promise<CreatePostOutput> {
    const post = Post.create({...});
    
    // ドメインイベントが発生
    const events = post.pullDomainEvents();
    
    await this.postRepo.save(post);
    
    // イベントを処理
    for (const event of events) {
      await this.eventBus.publish(event);
    }
    
    return { postId: post.id.value };
  }
}

// イベントハンドラー（別のアプリケーションサービス）
export class PostCreatedHandler {
  async handle(event: PostCreatedEvent): Promise<void> {
    // 非同期で処理
    await Promise.all([
      this.updateUserStats(event.authorId),
      this.notifyFollowers(event.authorId, event.postId),
      this.indexForSearch(event.postId),
      this.checkForTrends(event.hashtags)
    ]);
  }
}
```

## 🏗️ テスト戦略

### アプリケーションサービスのテスト

```typescript
describe('CreatePostUseCase', () => {
  let useCase: CreatePostUseCase;
  let postRepo: MockPostRepository;
  let userRepo: MockUserRepository;
  let notifier: MockNotificationService;
  
  beforeEach(() => {
    postRepo = new MockPostRepository();
    userRepo = new MockUserRepository();
    notifier = new MockNotificationService();
    
    useCase = new CreatePostUseCase(
      postRepo,
      userRepo,
      notifier
    );
  });
  
  test('正常に投稿を作成できる', async () => {
    // Given: ユーザーが存在
    userRepo.setupUser({
      id: 'user1',
      canPost: true
    });
    
    // When: 投稿を作成
    const result = await useCase.execute({
      authorId: 'user1',
      text: 'Hello, World!'
    });
    
    // Then: 投稿が保存され、通知が送信される
    expect(result.success).toBe(true);
    expect(postRepo.savedPosts).toHaveLength(1);
    expect(notifier.sentNotifications).toHaveLength(1);
  });
  
  test('投稿権限がない場合はエラー', async () => {
    // Given: 投稿権限のないユーザー
    userRepo.setupUser({
      id: 'user1',
      canPost: false
    });
    
    // When & Then: エラーが発生
    await expect(
      useCase.execute({
        authorId: 'user1',
        text: 'Hello'
      })
    ).rejects.toThrow(InsufficientPermissionError);
  });
});
```

## 📝 まとめ：責任の明確化

**アプリケーションサービス**：
- ユースケースの実装
- トランザクション管理
- ドメインオブジェクトの調整
- 外部サービスとの連携

**ドメインサービス**：
- 複数集約にまたがるビジネスロジック
- 状態を持たない
- 純粋なビジネスルール

**設計の効果**：
- 責任が明確
- テストが容易
- ビジネスロジックの再利用が可能

## 🎯 次回予告

最終回（第6回）では、**戦略的設計**を学びます：
- 境界づけられた文脈の見つけ方
- コンテキストマップの描き方
- チーム構造との整合

大規模システムでDDDを適用する方法に迫ります！

---

**実践課題**：あなたのシステムで「Fat Controller」になっている箇所を見つけて、アプリケーションサービスに分離できないか考えてみてください。
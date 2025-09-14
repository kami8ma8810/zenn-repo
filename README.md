# 🎓 DDD × Firebase SNS ハンズオン - 第5章：アプリケーションサービス

## 📚 この章で学ぶこと

- アプリケーションサービスの役割
- ドメインサービスとの違い
- ユースケースの実装

## 🎯 学習目標

1. **アプリケーションサービスの理解**
   - ユースケースの調整役
   - トランザクション管理
   - DTOへの変換

2. **ドメインサービスの活用**
   - 複数集約にまたがるロジック
   - ステートレスな設計
   - ビジネスルールの実装

3. **責任の分離**
   - 各レイヤーの役割
   - 依存関係の方向
   - テストの容易性

## 📂 この章のコード構造

```
packages/
├── application/src/
│   ├── usecases/
│   │   ├── CreatePost.ts        # TODO: 投稿作成ユースケース
│   │   ├── FollowUser.ts        # TODO: フォローユースケース
│   │   └── ToggleLike.ts        # TODO: いいねユースケース
│   ├── dto/
│   │   ├── CreatePostInput.ts   # 入力DTO
│   │   └── CreatePostOutput.ts  # 出力DTO
│   └── services/
│       └── FollowDomainService.ts # TODO: ドメインサービス
└── web/src/
    └── hooks/
        └── useCreatePost.ts      # UIからの利用
```

## 📝 演習課題

### 課題1：CreatePostユースケースの実装

```typescript
// TODO: CreatePostユースケースを実装
export class CreatePostUseCase {
  constructor(
    private postRepo: IPostRepository,
    private userRepo: IUserRepository
  ) {}
  
  async execute(input: CreatePostInput): Promise<CreatePostOutput> {
    // 1. ユーザーの取得と検証
    // 2. 投稿の作成（ドメインロジック）
    // 3. 永続化
    // 4. DTOへの変換と返却
  }
}
```

考慮点：
- エラーハンドリング
- トランザクション管理
- 通知の送信

### 課題2：FollowDomainServiceの実装

```typescript
// TODO: ドメインサービスを実装
export class FollowDomainService {
  // フォロー可否の判定
  canFollow(follower: User, followee: User): FollowResult {
    // - 自己フォロー禁止
    // - ブロック状態チェック
    // - プライベートアカウント
  }
  
  // 相互フォロー判定
  isMutualFollow(
    relation1: FollowRelation,
    relation2: FollowRelation
  ): boolean {
    // ビジネスロジック
  }
}
```

### 課題3：Result型でのエラーハンドリング

```typescript
// TODO: Result型を使ったエラーハンドリング
type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

export class ToggleLikeUseCase {
  async execute(
    input: ToggleLikeInput
  ): Promise<Result<ToggleLikeOutput, LikeError>> {
    // 成功と失敗を型で表現
  }
}
```

## 🏗️ 実装課題

### ユースケース間の連携

```typescript
// TODO: 複数のユースケースを組み合わせる
export class PublishPostUseCase {
  constructor(
    private createPost: CreatePostUseCase,
    private notifyFollowers: NotifyFollowersUseCase,
    private updateTimeline: UpdateTimelineUseCase
  ) {}
  
  async execute(input: PublishPostInput): Promise<void> {
    // 1. 投稿作成
    // 2. フォロワーへの通知
    // 3. タイムライン更新
  }
}
```

### バリデーションの階層

```typescript
export class CreatePostUseCase {
  async execute(input: CreatePostInput) {
    // 1️⃣ 入力バリデーション（形式）
    this.validateInput(input);
    
    // 2️⃣ 権限チェック（認可）
    const author = await this.userRepo.findById(input.authorId);
    if (!author.canPost()) {
      throw new InsufficientPermissionError();
    }
    
    // 3️⃣ ビジネスルール（ドメイン）
    const post = Post.create({...});
    
    // 4️⃣ 外部制約（重複チェック等）
    if (await this.isDuplicate(post)) {
      throw new DuplicatePostError();
    }
  }
}
```

## 💡 設計のヒント

### アプリケーションサービスのチェックリスト

**やるべきこと：**
- ✅ ユースケースの流れを制御
- ✅ ドメインオブジェクトを組み合わせる
- ✅ トランザクションを管理

**やってはいけないこと：**
- ❌ ビジネスロジックを実装
- ❌ 技術的詳細を含める
- ❌ UIの関心事を扱う

### Fat Controllerを避ける

❌ 悪い例：すべてをControllerに
```typescript
class PostController {
  async create(req: Request) {
    // バリデーション、ビジネスロジック、
    // DB操作、通知...すべてここに
  }
}
```

✅ 良い例：適切な責任分離
```typescript
class PostController {
  async create(req: Request) {
    const input = this.toInput(req);
    const result = await this.useCase.execute(input);
    return this.toResponse(result);
  }
}
```

## 🧪 動作確認

```bash
# ユースケースのテスト
pnpm test:application

# 統合テスト
pnpm test:integration
```

### テストの書き方

```typescript
describe('CreatePostUseCase', () => {
  let useCase: CreatePostUseCase;
  let postRepo: MockPostRepository;
  
  test('投稿を作成できる', async () => {
    // Given
    const input = { authorId: 'user1', text: 'Hello' };
    
    // When
    const result = await useCase.execute(input);
    
    // Then
    expect(result.success).toBe(true);
    expect(postRepo.saved).toHaveLength(1);
  });
});
```

## 🎯 完成の確認

- [ ] CreatePostユースケースが実装されている
- [ ] FollowDomainServiceが実装されている
- [ ] エラーハンドリングが適切
- [ ] 責任が適切に分離されている
- [ ] テストが書かれている

## 🚀 次の章へ

```bash
git add .
git commit -m "完了: 第5章 - アプリケーションサービス"
git checkout chapter-6-strategic-design
```

最終章では、戦略的設計と完成版の実装を確認します。

## 🔗 参考リンク

- [第5回記事：アプリケーションサービス - ユースケースの司令塔](../articles/ddd-firebase-sns-part5-revised.md)
- [Application Service Pattern](https://www.martinfowler.com/eaaCatalog/serviceLayer.html)
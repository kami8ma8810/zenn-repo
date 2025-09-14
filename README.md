# 🎓 DDD × Firebase SNS ハンズオン - 第4章：リポジトリパターン

## 📚 この章で学ぶこと

- リポジトリパターンの本質
- 永続化の抽象化
- ファクトリパターンとの協調

## 🎯 学習目標

1. **リポジトリの理解**
   - コレクションとしての振る舞い
   - 永続化詳細の隠蔽
   - ドメインモデルの返却

2. **ファクトリの活用**
   - 複雑なオブジェクト生成
   - DBからの再構築
   - 生成ロジックの集約

3. **テスト可能な設計**
   - インメモリ実装
   - モックの活用
   - 依存性の注入

## 📂 この章のコード構造

```
packages/
├── domain/src/
│   ├── post/
│   │   ├── IPostRepository.ts      # リポジトリインターフェース
│   │   └── PostFactory.ts          # TODO: ファクトリ実装
│   └── user/
│       └── IUserRepository.ts      # TODO: インターフェース定義
└── infrastructure/src/
    ├── firebase/
    │   ├── FirestorePostRepository.ts  # TODO: Firestore実装
    │   └── FirestoreUserRepository.ts  # TODO: Firestore実装
    └── inMemory/
        ├── InMemoryPostRepository.ts   # TODO: テスト用実装
        └── InMemoryUserRepository.ts   # TODO: テスト用実装
```

## 📝 演習課題

### 課題1：リポジトリインターフェースの設計

`IPostRepository.ts`を完成させてください：

```typescript
export interface IPostRepository {
  // TODO: 必要なメソッドを定義
  // - save(post: Post): Promise<void>
  // - findById(id: PostId): Promise<Post | null>
  // - findByAuthor(authorId: UserId): Promise<Post[]>
  // - delete(id: PostId): Promise<void>
}
```

考慮点：
- 集約単位での操作
- ドメインモデルを返す
- 永続化の詳細を隠蔽

### 課題2：PostFactoryの実装

```typescript
// TODO: PostFactoryを実装
export class PostFactory {
  // 新規作成用
  static createNew(args: CreatePostArgs): Post {
    // ID生成、初期値設定
  }
  
  // DB再構築用
  static reconstitute(data: PostData): Post {
    // 永続化データから再構築
  }
}
```

### 課題3：FirestorePostRepositoryの実装

```typescript
// TODO: Firestore実装
export class FirestorePostRepository implements IPostRepository {
  constructor(
    private firestore: Firestore,
    private factory: PostFactory
  ) {}
  
  async save(post: Post): Promise<void> {
    // ドメインモデル → Firestore形式
  }
  
  async findById(id: PostId): Promise<Post | null> {
    // Firestore → ドメインモデル（ファクトリ使用）
  }
}
```

## 🏗️ 実装課題

### InMemoryPostRepositoryの実装

```typescript
// TODO: テスト用のインメモリ実装
export class InMemoryPostRepository implements IPostRepository {
  private posts = new Map<string, Post>();
  
  async save(post: Post): Promise<void> {
    // メモリに保存（ディープコピー）
  }
  
  // テスト用ヘルパー
  clear(): void { }
  count(): number { }
}
```

### 仕様パターンの実装（発展）

```typescript
// TODO: 検索条件の抽象化
export abstract class Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;
  
  and(other: Specification<T>): Specification<T> {
    // AND条件
  }
  
  or(other: Specification<T>): Specification<T> {
    // OR条件
  }
}

// 使用例
class PublicPostSpec extends Specification<Post> {
  isSatisfiedBy(post: Post): boolean {
    return post.isPublic();
  }
}
```

## 💡 設計のヒント

### リポジトリ設計の原則

**やるべきこと：**
- ✅ 集約ルートに対してのみ作る
- ✅ ドメインモデルを返す
- ✅ ビジネスに必要な検索を提供

**やってはいけないこと：**
- ❌ SQLやNoSQL固有の機能を露出
- ❌ DTOを返す
- ❌ 部分的な更新

### Firestore特有の考慮事項

```typescript
// NoSQLでの課題と解決策
class FirestorePostRepository {
  // 非正規化データの管理
  async findWithAuthor(id: PostId): Promise<PostWithAuthor> {
    // JOINができないので別途取得
    const post = await this.findById(id);
    const author = await this.userRepo.findById(post.authorId);
    return { post, author };
  }
  
  // 複雑なクエリの分割
  async findByHashtagAndAuthor(
    hashtag: string,
    authorId: UserId
  ): Promise<Post[]> {
    // 複合インデックスが必要
  }
}
```

## 🧪 動作確認

```bash
# リポジトリのテスト
pnpm test:repository

# インメモリ実装でのテスト
pnpm test:domain --mock
```

### テストの書き方

```typescript
describe('CreatePost', () => {
  let postRepo: InMemoryPostRepository;
  
  beforeEach(() => {
    postRepo = new InMemoryPostRepository();
  });
  
  test('投稿を保存できる', async () => {
    const post = PostFactory.createNew({...});
    await postRepo.save(post);
    
    expect(postRepo.count()).toBe(1);
    const saved = await postRepo.findById(post.id);
    expect(saved).toEqual(post);
  });
});
```

## 🎯 完成の確認

- [ ] リポジトリインターフェースが定義されている
- [ ] Firestore実装が動作する
- [ ] インメモリ実装でテストできる
- [ ] ファクトリが適切に使われている
- [ ] 永続化の詳細が隠蔽されている

## 🚀 次の章へ

```bash
git add .
git commit -m "完了: 第4章 - リポジトリパターン"
git checkout chapter-5-application-service
```

第5章では、アプリケーションサービスでユースケースを実装します。

## 🔗 参考リンク

- [第4回記事：リポジトリ - 永続化の抽象化](../articles/ddd-firebase-sns-part4-revised.md)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
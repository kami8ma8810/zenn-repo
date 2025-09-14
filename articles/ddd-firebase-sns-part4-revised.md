---
title: "小さなSNSを作りながら学ぶDDD — リポジトリ：永続化の抽象化【第4回】"
emoji: "🗄️"
type: "tech"
topics: ["ddd", "ドメイン駆動設計", "設計", "リポジトリパターン", "永続化"]
published: false
---

# 第4回：リポジトリ - 永続化の抽象化

## 🤔 データベースに依存するコードの問題

### よくある失敗：ビジネスロジックとDBが密結合

```typescript
// ❌ ビジネスロジックがFirestoreに依存
class PostService {
  async createPost(text: string, authorId: string) {
    // Firestoreの詳細がビジネスロジックに漏れている
    const docRef = await firestore.collection('posts').add({
      text,
      authorId,
      likeCount: 0,
      createdAt: serverTimestamp(),
      // Firestoreの制約：フィールド名、型、構造
    });
    
    // Firestoreのクエリ構文
    const userDoc = await firestore
      .collection('users')
      .doc(authorId)
      .get();
    
    if (userDoc.exists) {
      // Firestoreの更新API
      await userDoc.ref.update({
        postCount: increment(1)
      });
    }
  }
}
```

この設計の問題：
- **テストが困難**（Firestoreの実環境が必要）
- **DBの変更が困難**（PostgreSQLに変えたら全書き換え）
- **ビジネスロジックが不明確**（DB操作に埋もれている）

## 🎭 リポジトリパターンの本質

### 「コレクション」として振る舞う

> リポジトリは、メモリ上のコレクションのように振る舞う永続化の抽象化

```typescript
// メモリ上のコレクション（理想）
const posts: Post[] = [];
posts.push(newPost);  // 追加
const post = posts.find(p => p.id === id);  // 検索
posts.splice(index, 1);  // 削除

// リポジトリ（永続化を隠蔽）
await postRepository.save(newPost);  // 追加
const post = await postRepository.findById(id);  // 検索
await postRepository.delete(id);  // 削除
```

### リポジトリの責務

```typescript
// ドメイン層：インターフェースを定義
export interface PostRepository {
  // 集約の永続化
  save(post: Post): Promise<void>;
  
  // 集約の取得
  findById(id: PostId): Promise<Post | null>;
  
  // 集約の削除
  delete(id: PostId): Promise<void>;
  
  // ビジネスに必要な検索
  findByAuthor(authorId: UserId): Promise<Post[]>;
  findRecentPosts(limit: number): Promise<Post[]>;
}
```

**重要な原則**：
1. **集約単位で操作**（部分的な更新はしない）
2. **ドメインモデルを返す**（DTOではない）
3. **永続化の詳細を隠蔽**（SQLもNoSQLも同じインターフェース）

## 🏗️ ファクトリ：複雑なオブジェクトの生成

### なぜファクトリが必要か

```typescript
// ❌ 複雑な生成ロジックが散在
const post = new Post(
  new PostId(generateId()),
  new UserId(userId),
  new PostContent(text, validateText(text)),
  new PostMetrics(0, 0, 0),
  new Date(),
  PostStatus.DRAFT,
  // 初期化が複雑...
);
```

### ファクトリの役割

```typescript
export class PostFactory {
  // 新規作成用ファクトリ
  static createNew(args: {
    authorId: UserId;
    text: string;
    imageUrl?: string;
  }): Post {
    // 複雑な生成ロジックを集約
    const id = PostId.generate();
    const content = PostContent.create(args.text, args.imageUrl);
    const metrics = PostMetrics.zero();
    
    return new Post(
      id,
      args.authorId,
      content,
      metrics,
      new Date(),
      PostStatus.PUBLISHED
    );
  }
  
  // DBから再構築用ファクトリ
  static reconstitute(data: PostData): Post {
    // 永続化されたデータから集約を再構築
    return new Post(
      new PostId(data.id),
      new UserId(data.authorId),
      PostContent.fromData(data.content),
      PostMetrics.fromData(data.metrics),
      data.createdAt,
      data.status as PostStatus
    );
  }
}
```

## 🔄 リポジトリとファクトリの協調

### 実装例：FirestorePostRepository

```typescript
export class FirestorePostRepository implements PostRepository {
  constructor(
    private firestore: Firestore,
    private factory: PostFactory
  ) {}
  
  async save(post: Post): Promise<void> {
    // ドメインオブジェクト → 永続化形式
    const data = this.toPersistence(post);
    
    await this.firestore
      .collection('posts')
      .doc(post.id.value)
      .set(data);
  }
  
  async findById(id: PostId): Promise<Post | null> {
    const doc = await this.firestore
      .collection('posts')
      .doc(id.value)
      .get();
    
    if (!doc.exists) {
      return null;
    }
    
    // 永続化形式 → ドメインオブジェクト（ファクトリを使用）
    return this.factory.reconstitute(doc.data() as PostData);
  }
  
  private toPersistence(post: Post): Record<string, any> {
    // ドメインモデルを永続化形式に変換
    return {
      id: post.id.value,
      authorId: post.authorId.value,
      content: {
        text: post.content.text,
        imageUrl: post.content.imageUrl,
      },
      metrics: {
        likeCount: post.metrics.likeCount,
        commentCount: post.metrics.commentCount,
        shareCount: post.metrics.shareCount,
      },
      createdAt: post.createdAt,
      status: post.status,
      version: post.version,  // 楽観的ロック用
    };
  }
}
```

## 🧪 テスト可能な設計

### インメモリ実装でテスト

```typescript
export class InMemoryPostRepository implements PostRepository {
  private posts = new Map<string, Post>();
  
  async save(post: Post): Promise<void> {
    // メモリに保存（テスト用）
    this.posts.set(post.id.value, post.clone());
  }
  
  async findById(id: PostId): Promise<Post | null> {
    const post = this.posts.get(id.value);
    return post ? post.clone() : null;
  }
  
  async findByAuthor(authorId: UserId): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(post => post.authorId.equals(authorId))
      .map(post => post.clone());
  }
  
  // テスト用ヘルパー
  clear(): void {
    this.posts.clear();
  }
  
  count(): number {
    return this.posts.size;
  }
}
```

### ユースケースのテスト

```typescript
describe('CreatePost', () => {
  let createPost: CreatePost;
  let postRepo: InMemoryPostRepository;
  
  beforeEach(() => {
    postRepo = new InMemoryPostRepository();
    createPost = new CreatePost(postRepo);
  });
  
  test('投稿を作成できる', async () => {
    // Firestoreに依存しないテスト！
    const result = await createPost.execute({
      authorId: 'user1',
      text: 'テスト投稿',
    });
    
    expect(result.isSuccess).toBe(true);
    expect(postRepo.count()).toBe(1);
    
    const saved = await postRepo.findById(result.value.id);
    expect(saved?.content.text).toBe('テスト投稿');
  });
});
```

## 🎯 仕様パターン：複雑な検索条件

### ビジネスルールとしての検索条件

```typescript
// 仕様パターン：検索条件をオブジェクトとして表現
export abstract class Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;
  
  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other);
  }
  
  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other);
  }
  
  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

// 具体的な仕様
export class PublicPostSpecification extends Specification<Post> {
  isSatisfiedBy(post: Post): boolean {
    return post.visibility === PostVisibility.PUBLIC;
  }
}

export class PopularPostSpecification extends Specification<Post> {
  constructor(private minLikes: number) {
    super();
  }
  
  isSatisfiedBy(post: Post): boolean {
    return post.metrics.likeCount >= this.minLikes;
  }
}
```

### 仕様を使った検索

```typescript
export interface PostRepository {
  // 仕様による検索
  findBySpecification(spec: Specification<Post>): Promise<Post[]>;
}

// 使用例
const publicAndPopular = new PublicPostSpecification()
  .and(new PopularPostSpecification(100));

const posts = await postRepository.findBySpecification(publicAndPopular);
```

## 💡 リポジトリ設計の原則

### 1. 集約ルートに対してのみリポジトリを作る

```typescript
// ✅ 集約ルートのリポジトリ
interface PostRepository { }
interface UserRepository { }

// ❌ 集約の内部要素にリポジトリは作らない
interface CommentRepository { }  // Commentが集約内なら不要
```

### 2. ページネーションの実装

```typescript
export interface PageRequest {
  page: number;
  size: number;
  sort?: SortOrder;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
}

interface PostRepository {
  findRecent(pageRequest: PageRequest): Promise<Page<Post>>;
}
```

### 3. トランザクションの扱い

```typescript
// Unit of Workパターン
export interface UnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  
  getRepository<T>(type: new() => T): T;
}

// 使用例
class TransferPost {
  async execute(postId: string, newAuthorId: string) {
    const uow = await this.unitOfWork.begin();
    
    try {
      const postRepo = uow.getRepository(PostRepository);
      const userRepo = uow.getRepository(UserRepository);
      
      const post = await postRepo.findById(postId);
      const newAuthor = await userRepo.findById(newAuthorId);
      
      post.transferTo(newAuthor);
      
      await postRepo.save(post);
      await userRepo.save(newAuthor);
      
      await uow.commit();
    } catch (error) {
      await uow.rollback();
      throw error;
    }
  }
}
```

## 🔍 Firebase特有の考慮事項

### NoSQLでの実装課題

```typescript
class FirestorePostRepository {
  // JOINができないので非正規化
  async findWithAuthor(id: PostId): Promise<PostWithAuthor> {
    const post = await this.findById(id);
    if (!post) return null;
    
    // 別途作者情報を取得
    const author = await this.userRepo.findById(post.authorId);
    
    return {
      post,
      authorName: author.name,
      authorPhotoUrl: author.photoUrl,
    };
  }
  
  // 複雑なクエリは複数回に分ける
  async findByHashtagAndAuthor(
    hashtag: string,
    authorId: UserId
  ): Promise<Post[]> {
    // Firestoreの制約：複合インデックスが必要
    const posts = await this.firestore
      .collection('posts')
      .where('hashtags', 'array-contains', hashtag)
      .where('authorId', '==', authorId.value)
      .get();
    
    return posts.docs.map(doc => 
      this.factory.reconstitute(doc.data())
    );
  }
}
```

## 📝 まとめ：永続化からの解放

**リポジトリの本質**：
- ドメインモデルと永続化技術の分離
- メモリ上のコレクションのような操作性
- テスト可能な設計

**ファクトリの役割**：
- 複雑な生成ロジックの集約
- 永続化データからの再構築

**設計の効果**：
- DBを変更してもドメイン層は不変
- ビジネスロジックに集中できる
- テストが高速で確実

## 🎯 次回予告

第5回では、**アプリケーションサービスとドメインサービス**の違いを学びます：
- ユースケースの実装パターン
- ドメインサービスが必要になる場面
- トランザクション管理の実践

ビジネスロジックをどこに置くべきか、その判断基準に迫ります！

---

**実践課題**：あなたのシステムでDB操作が直接書かれている箇所を見つけて、リポジトリパターンで抽象化できないか考えてみてください。
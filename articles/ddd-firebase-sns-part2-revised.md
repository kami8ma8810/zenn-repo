---
title: "小さなSNSを作りながら学ぶDDD — エンティティと値オブジェクトの本質【第2回】"
emoji: "💎"
type: "tech"
topics: ["ddd", "ドメイン駆動設計", "設計", "typescript", "オブジェクト指向"]
published: false
---

# 第2回：エンティティと値オブジェクトの本質

## 🤔 根本的な問い：「同一性」とは何か？

### あなたは昨日のあなたと同じ人ですか？

哲学的な問いのようですが、これがエンティティと値オブジェクトの本質です。

```typescript
// 田中太郎さん（30歳）
const tanaka1 = { name: "田中太郎", age: 30 };

// 1年後の田中太郎さん（31歳）
const tanaka2 = { name: "田中太郎", age: 31 };

// Q: tanaka1とtanaka2は同じ人？
```

答え：**同じ人**です。年齢が変わっても田中太郎さんは田中太郎さん。

これが**エンティティ**の本質：**継続的な同一性**を持つ。

一方で：

```typescript
// 1000円
const money1 = { amount: 1000, currency: "JPY" };

// 別の1000円
const money2 = { amount: 1000, currency: "JPY" };

// Q: money1とmoney2は同じ？
```

答え：**同じ**です。1000円は1000円。

これが**値オブジェクト**の本質：**属性によって識別**される。

## 🏷️ エンティティ：ライフサイクルを持つ存在

### SNSのユーザーで考える

```typescript
// ❌ 悪い例：エンティティをデータの塊として扱う
interface UserData {
  id: string;
  name: string;
  email: string;
  bio: string;
  followerCount: number;
  createdAt: Date;
}

// ✅ 良い例：エンティティをライフサイクルを持つ存在として扱う
export class User {
  private constructor(
    readonly id: UserId,  // 不変の識別子
    private name: string,
    private email: Email,
    private bio: string,
    private followerCount: number,
    readonly createdAt: Date,
    private updatedAt: Date
  ) {}
  
  // 誕生：ユーザーの作成
  static create(args: {
    id: UserId,
    name: string,
    email: string
  }): User {
    const now = new Date();
    
    return new User(
      args.id,
      args.name,
      new Email(args.email),  // 値オブジェクト
      "",  // 初期状態
      0,   // 初期状態
      now,
      now
    );
  }
  
  // 成長：プロフィール更新
  updateProfile(name: string, bio: string): void {
    this.name = name;
    this.bio = this.validateBio(bio);
    this.updatedAt = new Date();
    
    // イベント：プロフィールが更新された
    this.recordEvent(new ProfileUpdated(this.id, name, bio));
  }
  
  // 変化：インフルエンサーになる
  becomeInfluencer(): void {
    if (this.followerCount >= 1000) {
      // 状態遷移
      this.recordEvent(new UserBecameInfluencer(this.id));
    }
  }
  
  // 同一性の判定
  equals(other: User): boolean {
    // IDが同じなら同じユーザー（属性が違っても）
    return this.id.equals(other.id);
  }
}
```

### エンティティの特徴

1. **識別子（ID）を持つ**
   - ユーザーID、投稿ID、注文IDなど
   - システム全体でユニーク

2. **ライフサイクルを持つ**
   - 作成 → 更新 → （削除）
   - 状態が時間とともに変化

3. **継続性がある**
   - データベースに永続化
   - 複数のトランザクションをまたぐ

## 💰 値オブジェクト：不変の概念

### メールアドレスで考える

```typescript
// ❌ 悪い例：プリミティブ型の乱用
class User {
  constructor(
    private email: string  // 何でも入る！
  ) {}
  
  updateEmail(newEmail: string): void {
    // バリデーションがあちこちに散在
    if (!newEmail.includes('@')) {
      throw new Error('Invalid email');
    }
    this.email = newEmail;
  }
}

// ✅ 良い例：値オブジェクトで概念を表現
export class Email {
  private readonly value: string;
  
  constructor(value: string) {
    // 生成時に不変条件を保証
    if (!this.isValid(value)) {
      throw new InvalidEmailError(`不正なメールアドレス: ${value}`);
    }
    this.value = value.toLowerCase();  // 正規化
  }
  
  private isValid(value: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value);
  }
  
  // 値の取得（カプセル化）
  toString(): string {
    return this.value;
  }
  
  // ドメインロジック：ドメイン部分を取得
  getDomain(): string {
    return this.value.split('@')[1];
  }
  
  // 同値性の判定
  equals(other: Email): boolean {
    return this.value === other.value;
  }
  
  // 不変性：新しいインスタンスを返す
  withDomain(newDomain: string): Email {
    const [localPart] = this.value.split('@');
    return new Email(`${localPart}@${newDomain}`);
  }
}
```

### 値オブジェクトの威力

```typescript
// 型安全性
class User {
  constructor(
    private email: Email  // Emailクラスのインスタンスしか受け付けない
  ) {}
  
  // もうバリデーションは不要！
  updateEmail(newEmail: Email): void {
    this.email = newEmail;  // 常に有効なメールアドレス
  }
}

// 使用例
const email = new Email("user@example.com");
const user = new User(email);

// コンパイルエラー！型安全
// user.updateEmail("invalid-email");  // ❌

// 正しい使い方
user.updateEmail(new Email("new@example.com"));  // ✅
```

## 🎯 実践：SNSドメインでの使い分け

### 投稿（Post）：エンティティ

```typescript
export class Post {
  private constructor(
    readonly id: PostId,           // 識別子
    readonly authorId: UserId,
    private content: PostContent,  // 値オブジェクト
    private metrics: PostMetrics,  // 値オブジェクト
    readonly createdAt: Date,
    private updatedAt: Date
  ) {}
  
  // ライフサイクル：投稿の編集
  edit(newContent: PostContent): void {
    this.content = newContent;
    this.updatedAt = new Date();
  }
  
  // ライフサイクル：いいねされる
  receiveLike(from: UserId): void {
    this.metrics = this.metrics.incrementLikes();
    this.recordEvent(new PostLiked(this.id, from));
  }
}
```

### 投稿内容（PostContent）：値オブジェクト

```typescript
export class PostContent {
  private constructor(
    private readonly text: string,
    private readonly imageUrls: readonly ImageUrl[],
    private readonly mentions: readonly UserId[]
  ) {}
  
  static create(text: string, imageUrls: string[] = []): PostContent {
    // ビジネスルール：文字数制限
    if (text.length > 300) {
      throw new PostTooLongError("投稿は300文字以内です");
    }
    
    // ビジネスルール：画像は4枚まで
    if (imageUrls.length > 4) {
      throw new TooManyImagesError("画像は4枚までです");
    }
    
    // メンション（@username）を抽出
    const mentions = this.extractMentions(text);
    
    return new PostContent(
      text,
      imageUrls.map(url => new ImageUrl(url)),
      mentions
    );
  }
  
  // 不変性：新しいインスタンスを返す
  withText(newText: string): PostContent {
    return PostContent.create(newText, this.getImageUrls());
  }
  
  // ビジネスロジック：ハッシュタグ抽出
  getHashtags(): string[] {
    const regex = /#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g;
    return this.text.match(regex) || [];
  }
  
  // 同値性判定
  equals(other: PostContent): boolean {
    return this.text === other.text &&
           this.imageUrls.length === other.imageUrls.length &&
           this.imageUrls.every((url, i) => url.equals(other.imageUrls[i]));
  }
}
```

### 投稿メトリクス（PostMetrics）：値オブジェクト

```typescript
export class PostMetrics {
  constructor(
    private readonly likeCount: number,
    private readonly commentCount: number,
    private readonly shareCount: number,
    private readonly viewCount: number
  ) {}
  
  static zero(): PostMetrics {
    return new PostMetrics(0, 0, 0, 0);
  }
  
  // 不変性：新しいインスタンスを返す
  incrementLikes(): PostMetrics {
    return new PostMetrics(
      this.likeCount + 1,
      this.commentCount,
      this.shareCount,
      this.viewCount
    );
  }
  
  // ビジネスロジック：エンゲージメント率
  getEngagementRate(): number {
    if (this.viewCount === 0) return 0;
    
    const engagements = this.likeCount + this.commentCount + this.shareCount;
    return (engagements / this.viewCount) * 100;
  }
  
  // ビジネスロジック：バズった投稿かどうか
  isViral(): boolean {
    return this.shareCount > 100 && this.getEngagementRate() > 10;
  }
}
```

## 🔍 判断基準：エンティティか値オブジェクトか？

### 質問リスト

1. **同一性は重要か？**
   - Yes → エンティティ
   - No → 値オブジェクト

2. **ライフサイクルはあるか？**
   - Yes → エンティティ
   - No → 値オブジェクト

3. **変更可能である必要があるか？**
   - Yes → エンティティ
   - No → 値オブジェクト

4. **交換可能か？**
   - Yes → 値オブジェクト
   - No → エンティティ

### 実例での判断

```typescript
// 🤔 フォロー関係はエンティティ？値オブジェクト？

// 案1：エンティティとして扱う
class Follow {
  constructor(
    private readonly id: FollowId,
    private readonly followerId: UserId,
    private readonly followeeId: UserId,
    private readonly createdAt: Date
  ) {}
}

// 案2：値オブジェクトとして扱う
class FollowRelation {
  constructor(
    private readonly followerId: UserId,
    private readonly followeeId: UserId
  ) {}
  
  equals(other: FollowRelation): boolean {
    return this.followerId.equals(other.followerId) &&
           this.followeeId.equals(other.followeeId);
  }
}

// 答え：ビジネス要件次第
// - フォロー履歴が重要 → エンティティ
// - 現在の関係だけ重要 → 値オブジェクト
```

## 💡 値オブジェクトの隠れた力

### 1. 表現力の向上

```typescript
// Before
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // 引数の順番を間違えやすい...
}

// After
function calculateDistance(from: Location, to: Location): Distance {
  // 意図が明確！
}
```

### 2. ロジックの集約

```typescript
class Money {
  constructor(
    private readonly amount: number,
    private readonly currency: Currency
  ) {}
  
  // お金に関するロジックが集約される
  add(other: Money): Money {
    if (!this.currency.equals(other.currency)) {
      throw new CurrencyMismatchError();
    }
    return new Money(this.amount + other.amount, this.currency);
  }
  
  multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }
  
  format(): string {
    return this.currency.format(this.amount);
  }
}
```

### 3. 不変性による安全性

```typescript
class DateRange {
  constructor(
    private readonly start: Date,
    private readonly end: Date
  ) {
    if (start > end) {
      throw new InvalidDateRangeError();
    }
  }
  
  // 不変なので、どこで使っても安全
  contains(date: Date): boolean {
    return date >= this.start && date <= this.end;
  }
  
  // 新しいインスタンスを返すので、元のデータは不変
  extend(days: number): DateRange {
    const newEnd = new Date(this.end);
    newEnd.setDate(newEnd.getDate() + days);
    return new DateRange(this.start, newEnd);
  }
}
```

## 📝 まとめ：本質を理解する

**エンティティ**：
- WHO（誰が）やWHAT（何が）を表現
- 継続的な同一性が重要
- ライフサイクルを持つ

**値オブジェクト**：
- HOW MUCH（どれくらい）やWHEN（いつ）を表現
- 属性の組み合わせが重要
- 不変で交換可能

## 🎯 次回予告

第3回では、**集約（Aggregate）**の設計を学びます：
- トランザクション境界の設計
- 不変条件の守り方
- 集約間の参照ルール

複数のエンティティと値オブジェクトをどうまとめるか、その設計原則に迫ります！

---

**実践課題**：あなたのシステムで「string型」を使っている箇所を見つけて、値オブジェクトに置き換えられないか考えてみてください。
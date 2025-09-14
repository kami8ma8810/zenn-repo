---
title: "小さなSNSを作りながら学ぶDDD — 集約：トランザクション整合性の守護者【第3回】"
emoji: "🛡️"
type: "tech"
topics: ["ddd", "ドメイン駆動設計", "設計", "アーキテクチャ", "トランザクション"]
published: false
---

# 第3回：集約 - トランザクション整合性の守護者

## 🤔 なぜ「集約」が必要なのか？

### 現実世界の例：レストランの予約

```typescript
// ❌ 集約を考えていない設計
class Restaurant {
  tables: Table[];
}

class Table {
  seats: number;
  isReserved: boolean;
}

class Reservation {
  tableId: string;
  customerName: string;
  date: Date;
}

// 問題：整合性が保てない！
async function makeReservation() {
  const table = await findAvailableTable();
  
  // この間に他の人が予約するかも...
  
  const reservation = new Reservation(table.id, customer, date);
  await saveReservation(reservation);
  
  table.isReserved = true;
  await saveTable(table);  // ここで失敗したら？
}
```

この設計の問題：
- **不整合な状態**が生まれる（予約はあるのにテーブルは空き）
- **競合状態**（Race Condition）が発生
- **トランザクション境界**が不明確

## 🏰 集約とは何か

**集約（Aggregate）**は、**一貫性境界**を定義するDDDの戦術的パターンです。

### 集約の本質

> 「一緒に変更されるものは、一緒に管理する」

```typescript
// ✅ 集約として設計
export class RestaurantBooking {  // 集約ルート
  private constructor(
    private readonly id: BookingId,
    private readonly restaurantId: RestaurantId,
    private tables: Map<TableNumber, TableReservation>,  // 集約内のエンティティ
    private readonly capacity: Capacity,  // 値オブジェクト
    private version: number  // 楽観的ロック用
  ) {}
  
  // ファクトリメソッド：集約全体を生成
  static create(restaurantId: RestaurantId, tables: TableConfig[]): RestaurantBooking {
    const tableMap = new Map<TableNumber, TableReservation>();
    
    tables.forEach(config => {
      tableMap.set(
        config.number,
        TableReservation.create(config.number, config.seats)
      );
    });
    
    return new RestaurantBooking(
      BookingId.generate(),
      restaurantId,
      tableMap,
      Capacity.fromTables(tables),
      0
    );
  }
  
  // ビジネスロジック：予約を作成（集約内で完結）
  makeReservation(
    customer: CustomerInfo,
    requestedSeats: number,
    date: ReservationDate
  ): Reservation {
    // 不変条件1：営業時間内か
    if (!this.isOpenOn(date)) {
      throw new RestaurantClosedError(`${date}は営業時間外です`);
    }
    
    // 不変条件2：空きテーブルがあるか
    const availableTable = this.findAvailableTable(requestedSeats, date);
    if (!availableTable) {
      throw new NoAvailableTableError(`${requestedSeats}名用のテーブルがありません`);
    }
    
    // 不変条件3：同じ顧客の重複予約を防ぐ
    if (this.hasReservation(customer, date)) {
      throw new DuplicateReservationError(`既に予約があります`);
    }
    
    // 集約内で一貫性を保証して予約を作成
    const reservation = availableTable.reserve(customer, date);
    
    // ドメインイベントを発行
    this.addEvent(new ReservationMade(
      this.restaurantId,
      reservation.id,
      customer,
      date
    ));
    
    return reservation;
  }
  
  // 集約の境界を守る：内部状態は直接公開しない
  getAvailableTables(date: ReservationDate): ReadonlyArray<TableInfo> {
    return Array.from(this.tables.values())
      .filter(table => table.isAvailableOn(date))
      .map(table => table.toInfo());  // 読み取り専用のDTOに変換
  }
}
```

## 🎯 集約設計の原則

### 原則1：小さく保つ

```typescript
// ❌ 巨大な集約
class User {
  posts: Post[];        // 全投稿
  followers: User[];    // 全フォロワー
  likes: Like[];        // 全いいね
  comments: Comment[];  // 全コメント
  // メモリに載らない！トランザクションが重い！
}

// ✅ 小さな集約
class User {
  profile: UserProfile;  // 基本情報のみ
  settings: UserSettings;
  // 他は別集約として管理
}

class Post {  // 別の集約
  id: PostId;
  authorId: UserId;  // 他の集約への参照はIDのみ
  content: PostContent;
  metrics: PostMetrics;
}
```

### 原則2：IDによる参照

```typescript
// ❌ 集約間の直接参照
class Post {
  author: User;  // Userオブジェクトを直接保持
  comments: Comment[];  // Commentオブジェクトの配列
}

// ✅ IDによる参照
class Post {
  authorId: UserId;  // IDのみ保持
  // コメントは別集約
}

class Comment {  // 独立した集約
  id: CommentId;
  postId: PostId;  // 投稿へはIDで参照
  authorId: UserId;
  content: CommentContent;
}
```

### 原則3：トランザクション境界を1つの集約内に

```typescript
// ❌ 複数の集約をまたぐトランザクション
async function likePost(userId: string, postId: string) {
  const user = await userRepo.find(userId);
  const post = await postRepo.find(postId);
  
  // 2つの集約を同時に更新（危険！）
  user.addLikedPost(postId);
  post.incrementLikes();
  
  await userRepo.save(user);
  await postRepo.save(post);  // ここで失敗したら？
}

// ✅ 集約ごとに分離
async function likePost(userId: string, postId: string) {
  // 1. いいねを記録（Like集約）
  const like = Like.create(UserId(userId), PostId(postId));
  await likeRepo.save(like);
  
  // 2. 結果整合性でカウンターを更新（Post集約）
  await eventBus.publish(new PostLiked(postId, userId));
  // → 非同期でPost集約のカウンターを更新
}
```

## 🏗️ SNSドメインでの集約設計

### Post集約：投稿の一貫性を守る

```typescript
export class Post {  // 集約ルート
  private constructor(
    private readonly id: PostId,
    private readonly authorId: UserId,
    private content: PostContent,
    private visibility: PostVisibility,
    private metrics: PostMetrics,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private version: number
  ) {}
  
  // 不変条件：作者のみ編集可能
  edit(
    editorId: UserId,
    newContent: PostContent
  ): void {
    if (!this.authorId.equals(editorId)) {
      throw new UnauthorizedError("作者のみ編集可能です");
    }
    
    if (this.isArchived()) {
      throw new InvalidStateError("アーカイブ済みの投稿は編集できません");
    }
    
    this.content = newContent;
    this.updatedAt = new Date();
    this.version++;
    
    this.addEvent(new PostEdited(this.id, newContent));
  }
  
  // 不変条件：公開範囲の制御
  changeVisibility(
    actorId: UserId,
    newVisibility: PostVisibility
  ): void {
    if (!this.authorId.equals(actorId)) {
      throw new UnauthorizedError("作者のみ公開範囲を変更できます");
    }
    
    // ビジネスルール：一度限定公開にしたら公開にできない
    if (this.visibility.isLimited() && newVisibility.isPublic()) {
      throw new InvalidStateTransitionError(
        "限定公開から公開への変更はできません"
      );
    }
    
    this.visibility = newVisibility;
    this.addEvent(new PostVisibilityChanged(this.id, newVisibility));
  }
  
  // メトリクスの更新（結果整合性）
  updateMetrics(metrics: PostMetrics): void {
    this.metrics = metrics;
    
    // ビジネスルール：バズった投稿の通知
    if (metrics.isViral() && !this.metrics.isViral()) {
      this.addEvent(new PostWentViral(this.id, this.authorId));
    }
  }
}
```

### FollowRelationship集約：フォロー関係の整合性

```typescript
export class FollowRelationship {  // 集約ルート
  private constructor(
    private readonly followerId: UserId,
    private readonly followeeId: UserId,
    private status: FollowStatus,
    private readonly followedAt: Date,
    private blockedAt?: Date
  ) {}
  
  static follow(
    follower: UserId,
    followee: UserId
  ): FollowRelationship {
    // 不変条件：自己フォロー禁止
    if (follower.equals(followee)) {
      throw new SelfFollowError("自分自身はフォローできません");
    }
    
    const relationship = new FollowRelationship(
      follower,
      followee,
      FollowStatus.ACTIVE,
      new Date()
    );
    
    relationship.addEvent(new UserFollowed(follower, followee));
    
    return relationship;
  }
  
  // ビジネスロジック：ブロック
  block(): void {
    if (this.status === FollowStatus.BLOCKED) {
      return;  // 冪等性
    }
    
    this.status = FollowStatus.BLOCKED;
    this.blockedAt = new Date();
    
    this.addEvent(new UserBlocked(this.followerId, this.followeeId));
  }
  
  // ビジネスロジック：ブロック解除
  unblock(): void {
    if (this.status !== FollowStatus.BLOCKED) {
      throw new InvalidStateError("ブロックされていません");
    }
    
    this.status = FollowStatus.ACTIVE;
    this.blockedAt = undefined;
    
    this.addEvent(new UserUnblocked(this.followerId, this.followeeId));
  }
  
  // 集約の境界：フォロワー数は別で管理
  // カウンターは結果整合性で更新
}
```

## 🔒 不変条件の実装パターン

### パターン1：ファクトリメソッドでの検証

```typescript
class Order {
  static create(
    customerId: CustomerId,
    items: OrderItem[]
  ): Order {
    // 生成時の不変条件
    if (items.length === 0) {
      throw new EmptyOrderError("注文には商品が必要です");
    }
    
    const totalAmount = items.reduce((sum, item) => 
      sum + item.price * item.quantity, 0
    );
    
    if (totalAmount > 1000000) {
      throw new OrderTooLargeError("注文金額が上限を超えています");
    }
    
    return new Order(/* ... */);
  }
}
```

### パターン2：メソッド内での保護

```typescript
class Account {
  withdraw(amount: Money): void {
    // 操作時の不変条件
    if (amount.isGreaterThan(this.balance)) {
      throw new InsufficientFundsError("残高不足です");
    }
    
    if (this.isFrozen()) {
      throw new AccountFrozenError("凍結中の口座です");
    }
    
    this.balance = this.balance.subtract(amount);
    this.addTransaction(new Withdrawal(amount, new Date()));
  }
}
```

### パターン3：状態遷移の制御

```typescript
class OrderLifecycle {
  private status: OrderStatus;
  
  confirm(): void {
    // 状態遷移の不変条件
    if (this.status !== OrderStatus.DRAFT) {
      throw new InvalidStateTransitionError(
        `${this.status}から確定への遷移はできません`
      );
    }
    
    this.status = OrderStatus.CONFIRMED;
  }
  
  ship(): void {
    if (this.status !== OrderStatus.CONFIRMED) {
      throw new InvalidStateTransitionError(
        `${this.status}から発送への遷移はできません`
      );
    }
    
    this.status = OrderStatus.SHIPPED;
  }
}
```

## 🌊 結果整合性とドメインイベント

### 集約間の協調

```typescript
// Post集約
class Post {
  delete(deleterId: UserId): void {
    if (!this.authorId.equals(deleterId)) {
      throw new UnauthorizedError();
    }
    
    this.status = PostStatus.DELETED;
    
    // ドメインイベントを発行
    this.addEvent(new PostDeleted(this.id, this.authorId));
  }
}

// イベントハンドラー（別の集約を更新）
class PostDeletedHandler {
  async handle(event: PostDeleted): Promise<void> {
    // Timeline集約から削除
    await this.timelineRepo.removePost(event.postId);
    
    // Notification集約を更新
    await this.notificationRepo.markAsDeleted(event.postId);
    
    // Analytics集約を更新
    await this.analyticsRepo.recordDeletion(event.postId);
  }
}
```

## 📏 集約境界の見つけ方

### 質問リスト

1. **一緒に作成される？**
   - Yes → 同じ集約の候補

2. **一緒に削除される？**
   - Yes → 同じ集約の候補

3. **同時に更新が必要？**
   - Yes → 同じ集約の候補

4. **独立して存在できる？**
   - Yes → 別の集約の候補

5. **別のユーザーが同時に編集する？**
   - Yes → 別の集約にすべき

### 実例：コメントは投稿の一部か？

```typescript
// 案1：Post集約に含める
class Post {
  comments: Comment[];  // 一緒に管理
}

// 案2：別の集約にする
class Comment {  // 独立した集約
  postId: PostId;  // IDで参照
}

// 判断基準：
// - コメントは投稿と独立して作成/削除される → 別集約
// - 複数ユーザーが同時にコメントする → 別集約
// - コメント数が増えても投稿の読み込みは軽くしたい → 別集約

// 結論：別の集約にする！
```

## 📝 まとめ：集約の本質

**集約は「一貫性の境界」**：
- トランザクションの単位
- 不変条件を守る責任者
- ビジネスルールの実装場所

**設計原則**：
- 小さく保つ
- IDで他の集約を参照
- 結果整合性を活用

## 🎯 次回予告

第4回では、**リポジトリとファクトリ**を学びます：
- 永続化の抽象化
- 集約の再構築
- テスト可能な設計

ドメイン層とインフラ層をどう分離するか、その実装パターンに迫ります！

---

**実践課題**：あなたのシステムで「トランザクションが大きすぎる」と感じる箇所を見つけて、集約境界を見直してみてください。
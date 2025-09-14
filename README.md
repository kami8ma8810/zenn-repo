# 🎓 DDD × Firebase SNS ハンズオン - 第3章：集約パターン

## 📚 この章で学ぶこと

- 集約の本質（トランザクション境界）
- 集約ルートの設計
- 不変条件の実装

## 🎯 学習目標

1. **集約の理解**
   - 一貫性境界の定義
   - トランザクション整合性
   - 集約ルートの責務

2. **設計原則の実践**
   - 小さな集約
   - IDによる参照
   - 結果整合性

3. **不変条件の実装**
   - ビジネスルールの保護
   - 状態遷移の制御

## 📂 この章のコード構造

```
packages/domain/src/
├── post/
│   ├── Post.ts              # 集約ルート
│   ├── PostMetrics.ts       # TODO: 値オブジェクト
│   └── PostAggregate.ts     # TODO: 集約全体
├── followRelation/
│   └── FollowRelation.ts    # TODO: 別の集約
└── like/
    └── Like.ts              # TODO: 独立した集約
```

## 📝 演習課題

### 課題1：Post集約の境界設計

以下の要素を集約内に含めるべきか判断してください：

```typescript
// Post集約に含める？含めない？
- Post本体         → ?
- コメント         → ?
- いいね          → ?
- 投稿者情報      → ?
- 閲覧数          → ?
```

判断基準：
- 一緒に作成/削除される？
- 同時に更新が必要？
- 独立して存在できる？

### 課題2：不変条件の実装

`Post.ts`に以下の不変条件を実装してください：

```typescript
// TODO: 以下の不変条件を守る
// 1. 作者のみ編集可能
// 2. アーカイブ済みは編集不可
// 3. 公開範囲の制御
```

実装例：
```typescript
edit(editorId: UserId, newContent: PostContent): void {
  // 不変条件のチェック
  if (!this.authorId.equals(editorId)) {
    throw new UnauthorizedError();
  }
  // 更新処理
}
```

### 課題3：集約間の連携設計

いいね機能を実装する際の集約設計：

```typescript
// 案1：Post集約に含める
class Post {
  private likes: Like[];
  
  addLike(userId: UserId): void {
    // 集約内で完結
  }
}

// 案2：独立した集約にする
class Like {
  constructor(
    private postId: PostId,
    private userId: UserId
  ) {}
}

// どちらが適切？その理由は？
```

## 🏗️ 実装課題

### FollowRelation集約の実装

```typescript
// TODO: FollowRelation集約を実装
// 要件：
// - フォロー/アンフォロー
// - ブロック機能
// - 相互フォロー判定
// - 自己フォロー禁止
```

考慮点：
- フォロワー数のカウントは集約内？外？
- 通知はどこで発行？
- ブロック状態の管理

### PostMetrics値オブジェクトの実装

```typescript
// TODO: PostMetrics値オブジェクトを実装
// 要件：
// - いいね数、コメント数、シェア数
// - エンゲージメント率の計算
// - バズ判定ロジック
```

## 💡 設計のヒント

### 集約設計のチェックリスト

**小さく保つために：**
- [ ] 本当に強い整合性が必要か？
- [ ] 結果整合性で十分では？
- [ ] パフォーマンスの問題はない？

**境界を見つけるために：**
- [ ] ユースケースを列挙した？
- [ ] 並行編集のシナリオは？
- [ ] トランザクションの範囲は？

### よくあるアンチパターン

❌ 巨大な集約
```typescript
class User {
  posts: Post[];        // 全投稿
  followers: User[];    // 全フォロワー
  likes: Like[];       // 全いいね
  // メモリに載らない！
}
```

✅ 適切なサイズの集約
```typescript
class User {
  profile: UserProfile;
  // 他は別集約として参照
}
```

## 🧪 動作確認

```bash
# 集約の整合性テスト
pnpm test:domain

# 境界のテスト
pnpm test:integration
```

## 🎯 完成の確認

- [ ] Post集約が適切なサイズ
- [ ] 不変条件が実装されている
- [ ] 集約間はIDで参照
- [ ] トランザクション境界が明確
- [ ] ドメインイベントの準備

## 🚀 次の章へ

```bash
git add .
git commit -m "完了: 第3章 - 集約パターン"
git checkout chapter-4-repository
```

第4章では、リポジトリパターンで永続化を抽象化します。

## 🔗 参考リンク

- [第3回記事：集約 - トランザクション整合性の守護者](../articles/ddd-firebase-sns-part3-revised.md)
- [Effective Aggregate Design](https://www.dddcommunity.org/library/vernon_2011/)
# 🎓 DDD × Firebase SNS ハンズオン - 第2章：エンティティと値オブジェクト

## 📚 この章で学ぶこと

- エンティティと値オブジェクトの本質的な違い
- 同一性と同値性の概念
- 不変性の重要性

## 🎯 学習目標

1. **エンティティの理解**
   - ライフサイクルを持つ
   - IDによる同一性判定
   - 可変の状態

2. **値オブジェクトの理解**
   - 属性による同値性判定
   - 不変性の保証
   - ビジネスロジックの集約

3. **使い分けの判断基準**
   - 設計時の意思決定
   - トレードオフの理解

## 📂 この章のコード構造

```
packages/domain/src/
├── post/
│   ├── Post.ts           # エンティティ
│   ├── PostId.ts         # TODO: 値オブジェクト実装
│   └── PostContent.ts    # TODO: 値オブジェクト実装
├── user/
│   ├── User.ts           # エンティティ
│   ├── UserId.ts         # TODO: 値オブジェクト実装
│   └── Email.ts          # TODO: 値オブジェクト実装
└── shared/
    └── ValueObject.ts    # 値オブジェクト基底クラス
```

## 📝 演習課題

### 課題1：PostId値オブジェクトの実装

`packages/domain/src/post/PostId.ts`を実装してください。

```typescript
// TODO: PostId値オブジェクトを実装
// 要件：
// - 一意性を保証するID
// - 等価性判定メソッド
// - 文字列への変換
```

実装例の骨格：
```typescript
export class PostId {
  constructor(private readonly value: string) {
    // バリデーション
  }
  
  equals(other: PostId): boolean {
    // 等価性判定
  }
  
  toString(): string {
    return this.value;
  }
}
```

### 課題2：Email値オブジェクトの実装

`packages/domain/src/user/Email.ts`を実装してください。

```typescript
// TODO: Email値オブジェクトを実装
// 要件：
// - メールアドレスの形式検証
// - 正規化（小文字化）
// - ドメイン部分の取得
```

考慮すべきビジネスロジック：
- 有効なメールアドレス形式か？
- 同じメールアドレスの判定（大文字小文字を区別しない）
- ドメインによる制限（例：企業ドメインのみ許可）

### 課題3：PostContent値オブジェクトの実装

```typescript
// TODO: PostContent値オブジェクトを実装
// 要件：
// - テキストと画像URLを管理
// - 文字数制限（300文字）
// - ハッシュタグ抽出
// - メンション抽出
```

不変性を保つポイント：
- 新しいインスタンスを返すメソッド
- privateなプロパティ
- 防御的コピー

## 🤔 考えてみよう

### Q1: フォロー関係はエンティティ？値オブジェクト？

```typescript
// 案1：エンティティとして
class FollowRelation {
  constructor(
    private id: string,
    private followerId: string,
    private followeeId: string,
    private createdAt: Date
  ) {}
}

// 案2：値オブジェクトとして
class FollowRelation {
  constructor(
    private followerId: UserId,
    private followeeId: UserId
  ) {}
}
```

判断のポイント：
- フォロー履歴は重要か？
- フォロー解除→再フォローは別物か？
- フォロー日時は必要か？

### Q2: 住所はどう設計する？

```typescript
// 単純な値オブジェクト？
class Address {
  constructor(
    private zip: string,
    private prefecture: string,
    private city: string,
    private street: string
  ) {}
}

// それとも複数の値オブジェクトの組み合わせ？
class Address {
  constructor(
    private zip: ZipCode,
    private prefecture: Prefecture,
    private city: City,
    private street: Street
  ) {}
}
```

## 💡 設計のヒント

### エンティティのチェックリスト

- [ ] 時間とともに変化する？
- [ ] 同じ属性でも別物として扱う必要がある？
- [ ] 履歴を追跡する必要がある？
- [ ] データベースに永続化する？

### 値オブジェクトのチェックリスト

- [ ] 属性が同じなら交換可能？
- [ ] 不変にできる？
- [ ] ビジネスロジックを含む？
- [ ] 再利用される概念？

## 🧪 動作確認

```bash
# TypeScriptのコンパイル確認
pnpm typecheck

# 単体テストの作成と実行
pnpm test
```

## 🎯 完成の確認

- [ ] PostId値オブジェクトが実装されている
- [ ] Email値オブジェクトが実装されている
- [ ] PostContent値オブジェクトが実装されている
- [ ] 不変性が保証されている
- [ ] ビジネスロジックが値オブジェクトに集約されている

## 🚀 次の章へ

```bash
git add .
git commit -m "完了: 第2章 - エンティティと値オブジェクト"
git checkout chapter-3-aggregates
```

第3章では、集約パターンを学び、トランザクション境界を設計します。

## 🔗 参考リンク

- [第2回記事：エンティティと値オブジェクトの本質](../articles/ddd-firebase-sns-part2-revised.md)
- [値オブジェクトのパターン](https://martinfowler.com/bliki/ValueObject.html)
# 🎓 DDD × Firebase SNS ハンズオン - 第1章：ドメインモデルの基礎

## 📚 この章で学ぶこと

- ユビキタス言語の定義
- 境界づけられた文脈の理解
- 最初のドメインモデル実装

## 🎯 学習目標

1. **ユビキタス言語を定義する**
   - チーム全体で使う共通の語彙
   - コードに反映される用語

2. **境界づけられた文脈を識別する**
   - SNSドメインの分割
   - 各文脈の責任範囲

3. **基本的なドメインモデルを実装する**
   - PostとUserの基本形
   - ビジネスルールの表現

## 📂 この章のコード構造

```
packages/
├── domain/
│   └── src/
│       ├── post/       # 投稿ドメイン
│       │   └── Post.ts # TODO: 実装
│       └── user/       # ユーザードメイン
│           └── User.ts # TODO: 実装
```

## 📝 演習課題

### 課題1：ユビキタス言語の定義

以下の用語を定義してください：

| 日本語 | 英語（コード） | 説明 |
|--------|---------------|------|
| 投稿 | Post | ? |
| ユーザー | User | ? |
| いいね | Like | ? |
| フォロー | Follow | ? |

### 課題2：Postエンティティの実装

`packages/domain/src/post/Post.ts`を実装してください。

```typescript
// TODO: Postクラスを実装
// 要件：
// - id, text, imageUrl, authorId, createdAtを持つ
// - textとimageUrlのどちらかは必須
// - textは300文字以内
// - ビジネスルールをコンストラクタで検証
```

ヒント：
```typescript
export class Post {
  private constructor(
    // プロパティを定義
  ) {
    // バリデーション
  }
  
  static create(args: {
    // 引数を定義
  }): Post {
    // インスタンス生成
  }
}
```

### 課題3：境界づけられた文脈の識別

SNSドメインをどのように分割するか考えてください：

1. **投稿文脈（Content Context）**
   - 責任：?
   - 含まれる概念：?

2. **ユーザー文脈（Identity Context）**
   - 責任：?
   - 含まれる概念：?

3. **ソーシャル文脈（Social Context）**
   - 責任：?
   - 含まれる概念：?

## 🧪 動作確認

```bash
# TypeScriptのコンパイル確認
pnpm typecheck

# テストの実行（まだテストはありません）
pnpm test
```

## 💡 ヒント

### ドメインモデルの設計原則

1. **ビジネスルールを中心に考える**
   - データベースの構造ではなく、ビジネスの制約から始める

2. **不正な状態を作れないようにする**
   - コンストラクタでバリデーション
   - 不変条件を守る

3. **ユビキタス言語を使う**
   - コードと会話で同じ言葉を使う

### よくある間違い

❌ データから設計を始める
```typescript
interface PostData {
  id: string;
  text: string;
  // これはただのデータ構造
}
```

✅ ビジネスルールから設計を始める
```typescript
class Post {
  static create(text: string): Post {
    if (!text) throw new Error('投稿内容は必須');
    // ビジネスルールを表現
  }
}
```

## 🎯 完成の確認

以下ができていれば、この章は完了です：

- [ ] Postクラスが実装されている
- [ ] ビジネスルールが検証される
- [ ] TypeScriptの型チェックが通る
- [ ] ユビキタス言語が定義されている

## 🚀 次の章へ

第1章が完了したら、第2章へ進みましょう！

```bash
git add .
git commit -m "完了: 第1章 - ドメインモデルの基礎"
git checkout chapter-2-entities-vo
```

第2章では、エンティティと値オブジェクトの違いを深く学びます。

## 🔗 参考リンク

- [第1回記事：なぜDDDなのか？](../articles/ddd-firebase-sns-part1-revised.md)
- [ドメイン駆動設計をはじめよう](https://www.amazon.co.jp/dp/479813161X) - 第1章〜第3章
---
title: "【TypeScript設計】第3章 - カプセル化の基礎（値オブジェクト）"
emoji: "💊"
type: "tech"
topics: ["typescript", "vue", "設計", "リファクタリング", "ddd"]
published: false
---

## はじめに

この章では、**カプセル化の実践的な手法**を学びます。
データとロジックを同じ場所に配置することで、バグを防ぎ、変更に強い設計を実現します。

**対象読者**: TypeScript/Vueの基礎は理解しており、実務での設計改善に関心がある中級者以上

**この章のゴール**: カプセル化の7つの原則を理解し、値オブジェクトを実装できるようになる

---

## カプセル化とは

**カプセル化** = データとそのデータを操作するロジックをひとつにまとめること

クラスがカプセル化の基本構成単位となります。クラスよりも小さな構成単位はメソッドなどがありますが、クラスを扱い方次第で条件や要変更や思わぬ副作用を生み出します。

---

## 原則1: クラス単体で正常に動作するよう設計する

### データクラスは単体で正常動作が困難

第1章で見たデータクラスの問題を復習：

```typescript
// ❌ データクラス（単体で正常動作しない）
class Money {
  amount: number = 0
  currency: string = ''
}

// どこか別の場所でロジックを実装
function add(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error('通貨単位が異なります')
  }
  const result = new Money()
  result.amount = a.amount + b.amount
  result.currency = a.currency
  return result
}
```

**問題点**:
- インスタンス変数を操作するロジックが別の場所にある
- 完全性を保証するロジックが散らばる（重複コード）
- Moneyクラス単体では正常動作しない

### ドメインモデルの完全性

**ドメインモデルの完全性** = データとそのデータを操作するロジックをクラスにひとつにまとめることで、完全性を保証するという考え方

```typescript
// ✅ 完全性を保証するクラス
class Money {
  private readonly _amount: number
  private readonly _currency: string

  private constructor(amount: number, currency: string) {
    // 完全性の保証（バリデーション）
    if (amount < 0) {
      throw new Error('金額は0以上を指定してください')
    }
    if (!currency) {
      throw new Error('通貨単位を指定してください')
    }

    this._amount = amount
    this._currency = currency
  }

  static create(amount: number, currency: string): Money {
    return new Money(amount, currency)
  }

  get amount(): number {
    return this._amount
  }

  get currency(): string {
    return this._currency
  }

  // 加算ロジックもMoneyクラスに配置
  add(other: Money): Money {
    if (this._currency !== other._currency) {
      throw new Error('通貨単位が異なります')
    }
    return new Money(this._amount + other._amount, this._currency)
  }
}
```

**改善ポイント**:
- ✅ バリデーションがコンストラクタに集約
- ✅ 計算ロジック（add）がMoneyクラス内にある
- ✅ Moneyクラス単体で正常動作する

---

## 原則2: コンストラクタで確実に正常値を設定する

### ❌ デフォルトコンストラクタを使う（生焼けオブジェクト）

```typescript
class Money {
  amount: number = 0
  currency: string = ''
}

const money = new Money()
// 未初期化状態！（生焼けオブジェクト）
```

### ✅ 完全コンストラクタを使う

```typescript
class Money {
  private readonly _amount: number
  private readonly _currency: string

  private constructor(amount: number, currency: string) {
    // バリデーション
    if (amount < 0) {
      throw new Error('金額は0以上を指定してください')
    }
    if (!currency) {
      throw new Error('通貨単位を指定してください')
    }

    this._amount = amount
    this._currency = currency
  }

  // ファクトリメソッド
  static create(amount: number, currency: string): Money {
    return new Money(amount, currency)
  }
}

// 使用例
const money = Money.create(100, 'JPY')  // 必ず正常値
```

**完全コンストラクタ** = 不正状態から防御するための設計パターン

---

## 原則3: 計算ロジックをデータ保持側に寄せる

### ❌ 計算ロジックが別クラスにある

```typescript
class Money {
  amount: number
  currency: string
}

// 別のクラスに計算ロジック
class MoneyCalculator {
  add(a: Money, b: Money): void {
    a.amount += b.amount  // Moneyの内部を直接操作
  }
}
```

**問題点**:
- Moneyクラス自体は計算方法を持たない
- 同じロジックが複数箇所に重複する可能性

### ✅ 計算ロジックをMoneyクラスに配置

```typescript
class Money {
  private readonly _amount: number
  private readonly _currency: string

  // 加算ロジック
  add(other: Money): Money {
    if (this._currency !== other._currency) {
      throw new Error('通貨単位が異なります')
    }
    return new Money(this._amount + other._amount, this._currency)
  }
}
```

**改善ポイント**:
- ✅ 金額計算はMoneyクラスに集約
- ✅ 重複コードが発生しない

---

## 原則4: 不変（イミュータブル）で妨害を防ぐ

### ❌ 変更可能（ミュータブル）な設計

```typescript
class Money {
  amount: number  // 変更可能

  constructor(amount: number) {
    this.amount = amount
  }
}

const money = new Money(100)
money.amount = -100  // ❌ 不正な値を設定できてしまう

// 別の場所で意図せず変更される
function specialServiceAdded(money: Money) {
  money.amount += 1000  // 副作用！
}
```

**問題点**:
- インスタンス変数が外部から変更される
- 不正な値が混入する可能性

### ✅ 不変（イミュータブル）な設計

```typescript
class Money {
  private readonly _amount: number  // readonly で変更不可
  private readonly _currency: string

  private constructor(amount: number, currency: string) {
    if (amount < 0) {
      throw new Error('金額は0以上を指定してください')
    }
    this._amount = amount
    this._currency = currency
  }

  static create(amount: number, currency: string): Money {
    return new Money(amount, currency)
  }

  get amount(): number {
    return this._amount  // 読み取り専用
  }
}

const money = Money.create(100, 'JPY')
// money._amount = -100  // ❌ コンパイルエラー！変更不可
```

**改善ポイント**:
- ✅ `readonly` で変更を防止
- ✅ 不正な値の混入を防ぐ
- ✅ 副作用が発生しない

### TypeScriptでのイミュータブル実装

```typescript
// readonly を活用
class Money {
  private readonly _amount: number
  private readonly _currency: string

  // ... constructor

  // Getterで値を公開（変更は不可）
  get amount(): number {
    return this._amount
  }
}
```

---

## 原則5: 変更したい値は新しいインスタンスを作成する

イミュータブルな設計では、値を変更する代わりに**新しいインスタンスを返す**。

### ✅ 新しいインスタンスを返す

```typescript
class Money {
  private readonly _amount: number
  private readonly _currency: string

  private constructor(amount: number, currency: string) {
    if (amount < 0) {
      throw new Error('金額は0以上を指定してください')
    }
    this._amount = amount
    this._currency = currency
  }

  static create(amount: number, currency: string): Money {
    return new Money(amount, currency)
  }

  // 加算した結果を新しいインスタンスで返す
  add(other: Money): Money {
    if (this._currency !== other._currency) {
      throw new Error('通貨単位が異なります')
    }
    const added = this._amount + other._amount
    return new Money(added, this._currency)  // 新しいインスタンス
  }

  get amount(): number {
    return this._amount
  }
}

// 使用例
const money1 = Money.create(100, 'JPY')
const money2 = Money.create(200, 'JPY')
const total = money1.add(money2)  // 新しいインスタンス

console.log(money1.amount)  // 100（変更されていない）
console.log(total.amount)   // 300
```

**メリット**:
- 元のインスタンスが変更されない
- 副作用がなく、予測可能
- バグが発生しにくい

---

## 原則6: メソッド引数やローカル変数にもfinalを付ける（TypeScriptでは注意が必要）

### Javaの場合

```java
class Money {
  Money add(final Money other) {  // final 引数
    final int added = amount + other.amount;  // final ローカル変数
    return new Money(added, currency);
  }
}
```

### TypeScriptの場合

TypeScriptには引数やローカル変数に `readonly` を付ける機能がない。
代わりに、**constを活用**する。

```typescript
class Money {
  add(other: Money): Money {  // 引数にreadonlyは付けられない
    // ローカル変数はconstを使う
    const added = this._amount + other._amount
    return new Money(added, this._currency)
  }
}
```

**TypeScriptでのベストプラクティス**:
- ❌ `let` で引数を再代入しない
- ✅ ローカル変数は `const` を使う

```typescript
// ❌ 引数を再代入しない
function doSomething(value: number) {
  value = 100  // 再代入（避けるべき）
}

// ✅ constを使う
function doSomething(value: number) {
  const newValue = value + 100  // 新しい変数
}
```

---

## 原則7: 「値の渡し間違い」を型で防止する

### ❌ プリミティブ型のまま使う

```typescript
class Money {
  private readonly _amount: number
  private readonly _currency: string

  // ...
}

// 引数の順序を間違える可能性
const money = Money.create('JPY', 100)  // ❌ 順序が逆！
```

**問題点**:
- `number` と `string` を逆に渡してもコンパイルエラーにならない
- 実行時エラーになる

### ✅ ブランド型で型安全性を確保

```typescript
// ブランド型で型レベルでの区別を保証
type Amount = number & { readonly __brand: 'Amount' }
type Currency = string & { readonly __brand: 'Currency' }

function createAmount(value: number): Amount {
  if (value < 0) {
    throw new Error('金額は0以上を指定してください')
  }
  return value as Amount
}

function createCurrency(value: string): Currency {
  if (!value) {
    throw new Error('通貨単位を指定してください')
  }
  return value as Currency
}

class Money {
  private readonly _amount: Amount
  private readonly _currency: Currency

  private constructor(amount: Amount, currency: Currency) {
    this._amount = amount
    this._currency = currency
  }

  static create(amount: Amount, currency: Currency): Money {
    return new Money(amount, currency)
  }

  // ...
}

// 使用例
const amount = createAmount(100)
const currency = createCurrency('JPY')
const money = Money.create(amount, currency)

// ❌ コンパイルエラー！型が違う
// const wrongMoney = Money.create(currency, amount)
```

**改善ポイント**:
- ✅ 型レベルで間違いを防ぐ
- ✅ コンパイル時にエラーを検出
- ✅ 実行時エラーを未然に防ぐ

### より実践的なアプローチ（オブジェクトで渡す）

```typescript
interface MoneyParams {
  amount: number
  currency: string
}

class Money {
  private readonly _amount: number
  private readonly _currency: string

  private constructor(params: MoneyParams) {
    if (params.amount < 0) {
      throw new Error('金額は0以上を指定してください')
    }
    this._amount = params.amount
    this._currency = params.currency
  }

  static create(params: MoneyParams): Money {
    return new Money(params)
  }
}

// 使用例（名前付き引数のように使える）
const money = Money.create({
  amount: 100,
  currency: 'JPY'
})
```

**メリット**:
- ✅ 引数の順序を間違えない
- ✅ 可読性が高い
- ✅ 後から引数を追加しやすい

---

## 値オブジェクト（Value Object）パターン

これまでの原則を全て適用したクラスを**値オブジェクト**と呼びます。

### 完全な値オブジェクトの実装例

```typescript
/**
 * 金額を表現する値オブジェクト
 */
class Money {
  private readonly _amount: number
  private readonly _currency: string

  // 1. private constructorで外部からのnewを防ぐ
  private constructor(amount: number, currency: string) {
    // 2. コンストラクタでバリデーション
    if (amount < 0) {
      throw new Error('金額は0以上を指定してください')
    }
    if (!currency) {
      throw new Error('通貨単位を指定してください')
    }

    // 3. readonlyで不変性を保証
    this._amount = amount
    this._currency = currency
  }

  // ファクトリメソッド
  static create(amount: number, currency: string): Money {
    return new Money(amount, currency)
  }

  // Getter（読み取り専用）
  get amount(): number {
    return this._amount
  }

  get currency(): string {
    return this._currency
  }

  // 4. 計算ロジックをクラス内に配置
  add(other: Money): Money {
    // 通貨単位のチェック
    if (this._currency !== other._currency) {
      throw new Error('通貨単位が異なります')
    }

    // 5. 新しいインスタンスを返す（イミュータブル）
    return new Money(this._amount + other._amount, this._currency)
  }

  multiply(times: number): Money {
    if (times < 0) {
      throw new Error('倍数は0以上を指定してください')
    }
    return new Money(this._amount * times, this._currency)
  }

  // 等価性の判定
  equals(other: Money): boolean {
    return (
      this._amount === other._amount &&
      this._currency === other._currency
    )
  }
}

// 使用例
const price = Money.create(1000, 'JPY')
const quantity = 3
const total = price.multiply(quantity)

console.log(total.amount)  // 3000
console.log(total.currency)  // JPY
```

---

## TypeScript関数型アプローチ

クラスを使わない場合でも、同じ設計原則を適用できます。

```typescript
// ブランド型で型安全性を確保
type Money = {
  readonly amount: number
  readonly currency: string
  readonly __brand: 'Money'
}

// ファクトリ関数
function createMoney(amount: number, currency: string): Money {
  // バリデーション
  if (amount < 0) {
    throw new Error('金額は0以上を指定してください')
  }
  if (!currency) {
    throw new Error('通貨単位を指定してください')
  }

  return {
    amount,
    currency,
    __brand: 'Money'
  }
}

// 計算ロジック関数
function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error('通貨単位が異なります')
  }

  return createMoney(a.amount + b.amount, a.currency)
}

function multiplyMoney(money: Money, times: number): Money {
  if (times < 0) {
    throw new Error('倍数は0以上を指定してください')
  }

  return createMoney(money.amount * times, money.currency)
}

// 使用例
const price = createMoney(1000, 'JPY')
const total = multiplyMoney(price, 3)

console.log(total.amount)  // 3000
```

**ポイント**:
- ✅ イミュータブル（readonly）
- ✅ ファクトリ関数でバリデーション
- ✅ ブランド型で型安全性
- ✅ 計算ロジックは専用関数

---

## Vue Composableでの実践例

```typescript
// composables/useMoney.ts
import { ref, computed, readonly } from 'vue'

interface MoneyState {
  amount: number
  currency: string
}

export function useMoney(initialAmount: number, initialCurrency: string) {
  // バリデーション
  if (initialAmount < 0) {
    throw new Error('金額は0以上を指定してください')
  }
  if (!initialCurrency) {
    throw new Error('通貨単位を指定してください')
  }

  // 内部状態（外部から直接変更不可）
  const state = ref<MoneyState>({
    amount: initialAmount,
    currency: initialCurrency
  })

  // 読み取り専用のcomputed
  const amount = computed(() => state.value.amount)
  const currency = computed(() => state.value.currency)

  // 加算（新しいインスタンスを返す代わりに、新しいComposableを返す）
  const add = (otherAmount: number, otherCurrency: string) => {
    if (state.value.currency !== otherCurrency) {
      throw new Error('通貨単位が異なります')
    }

    return useMoney(
      state.value.amount + otherAmount,
      state.value.currency
    )
  }

  // 乗算
  const multiply = (times: number) => {
    if (times < 0) {
      throw new Error('倍数は0以上を指定してください')
    }

    return useMoney(
      state.value.amount * times,
      state.value.currency
    )
  }

  return {
    amount,
    currency,
    add,
    multiply
  }
}
```

```vue
<!-- 使用例 -->
<script setup lang="ts">
import { useMoney } from '@/composables/useMoney'

const price = useMoney(1000, 'JPY')
const total = price.multiply(3)
</script>

<template>
  <div>
    <p>単価: {{ price.amount }}{{ price.currency }}</p>
    <p>合計: {{ total.amount }}{{ total.currency }}</p>
  </div>
</template>
```

---

## 悪魔退治の効果を検証

### データクラスと値オブジェクトの比較

| 観点 | データクラス | 値オブジェクト |
|------|------------|--------------|
| 重複コード | 計算ロジックが各所に散らばる | Moneyクラスに集約される |
| 修正漏れ | 重複コードの修正漏れが発生 | 1箇所の修正で完了 |
| 可読性 | デバッグ時、各所を探し回る必要がある | Moneyクラスを見るだけで済む |
| 生焼けオブジェクト | コンストラクタでインスタンス変数を未初期化のまま生成できてしまう | private constructor + ファクトリメソッドで防止 |
| 不正値の混入 | 不正値をガード節で判定し、インスタンス変数をfinal修飾子で不変にすることで、不正値が混入しないようにできた | コンストラクタでバリデーション |
| 思わぬ副作用 | final修飾子で不変にすることで副作用が解消された | readonly で不変性を保証 |
| 値の渡し間違い | 引数をMoney型にすることで、算出の型を区別できるようになった | ブランド型で型安全性を確保 |

### クラスの設計方針まとめ

**データとそのデータを操作するロジックをクラスにひとつにまとめる**ことで、悪魔を退治できる。

- ✅ インスタンス変数（データ）
- ✅ 完全性を保証するようにインスタンス変数を操作するメソッド（ロジック）

---

## 設計パターン

### 完全コンストラクタ

**完全コンストラクタ** = 不正状態から防御するための設計パターン

```typescript
class Money {
  private constructor(amount: number, currency: string) {
    // バリデーション
    if (amount < 0) {
      throw new Error('金額は0以上を指定してください')
    }
    if (!currency) {
      throw new Error('通貨単位を指定してください')
    }

    this._amount = amount
    this._currency = currency
  }
}
```

### 値オブジェクト

**値オブジェクト** = アプリケーションで扱う値に関するロジックをカプセル化した、概念を表すオブジェクト

特徴：
- 金額、日付、注文数など、さまざまな値を扱う
- 完全コンストラクタを用いる
- 金額計算のようなドメイン固有のロジックをカプセル化する

---

## まとめ: カプセル化の7つの原則

### 1. クラス単体で正常に動作するよう設計する
- ドメインモデルの完全性を保証
- データとロジックをクラスにまとめる

### 2. コンストラクタで確実に正常値を設定する
- 完全コンストラクタパターン
- private constructor + ファクトリメソッド

### 3. 計算ロジックをデータ保持側に寄せる
- Moneyクラスに金額計算を配置
- 重複コードを防ぐ

### 4. 不変（イミュータブル）で妨害を防ぐ
- `readonly` で変更を防止
- 副作用を防ぐ

### 5. 変更したい値は新しいインスタンスを作成する
- イミュータブルな設計
- 元のインスタンスを変更しない

### 6. メソッド引数やローカル変数にもfinalを付ける
- TypeScriptでは `const` を活用
- 再代入を防ぐ

### 7. 「値の渡し間違い」を型で防止する
- ブランド型で型安全性を確保
- オブジェクトで名前付き引数のように使う

---

## 実務での適用ポイント

### 値オブジェクトを作るべき場面

以下のような「値」は値オブジェクトとして実装する：

- ✅ 金額（Money）
- ✅ 日付（Date）
- ✅ 注文数（Quantity）
- ✅ メールアドレス（Email）
- ✅ 電話番号（PhoneNumber）
- ✅ 郵便番号（PostalCode）

### 値オブジェクトのメリット

1. **バリデーションが1箇所に集約**
   - 各所でバリデーションを書かなくて良い
   - 修正漏れが発生しない

2. **型安全性**
   - プリミティブ型では防げない間違いを防ぐ
   - `number` ではなく `Money` として扱う

3. **ドメインロジックの集約**
   - 金額計算はMoneyクラスに集約
   - ビジネスルールが明確になる

### コードレビューでのチェックリスト

- [ ] データクラスになっていないか？
- [ ] コンストラクタでバリデーションしているか？
- [ ] `readonly` で不変性を保証しているか？
- [ ] 新しいインスタンスを返しているか？
- [ ] 計算ロジックがクラス内にあるか？

---

次章では、さらに実践的な設計パターンとリファクタリング手法を学びます。

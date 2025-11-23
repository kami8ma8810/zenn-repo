---
title: "【TypeScript設計】第1章 - 変更容易性を下げる3つの悪魔"
emoji: "👹"
type: "tech"
topics: ["typescript", "vue", "設計", "リファクタリング"]
published: false
---

## はじめに

この記事は「良いコード・悪いコードで学ぶ設計入門」をTypeScript/Vue向けに実践的に読み替えたシリーズです。

**対象読者**: TypeScript/Vueの基礎は理解しており、実務での設計改善に関心がある中級者以上

**この章のゴール**: 変更容易性を下げる悪しき構造を知覚し、設計改善の必要性を理解する

---

## 変更容易性とは

変更容易性 = **バグを発生させず、どれだけ速く正確にコード変更できるか**

### 変更容易性が低いコードの特徴

- コードを読み解くのに時間がかかる
- バグを埋め込みやすい
- 悪しき構造がさらに悪しき構造を誘発する

---

## 悪魔1: 意味不明な命名

### ❌ 技術駆動命名

```typescript
// 何をしているのか全く分からない
class MemoryStateManager {
  private intValue01: number = 0

  changeIntValue01(changeValue: number): void {
    this.intValue01 -= changeValue
    if (this.intValue01 < 0) {
      this.intValue01 = 0
      this.updateState02Flag()
    }
  }

  private updateState02Flag(): void {
    // ...
  }
}
```

**問題点**:
- `intValue01`, `State02Flag` などの技術用語・型名・連番による命名
- ドメイン知識がコードに反映されていない
- 別途ドキュメントが必要になり、ドキュメントと実装が乖離する

### ✅ ドメイン駆動命名

```typescript
// ドメイン知識を反映した命名
class HitPointManager {
  private currentHitPoint: number = 100

  takeDamage(damage: number): void {
    this.currentHitPoint -= damage
    if (this.currentHitPoint < 0) {
      this.currentHitPoint = 0
      this.updateDeadState()
    }
  }

  private updateDeadState(): void {
    // 戦闘不能状態に更新
  }
}
```

**改善ポイント**:
- `HitPoint`, `takeDamage`, `Dead` などビジネスドメインの用語を使用
- コードを読むだけで仕様が理解できる
- ドキュメントなしでも意図が伝わる

### Vue Composableでの実践例

```typescript
// composables/useHitPoint.ts
export function useHitPoint(maxHitPoint: number) {
  const currentHitPoint = ref(maxHitPoint)
  const isDead = computed(() => currentHitPoint.value <= 0)

  const takeDamage = (damage: number) => {
    currentHitPoint.value = Math.max(0, currentHitPoint.value - damage)
  }

  const heal = (amount: number) => {
    currentHitPoint.value = Math.min(maxHitPoint, currentHitPoint.value + amount)
  }

  return {
    currentHitPoint: readonly(currentHitPoint),
    isDead,
    takeDamage,
    heal
  }
}
```

---

## 悪魔2: 条件分岐のネスト

### ❌ 深いネスト

```typescript
// RPGの魔法発動条件
function castMagic(member: Member, magic: Magic): void {
  // 生存しているか判定
  if (member.hitPoint > 0) {
    // 行動可能かを判定
    if (member.canAct()) {
      // 魔法力が残存しているかを判定
      if (magic.costMagicPoint <= member.magicPoint) {
        member.consumeMagicPoint(magic.costMagicPoint)
        member.chant(magic)
      }
    }
  }
}
```

**問題点**:
- if文が3重にネスト
- どこからどこまでが処理範囲か読み解くのが困難
- さらに深くなると可読性が著しく低下

**最悪の例** (実際に存在するコード):
```typescript
if (条件) {
  // 数十〜数百行の処理
  if (条件) {
    // 数十〜数百行の処理
    if (条件) {
      // 数十〜数百行の処理
      if (条件) {
        // 数十〜数百行の処理
      }
    }
  }
}
```

### ✅ ガード節による早期リターン

```typescript
function castMagic(member: Member, magic: Magic): void {
  // ガード節: 不正な条件で早期リターン
  if (member.hitPoint <= 0) return
  if (!member.canAct()) return
  if (magic.costMagicPoint > member.magicPoint) return

  // 本来の処理（ネストなし）
  member.consumeMagicPoint(magic.costMagicPoint)
  member.chant(magic)
}
```

**改善ポイント**:
- ネストが消えて処理の流れが一直線
- 異常系を先に処理し、正常系がフラットに書ける
- 可読性が劇的に向上

### TypeScriptの型ガードを活用

```typescript
// 型ガードで型安全性も確保
function castMagic(member: Member | null, magic: Magic | null): void {
  // 型ガード + 早期リターン
  if (!member || !magic) return
  if (member.hitPoint <= 0) return
  if (!member.canAct()) return
  if (magic.costMagicPoint > member.magicPoint) return

  // この時点で member と magic は non-null が保証されている
  member.consumeMagicPoint(magic.costMagicPoint)
  member.chant(magic)
}
```

---

## 悪魔3: データクラス（最も危険）

データクラスは**データのみを保持し、ロジックを持たないクラス**。
一見シンプルだが、多くの悪魔を招く。

### ❌ データクラスの典型例

```typescript
// データのみを持つクラス
class ContractAmount {
  amountIncludingTax: number = 0  // 税込み金額
  salesTaxRate: number = 0.1       // 消費税率
}

// 別のクラスでロジックを実装
class ContractManager {
  contractAmount: ContractAmount | null = null

  // 税込み金額を計算
  calculateAmountIncludingTax(
    amountExcludingTax: number,
    salesTaxRate: number
  ): number {
    return Math.floor(amountExcludingTax * (1 + salesTaxRate))
  }

  conclude(amountExcludingTax: number, salesTaxRate: number): void {
    const amountIncludingTax = this.calculateAmountIncludingTax(
      amountExcludingTax,
      salesTaxRate
    )
    this.contractAmount = new ContractAmount()
    this.contractAmount.amountIncludingTax = amountIncludingTax
    this.contractAmount.salesTaxRate = salesTaxRate
  }
}
```

### データクラスが招く5つの悪魔

#### 1. 重複コード

計算ロジックが各所に散らばる：

```typescript
// ファイル1: ContractManager.ts
calculateAmountIncludingTax(amount: number, rate: number): number {
  return Math.floor(amount * (1 + rate))
}

// ファイル2: InvoiceService.ts
calculateTaxIncluded(amount: number, rate: number): number {
  return Math.floor(amount * (1 + rate))  // 重複！
}

// ファイル3: EstimateService.ts
calcWithTax(amount: number, rate: number): number {
  return Math.floor(amount * (1 + rate))  // 重複！
}

// ... 数十箇所に同じロジックが散在
```

**なぜ重複が発生するのか**:
- データと計算ロジックが離れているため、既存のロジックに気づかない
- 「この機能は未実装だ」と誤解して再実装してしまう

#### 2. 修正漏れ

消費税率の変更時に全ての重複箇所を修正する必要がある：

```typescript
// 修正したつもりが...
// ファイル1: 修正済み ✅
// ファイル2: 修正漏れ ❌
// ファイル3: 修正漏れ ❌
// ... 数十箇所のうち、いくつか修正漏れが発生
```

**実際の事例**:
著者が遭遇したケースでは、消費税関連のロジックが数十箇所に重複しており、
仕様変更時に何度も「修正漏れ」の障害報告が上がってきた。

#### 3. 可読性低下

関連するコードが分散しているため、全体を把握するのに膨大な時間がかかる。

#### 4. 未初期化状態（生焼けオブジェクト）

```typescript
// 初期化せずに使用すると...
const amount = new ContractAmount()
console.log(amount.salesTaxRate.toString())  // ❌ エラー！ or 不正な値
```

**TypeScriptでも発生する問題**:
```typescript
interface ContractAmount {
  amountIncludingTax?: number  // optional なので undefined の可能性
  salesTaxRate?: number
}

const amount: ContractAmount = {}
const rate = amount.salesTaxRate  // undefined かもしれない
```

#### 5. 不正値の混入

```typescript
const amount = new ContractAmount()
amount.salesTaxRate = -0.1  // ❌ 負の税率！でもエラーにならない
amount.amountIncludingTax = -1000  // ❌ 負の金額！
```

### ✅ カプセル化による解決

データとロジックを同じクラスに持たせる：

```typescript
// Value Objectパターン
class ContractAmount {
  private readonly _amountIncludingTax: number
  private readonly _salesTaxRate: number

  private constructor(amountIncludingTax: number, salesTaxRate: number) {
    // バリデーション（不正値の防止）
    if (amountIncludingTax < 0) {
      throw new Error('金額は0以上である必要があります')
    }
    if (salesTaxRate < 0 || salesTaxRate > 1) {
      throw new Error('消費税率は0〜1の範囲である必要があります')
    }

    this._amountIncludingTax = amountIncludingTax
    this._salesTaxRate = salesTaxRate
  }

  // ファクトリメソッド（未初期化状態の防止）
  static fromExcludingTax(
    amountExcludingTax: number,
    salesTaxRate: number
  ): ContractAmount {
    const amountIncludingTax = Math.floor(
      amountExcludingTax * (1 + salesTaxRate)
    )
    return new ContractAmount(amountIncludingTax, salesTaxRate)
  }

  // Getter（データの保護）
  get amountIncludingTax(): number {
    return this._amountIncludingTax
  }

  get salesTaxRate(): number {
    return this._salesTaxRate
  }

  // ビジネスロジックもここに集約
  add(other: ContractAmount): ContractAmount {
    // 税率が異なる場合はエラー
    if (this._salesTaxRate !== other._salesTaxRate) {
      throw new Error('税率が異なる金額は加算できません')
    }
    return new ContractAmount(
      this._amountIncludingTax + other._amountIncludingTax,
      this._salesTaxRate
    )
  }
}

// 使用例
const amount1 = ContractAmount.fromExcludingTax(1000, 0.1)  // 1100円
const amount2 = ContractAmount.fromExcludingTax(2000, 0.1)  // 2200円
const total = amount1.add(amount2)  // 3300円

console.log(total.amountIncludingTax)  // 3300
```

**改善ポイント**:
1. ✅ **重複コード解消**: 計算ロジックが1箇所に集約
2. ✅ **修正漏れ防止**: 変更箇所が1つだけ
3. ✅ **可読性向上**: 関連するコードが1つのクラスにまとまっている
4. ✅ **未初期化防止**: private constructor + ファクトリメソッド
5. ✅ **不正値防止**: コンストラクタでバリデーション

### TypeScript関数型アプローチ

クラスを使わない場合でも、同様の設計原則を適用できる：

```typescript
// ブランド型で型安全性を確保
type ContractAmount = {
  readonly amountIncludingTax: number
  readonly salesTaxRate: number
  readonly __brand: 'ContractAmount'  // nominal typing
}

// ファクトリ関数
function createContractAmount(
  amountExcludingTax: number,
  salesTaxRate: number
): ContractAmount {
  // バリデーション
  if (amountExcludingTax < 0) {
    throw new Error('金額は0以上である必要があります')
  }
  if (salesTaxRate < 0 || salesTaxRate > 1) {
    throw new Error('消費税率は0〜1の範囲である必要があります')
  }

  return {
    amountIncludingTax: Math.floor(amountExcludingTax * (1 + salesTaxRate)),
    salesTaxRate,
    __brand: 'ContractAmount'
  }
}

// ビジネスロジック関数
function addContractAmount(
  a: ContractAmount,
  b: ContractAmount
): ContractAmount {
  if (a.salesTaxRate !== b.salesTaxRate) {
    throw new Error('税率が異なる金額は加算できません')
  }

  return {
    amountIncludingTax: a.amountIncludingTax + b.amountIncludingTax,
    salesTaxRate: a.salesTaxRate,
    __brand: 'ContractAmount'
  }
}

// 使用例
const amount1 = createContractAmount(1000, 0.1)
const amount2 = createContractAmount(2000, 0.1)
const total = addContractAmount(amount1, amount2)
```

### Vue Composableでの実践例

```typescript
// composables/useContractAmount.ts
import { ref, computed, readonly } from 'vue'

interface ContractAmountState {
  amountIncludingTax: number
  salesTaxRate: number
}

export function useContractAmount(
  amountExcludingTax: number,
  salesTaxRate: number
) {
  // バリデーション
  if (amountExcludingTax < 0) {
    throw new Error('金額は0以上である必要があります')
  }
  if (salesTaxRate < 0 || salesTaxRate > 1) {
    throw new Error('消費税率は0〜1の範囲である必要があります')
  }

  // 内部状態（外部から直接変更不可）
  const state = ref<ContractAmountState>({
    amountIncludingTax: Math.floor(amountExcludingTax * (1 + salesTaxRate)),
    salesTaxRate
  })

  // 読み取り専用のcomputed
  const amountIncludingTax = computed(() => state.value.amountIncludingTax)
  const salesTaxRate = computed(() => state.value.salesTaxRate)

  // ビジネスロジック
  const add = (other: ContractAmountState) => {
    if (state.value.salesTaxRate !== other.salesTaxRate) {
      throw new Error('税率が異なる金額は加算できません')
    }

    state.value = {
      amountIncludingTax: state.value.amountIncludingTax + other.amountIncludingTax,
      salesTaxRate: state.value.salesTaxRate
    }
  }

  return {
    amountIncludingTax,
    salesTaxRate,
    add
  }
}
```

```vue
<!-- 使用例 -->
<script setup lang="ts">
import { useContractAmount } from '@/composables/useContractAmount'

const amount = useContractAmount(1000, 0.1)
</script>

<template>
  <div>
    <p>税込金額: {{ amount.amountIncludingTax }}円</p>
    <p>消費税率: {{ (amount.salesTaxRate * 100).toFixed(1) }}%</p>
  </div>
</template>
```

---

## まとめ: 悪魔退治の基本

### 悪魔を知覚する

設計改善の第一歩は、**悪しき構造の弊害を知覚すること**。

1. **意味不明な命名** → コードの意図が伝わらない
2. **条件分岐のネスト** → 可読性が著しく低下
3. **データクラス** → 5つの悪魔を招く

### 悪魔退治の武器

**カプセル化** = データとロジックを同じ場所に配置する

TypeScript/Vueでは以下のアプローチが有効：

1. **クラスベース**: Value Object パターン
2. **関数型**: ファクトリ関数 + ブランド型
3. **Vue**: Composable でカプセル化

### 設計の原則

- ✅ ドメイン駆動命名
- ✅ ガード節による早期リターン
- ✅ データとロジックの同居（カプセル化）
- ✅ 不正値の防止（バリデーション）
- ✅ 未初期化状態の防止（ファクトリパターン）

---

## 実務での適用ポイント

### 既存コードのリファクタリング

データクラスを見つけたら：

1. **影響範囲を調査**: そのデータを使っているロジックを全て洗い出す
2. **重複コードを特定**: 同じ計算ロジックが複数箇所にないか確認
3. **段階的にカプセル化**: 一度に全て変更せず、小さく始める

### 新規実装時の心がけ

- ❌ 「とりあえずデータクラスを作る」をやめる
- ✅ 「このデータにどんなロジックが必要か」を先に考える
- ✅ データとロジックをセットで設計する

### チーム開発での注意

- コードレビューで「データクラスになっていないか」をチェック
- 「同じようなロジックがないか」を常に確認
- 命名規約を統一し、ドメイン用語を使う

---

次章では、さらに具体的な設計パターンとリファクタリング手法を学びます。

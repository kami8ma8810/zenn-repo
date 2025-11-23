---
title: "【TypeScript設計】第2章 - 設計の初歩（変数・関数・クラス）"
emoji: "🔰"
type: "tech"
topics: ["typescript", "vue", "設計", "リファクタリング"]
published: false
---

## はじめに

この章では、変数・関数・クラスといった小さな単位の設計を通じて、**変更容易性を高める設計の基本**を学びます。

**対象読者**: TypeScript/Vueの基礎は理解しており、実務での設計改善に関心がある中級者以上

**この章のゴール**: 小さな単位での設計原則を理解し、実践できるようになる

---

## 原則1: 省略せず、意図が伝わる名前を設計する

### ❌ 省略形の名前

```typescript
// ダメージ計算ロジック（らしい）
let d = 0
d = p1 + p2
d = d - ((d1 + d2) / 2)
if (d < 0) {
  d = 0
}
```

**何が問題か**:
- `d`, `p1`, `p2`, `d1`, `d2` が何を表すのか全く分からない
- コメントやドキュメントを見ないと理解できない
- タイピング時間はわずかに減るが、読解時間が何倍にも増える

### ✅ 意図が伝わる名前

```typescript
// ダメージ計算ロジック
let damageAmount = 0
damageAmount = playerArmPower + playerWeaponPower
damageAmount = damageAmount - ((enemyBodyDefence + enemyArmorDefence) / 2)
if (damageAmount < 0) {
  damageAmount = 0
}
```

**改善ポイント**:
- 変数名を見るだけで意図が伝わる
- ドメイン用語（`player`, `enemy`, `damage`）を使用
- コメントなしでも理解できる

### TypeScriptでのベストプラクティス

TypeScriptでは型があるため、**型名を変数名に含めない**：

```typescript
// ❌ 型名を含めない（Javaの悪習）
const damageAmountInt: number = 100
const playerNameString: string = "Hero"
const isDeadBoolean: boolean = false

// ✅ TypeScriptでは型推論があるので、型名は不要
const damageAmount = 100  // number と推論される
const playerName = "Hero"  // string と推論される
const isDead = false  // boolean と推論される
```

---

## 原則2: 変数を使い回さない、目的ごとに変数を用意

### ❌ 再代入による変数の使い回し

```typescript
let damageAmount = 0
damageAmount = playerArmPower + playerWeaponPower  // ①攻撃力の合計
damageAmount = damageAmount - ((enemyBodyDefence + enemyArmorDefence) / 2)  // ②ダメージ計算
if (damageAmount < 0) {
  damageAmount = 0
}
```

**問題点**:
- ①の時点で`damageAmount`はダメージではなく攻撃力
- 変数の意味が途中で変わるため、混乱を招く
- バグの温床になる

### ✅ 目的ごとに変数を用意

```typescript
const totalPlayerAttackPower = playerArmPower + playerWeaponPower
const totalEnemyDefence = enemyBodyDefence + enemyArmorDefence

let damageAmount = totalPlayerAttackPower - (totalEnemyDefence / 2)
if (damageAmount < 0) {
  damageAmount = 0
}
```

**改善ポイント**:
- 攻撃力、防御力、ダメージが明確に分離
- それぞれの計算が独立しているため、理解しやすい
- 変数の意味が途中で変わらない

### TypeScriptでは `const` を優先使用

**重要**: TypeScriptでは再代入を防ぐため、`const` を優先的に使う

```typescript
// ✅ 可能な限り const を使う
const totalPlayerAttackPower = playerArmPower + playerWeaponPower
const totalEnemyDefence = enemyBodyDefence + enemyArmorDefence
const rawDamage = totalPlayerAttackPower - (totalEnemyDefence / 2)

// 再代入が必要な場合のみ let
const damageAmount = Math.max(0, rawDamage)  // これで再代入不要
```

**constを使うメリット**:
- 再代入によるバグを防止
- コードレビュー時に「この変数は変更されない」ことが保証される
- 関数型プログラミングの原則に沿う

### Vueでのリアクティブな値の扱い

Vueでは `ref` や `reactive` を使うが、これも再代入を避ける：

```typescript
// ❌ 同じrefを使い回す
const value = ref(0)
value.value = playerArmPower + playerWeaponPower  // 攻撃力
value.value = value.value - defence  // ダメージ（意味が変わる）

// ✅ 目的ごとにrefを用意
const totalAttackPower = ref(playerArmPower + playerWeaponPower)
const damageAmount = computed(() => Math.max(0, totalAttackPower.value - defence))
```

---

## 原則3: 目的ごとのまとまりで関数化

### ❌ ベタ書きのロジック

```typescript
const totalPlayerAttackPower = playerArmPower + playerWeaponPower
const totalEnemyDefence = enemyBodyDefence + enemyArmorDefence
const damageAmount = Math.max(0, totalPlayerAttackPower - (totalEnemyDefence / 2))
```

**問題点**:
- 計算ロジックが一箇所にダラダラと書かれている
- どこからどこまでが何の処理か分かりにくい
- 攻撃力計算に防御力が混ざり込むなどのバグが発生しやすい

### ✅ 目的ごとに関数化

```typescript
// プレイヤーの攻撃力を合算
function sumUpPlayerAttackPower(armPower: number, weaponPower: number): number {
  return armPower + weaponPower
}

// 敵の防御力を合算
function sumUpEnemyDefence(bodyDefence: number, armorDefence: number): number {
  return bodyDefence + armorDefence
}

// ダメージ量を計算
function estimateDamage(attackPower: number, defence: number): number {
  const rawDamage = attackPower - (defence / 2)
  return Math.max(0, rawDamage)
}

// 使用例
const totalPlayerAttackPower = sumUpPlayerAttackPower(playerArmPower, playerWeaponPower)
const totalEnemyDefence = sumUpEnemyDefence(enemyBodyDefence, enemyArmorDefence)
const damageAmount = estimateDamage(totalPlayerAttackPower, totalEnemyDefence)
```

**改善ポイント**:
- 関数名を見るだけで処理内容が分かる
- 目的ごとに処理が分離されているため、他の処理が混ざりにくい
- **関心の分離**（Separation of Concerns）の実践

### TypeScriptの型を活用した関数設計

```typescript
// 型エイリアスで意図を明確に
type AttackPower = number
type Defence = number
type Damage = number

// 関数シグネチャで意図を表現
function estimateDamage(attackPower: AttackPower, defence: Defence): Damage {
  const rawDamage = attackPower - (defence / 2)
  return Math.max(0, rawDamage) as Damage
}
```

### Vue Composableでの実践例

```typescript
// composables/useDamageCalculator.ts
export function useDamageCalculator() {
  // 攻撃力を合算
  const sumUpAttackPower = (armPower: number, weaponPower: number) => {
    return armPower + weaponPower
  }

  // 防御力を合算
  const sumUpDefence = (bodyDefence: number, armorDefence: number) => {
    return bodyDefence + armorDefence
  }

  // ダメージを計算
  const estimateDamage = (attackPower: number, defence: number) => {
    const rawDamage = attackPower - (defence / 2)
    return Math.max(0, rawDamage)
  }

  return {
    sumUpAttackPower,
    sumUpDefence,
    estimateDamage
  }
}
```

```vue
<script setup lang="ts">
import { useDamageCalculator } from '@/composables/useDamageCalculator'

const { sumUpAttackPower, sumUpDefence, estimateDamage } = useDamageCalculator()

const totalAttackPower = sumUpAttackPower(playerArmPower, playerWeaponPower)
const totalDefence = sumUpDefence(enemyBodyDefence, enemyArmorDefence)
const damage = estimateDamage(totalAttackPower, totalDefence)
</script>
```

---

## 原則4: 関係し合うデータとロジックをクラスにまとめる（カプセル化）

### ❌ データとロジックがバラバラ

```typescript
// データだけの変数
let hitPoint = 100

// どこかに書かれるダメージ処理
hitPoint = hitPoint - damageAmount
if (hitPoint < 0) {
  hitPoint = 0
}

// 別の場所に書かれる回復処理
hitPoint = hitPoint + recoveryAmount
if (hitPoint > 999) {
  hitPoint = 999
}
```

**問題点**:
1. **関連するロジックを探し回る必要がある**
   - ダメージ処理がどこにあるか分からない
   - 回復処理も別の場所にある
   - 大規模なコードベースでは探すだけで時間がかかる

2. **不正な値が混入しやすい**
   ```typescript
   hitPoint = -100  // ❌ 負の値が入る
   hitPoint = 9999  // ❌ 最大値を超える
   ```

3. **重複コードが生まれやすい**
   - ダメージ処理が複数箇所にコピペされる
   - 仕様変更時に修正漏れが発生

### ✅ クラスによるカプセル化

```typescript
/**
 * ヒットポイント（HP）を表現するクラス
 * データ（値）とロジック（操作）を1つにまとめる
 */
class HitPoint {
  private static readonly MIN = 0
  private static readonly MAX = 999
  private readonly _value: number

  private constructor(value: number) {
    // 不正な値を防止
    if (value < HitPoint.MIN || value > HitPoint.MAX) {
      throw new Error(`ヒットポイントは${HitPoint.MIN}〜${HitPoint.MAX}の範囲で指定してください`)
    }
    this._value = value
  }

  // ファクトリメソッド（未初期化を防止）
  static create(value: number): HitPoint {
    return new HitPoint(value)
  }

  // Getter（値の保護）
  get value(): number {
    return this._value
  }

  // ダメージを受ける
  damage(damageAmount: number): HitPoint {
    if (damageAmount < 0) {
      throw new Error('ダメージ量は0以上を指定してください')
    }

    const damaged = this._value - damageAmount
    const corrected = Math.max(HitPoint.MIN, damaged)
    return new HitPoint(corrected)
  }

  // 回復する
  recover(recoveryAmount: number): HitPoint {
    if (recoveryAmount < 0) {
      throw new Error('回復量は0以上を指定してください')
    }

    const recovered = this._value + recoveryAmount
    const corrected = Math.min(HitPoint.MAX, recovered)
    return new HitPoint(corrected)
  }

  // 死亡判定
  isDead(): boolean {
    return this._value <= HitPoint.MIN
  }
}

// 使用例
const hp = HitPoint.create(100)
const afterDamage = hp.damage(30)  // 70
const afterRecover = afterDamage.recover(50)  // 120

console.log(afterRecover.value)  // 120
console.log(afterRecover.isDead())  // false
```

**改善ポイント**:
1. ✅ **関連するロジックが1箇所に集約**
   - ダメージ・回復・死亡判定がすべて`HitPoint`クラスにある
   - 探し回る必要がない

2. ✅ **不正な値の混入を防止**
   - コンストラクタでバリデーション
   - private constructorで外部から直接new不可
   - damageメソッド・recoverメソッドでも引数チェック

3. ✅ **イミュータブル（不変）な設計**
   - 値を変更せず、新しいインスタンスを返す
   - 副作用がなく、予測可能

### TypeScript関数型アプローチ

クラスを使わない場合でも、同様の設計原則を適用できる：

```typescript
// ブランド型で型安全性を確保
type HitPoint = {
  readonly value: number
  readonly __brand: 'HitPoint'
}

const MIN_HP = 0
const MAX_HP = 999

// ファクトリ関数
function createHitPoint(value: number): HitPoint {
  if (value < MIN_HP || value > MAX_HP) {
    throw new Error(`ヒットポイントは${MIN_HP}〜${MAX_HP}の範囲で指定してください`)
  }

  return {
    value,
    __brand: 'HitPoint'
  }
}

// ダメージ処理
function damageHitPoint(hp: HitPoint, damageAmount: number): HitPoint {
  if (damageAmount < 0) {
    throw new Error('ダメージ量は0以上を指定してください')
  }

  const damaged = hp.value - damageAmount
  const corrected = Math.max(MIN_HP, damaged)
  return createHitPoint(corrected)
}

// 回復処理
function recoverHitPoint(hp: HitPoint, recoveryAmount: number): HitPoint {
  if (recoveryAmount < 0) {
    throw new Error('回復量は0以上を指定してください')
  }

  const recovered = hp.value + recoveryAmount
  const corrected = Math.min(MAX_HP, recovered)
  return createHitPoint(corrected)
}

// 死亡判定
function isDeadHitPoint(hp: HitPoint): boolean {
  return hp.value <= MIN_HP
}

// 使用例
const hp = createHitPoint(100)
const afterDamage = damageHitPoint(hp, 30)
const afterRecover = recoverHitPoint(afterDamage, 50)

console.log(afterRecover.value)  // 120
console.log(isDeadHitPoint(afterRecover))  // false
```

### Vue Composableでの実践例

```typescript
// composables/useHitPoint.ts
import { ref, computed, readonly } from 'vue'

const MIN_HP = 0
const MAX_HP = 999

export function useHitPoint(initialValue: number) {
  // バリデーション
  if (initialValue < MIN_HP || initialValue > MAX_HP) {
    throw new Error(`ヒットポイントは${MIN_HP}〜${MAX_HP}の範囲で指定してください`)
  }

  // 内部状態（外部から直接変更不可）
  const _value = ref(initialValue)

  // 読み取り専用のcomputed
  const value = computed(() => _value.value)
  const isDead = computed(() => _value.value <= MIN_HP)

  // ダメージを受ける
  const damage = (damageAmount: number) => {
    if (damageAmount < 0) {
      throw new Error('ダメージ量は0以上を指定してください')
    }

    _value.value = Math.max(MIN_HP, _value.value - damageAmount)
  }

  // 回復する
  const recover = (recoveryAmount: number) => {
    if (recoveryAmount < 0) {
      throw new Error('回復量は0以上を指定してください')
    }

    _value.value = Math.min(MAX_HP, _value.value + recoveryAmount)
  }

  return {
    value,
    isDead,
    damage,
    recover
  }
}
```

```vue
<script setup lang="ts">
import { useHitPoint } from '@/composables/useHitPoint'

const hp = useHitPoint(100)

const takeDamage = () => {
  hp.damage(30)
}

const useRecoveryItem = () => {
  hp.recover(50)
}
</script>

<template>
  <div>
    <p>HP: {{ hp.value }}</p>
    <p v-if="hp.isDead" class="text-red-500">戦闘不能</p>
    <button @click="takeDamage">ダメージを受ける</button>
    <button @click="useRecoveryItem">回復アイテムを使う</button>
  </div>
</template>
```

---

## まとめ: 設計の4つの基本原則

### 1. 省略せず、意図が伝わる名前を設計する

- ❌ `d`, `p1`, `d1` などの省略形
- ✅ `damageAmount`, `playerArmPower`, `enemyBodyDefence`
- TypeScriptでは型名を変数名に含めない

### 2. 変数を使い回さない、目的ごとに変数を用意

- ❌ `let damageAmount = ...` を再代入で使い回す
- ✅ `const totalAttackPower`, `const totalDefence`, `const damageAmount`
- TypeScriptでは `const` を優先使用

### 3. 目的ごとのまとまりで関数化

- ❌ ベタ書きのロジック
- ✅ `sumUpAttackPower()`, `estimateDamage()` などに分割
- **関心の分離**（Separation of Concerns）を実践

### 4. 関係し合うデータとロジックをクラスにまとめる

- ❌ データとロジックがバラバラ
- ✅ カプセル化してクラス・Composableにまとめる
- 不正な値の混入を防ぐ

---

## 実務での適用ポイント

### コードレビューでのチェックリスト

- [ ] 変数名は意図が伝わるか？省略していないか？
- [ ] `let` を使っている箇所は本当に再代入が必要か？
- [ ] 100行以上の関数はないか？関数化できないか？
- [ ] データとロジックが離れていないか？カプセル化できないか？

### リファクタリングの優先順位

1. **まず命名を改善** → コストが低く、効果が高い
2. **次に関数化** → 可読性が劇的に向上
3. **最後にカプセル化** → 設計の根本的な改善

### 新規実装時の心がけ

- ❌ 「とりあえず動けばいい」で実装しない
- ✅ 最初から意図が伝わる名前を付ける
- ✅ 関数化できそうな処理は最初から分離する
- ✅ データとロジックはセットで設計する

---

次章では、カプセル化についてさらに詳しく学び、クラス設計の実践的な手法を深掘りします。

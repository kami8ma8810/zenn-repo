---
title: "Figma MCPのプロンプト設計と実装ガイド"
emoji: "🎨"
type: "tech"
topics: ["figma", "ai", "mcp", "デザイン", "フロントエンド"]
published: false
---

## ゴール

- Figma MCPでデザインからコード化を効率化する
- 良いプロンプトの書き方を押さえる
- MCPツールを適切に使い分ける

## デザイン準備（最小）

コード品質はFigma側の構造に依存します。以下を徹底します。

### 1. コンポーネントを活用する

再利用要素（ボタン、カード、入力フィールドなど）は必ずコンポーネント化します。

```
❌ 悪い例：
- Group 1
  - Rectangle
  - Text

✅ 良い例：
- Button (Component)
  - Background
  - Label
```

Code ConnectでFigmaとコードベースを紐付けると、既存コンポーネント再利用の精度が上がります。

### 2. デザイントークン（バリアブル）を使う

色や間隔はハードコードせず、バリアブルを使います。

```
❌ 悪い例：
Fill: #3B82F6

✅ 良い例：
Fill: $color/primary/500
```

これにより、生成コードもデザイントークンを参照します。

### 3. レイヤーに意味のある名前をつける

```
❌ Group 5
❌ Frame 123
❌ Rectangle 7

✅ CardContainer
✅ PricingSection
✅ CTAButton
```

名前から意図が伝わるようにします。

### 4. オートレイアウトでレスポンシブ性を伝える

オートレイアウトはFlex/Grid生成の品質に直結します。
生成前にフレームのリサイズ挙動を確認します。

**ヒント**: コード生成前に、Figmaでフレームをリサイズして期待通りに動くか確認してみてください！📱💻

### 5. アノテーションで補足する

ビジュアルで伝わらない仕様は、開発リソースやアノテーションで補足します。

- ホバー時の動作
- クリック時のインタラクション
- レスポンシブ時の挙動

## プロンプト設計

プロンプトで結果は大きく変わります。以下を明確に伝えます。

- フレームワーク（例: Vue 3 / React）
- スタイリング（Tailwind / CSS Modules）
- 既存再利用（使うコンポーネント/パス）
- ファイル方針（追加 or 更新、保存先）
- レイアウト（Flexbox or Grid）
- レスポンシブ範囲（SP/Tablet/PC）

### 基本の使い分け

- 選択ベース: Figmaで選択して「この選択を実装」
- リンクベース: URLを渡して「このリンクのフレームを実装」

### 効果的なプロンプト例

#### フレームワークを指定

```
❌ 「このフレームをコードにして」

✅ 「このフレームをVue 3のComposition APIで実装して。TailwindCSSを使ってね」
```

#### 既存コンポーネントを再利用

```
✅ 「src/components/ui にあるコンポーネントを使って、このフレームを実装して」

✅ 「既存のButtonコンポーネントとCardコンポーネントを活用してね」
```

#### ファイル構造を指定

```
✅ 「src/components/marketing/PricingCard.vue にこのデザインを追加して」

✅ 「新しいファイルを作らずに、既存のHero.vueを更新して」
```

#### レイアウトシステムを指定

```
✅ 「グリッドレイアウトではなく、Flexboxで実装して」

✅ 「CSS Gridを使って、レスポンシブ対応してね」
```

## MCPツールの使い分け

### `get_code` - コード生成の基本

Figmaの選択内容を**React + Tailwind**のコードとして出力します（デフォルト）。

**使い方**:
```
「このフレームのコードを生成して」
→ AIが自動的に get_code を使用
```

**カスタマイズ**:
```
「VueでFigmaの選択内容を生成して」
「プレーンHTML + CSSで実装して」
「SwiftUIで書いて」
```

### `get_variable_defs` - デザイントークンの抽出

選択範囲で使われている**バリアブルとスタイル**を取得します！

**使い方**:
```
「このフレームで使われているバリアブルを取得して」
「色と間隔のバリアブルは何？」
「バリアブル名とその値を一覧にして」
```

**結果例**:
```json
{
  "colors": {
    "primary-500": "#3B82F6",
    "surface-light": "#F9FAFB"
  },
  "spacing": {
    "md": "16px",
    "lg": "24px"
  }
}
```

### `get_code_connect_map` - コンポーネントマッピング

FigmaノードIDと**コードベース内のコンポーネント**の対応関係を取得します！

これがあると、AIが既存コンポーネントを正確に再利用できるようになります💡

**Code Connectの設定方法は別途確認してください！**

### `get_image` - 画像の取得

**デフォルトでオン**になっているツールです。レイアウトの正確性を保つため、選択範囲のスクリーンショットを撮影します📸

**設定で変更可能**:
- **オン**: 実際の画像を抽出
- **オフ（プレースホルダー）**: 汎用的なプレースホルダーを使用

## つまずきと対策

### 罠1: 選択範囲が大きすぎる問題

対策:
```
❌ ページ全体を一度に選択

✅ セクションごとに分割
   - ヘッダー
   - ヒーローセクション
   - 価格カード
   - フッター
```

小さく分割すると速度と品質が上がります。

### 罠2: プレースホルダー vs 実画像

**設定**: Figma → 基本設定 → Dev Mode MCP設定

- **`get_imageツールを有効`**: 実際の画像を使用（推奨）
- **`プレースホルダーを使用`**: 汎用画像で代替

**重要**: MCPサーバーが `localhost` の画像ソースを返したら、そのまま使います。新しい画像パッケージを追加しません。

### 罠3: カスタムルールの未設定

毎回の指示を減らすため、プロジェクトレベルのルールを用意します。
**解決策**: プロジェクトレベルで指示ファイルを作成します。

#### VS Code / Cursor の場合

```markdown
<!-- .cursorrules または .vscode/rules.md -->

# Figma Dev Mode MCP ルール

## 画像・SVG
- MCPサーバーが返すlocalhostソースを直接使用
- 新しいアイコンパッケージをインポートしない
- プレースホルダーを作成しない

## コンポーネント
- src/components/ui の既存コンポーネントを優先
- 新規コンポーネントはStorybookに対応した構造にする

## スタイリング
- TailwindCSSを使用
- ハードコードされた色は禁止
- デザイントークンを参照すること
```

#### Claude Code の場合

```markdown
<!-- CLAUDE.md -->

## FigmaMCP 実装ルール

- **フレームワーク**: Vue 3 + Composition API
- **スタイリング**: TailwindCSS + Piano V2デザイントークン
- **コンポーネント**: 既存の `src/piano_v2/components` を再利用
- **画像**: MCPが返すlocalhostソースを使用（プレースホルダー禁止）
```

これを一度設定しておけば、毎回指示しなくてOK！超便利です〜✨

## 実践例

### シナリオ: 価格カードの実装

#### 1. Figma側の準備

```
✅ コンポーネント化
   - PricingCard (メインコンポーネント)
     - CardHeader
     - PriceAmount
     - FeatureList
     - CTAButton (既存ボタンコンポーネントのインスタンス)

✅ デザイントークン使用
   - 背景色: $color/surface/primary
   - テキスト色: $color/text/primary
   - 間隔: $spacing/md, $spacing/lg

✅ レイヤー名
   - CardContainer
   - PriceLabel
   - FeatureItem
```

#### 2. AI へのプロンプト

```
このPricingCardフレームをVue 3で実装して。

条件:
- src/components/ui/Button.vue を再利用
- TailwindCSSでスタイリング
- デザイントークンを使用（ハードコード禁止）
- レスポンシブ対応（モバイル・タブレット・デスクトップ）
```

#### 3. 生成されるコード（イメージ）

```vue
<template>
  <div class="CardContainer _color-surface-primary _p-lg _rounded-lg _shadow-md">
    <div class="CardHeader _mb-md">
      <h3 class="_color-text-primary _text-xl _font-bold">
        {{ title }}
      </h3>
    </div>

    <div class="PriceLabel _mb-lg">
      <span class="_text-4xl _font-bold _color-text-accent">
        {{ price }}
      </span>
      <span class="_color-text-secondary">/ 月</span>
    </div>

    <ul class="FeatureList _mb-lg _space-y-md">
      <li
        v-for="feature in features"
        :key="feature"
        class="FeatureItem _flex _items-center _gap-sm"
      >
        <SvgIcon name="check" class="_color-icon-success" />
        <span>{{ feature }}</span>
      </li>
    </ul>

    <Button variant="primary" size="lg" @click="onSelect">
      プランを選択
    </Button>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/ui/Button.vue'
import SvgIcon from '@/components/common/SvgIcon.vue'

interface Props {
  title: string
  price: string
  features: string[]
}

defineProps<Props>()

const emit = defineEmits<{
  select: []
}>()

const onSelect = () => {
  emit('select')
}
</script>
```

ポイント:
- デザイントークンのクラス（`_color-surface-primary`）を使用
- 既存の `Button` コンポーネントを再利用
- レイヤー名をクラス名へ反映

## チェックリスト

### Figma側

1. ✅ **コンポーネント化**を徹底
2. ✅ **デザイントークン**を使う
3. ✅ **意味のある名前**をつける
4. ✅ **オートレイアウト**でレスポンシブ対応
5. ✅ **Code Connect**で既存コードとリンク

### AI側

1. ✅ **明確なプロンプト**を書く
2. ✅ **フレームワークとスタイリングシステム**を指定
3. ✅ **既存コンポーネントの再利用**を指示
4. ✅ **カスタムルール**を設定して一貫性を保つ

### 進め方

1. ✅ **小さく分割**して生成
2. ✅ **段階的に確認**しながら進める
3. ✅ **デザイントークン**が正しく使われているか検証

## Code Connectの重要性

**Code Connect**は、Figmaのコンポーネントとコードベースのコンポーネントを紐付ける仕組みです！

これを設定すると...
- AIが**既存コンポーネント**を正確に再利用
- コードベースとの**一貫性**が保たれる
- **ムダな重複実装**を防げる

設定方法については、Figmaの公式ドキュメントを参照してください！
→ [Code Connect公式ガイド](https://www.figma.com/developers/code-connect)

## まとめ

Figma MCPでデザインからコードへの移行がスムーズになります。

鍵は次の3点です。
1. Figma側の構造化（コンポーネント・トークン・命名・オートレイアウト）
2. 明確なプロンプト（フレームワーク/再利用/ファイル/レイアウト/制約）
3. 小さく分割して生成・検証

一度整えれば、実装は効率化します。ぜひ試してください。

---

## 参考リンク

- [Figma Dev Mode MCP 公式ドキュメント](https://help.figma.com/hc/en-us/articles/dev-mode-mcp-server)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Code Connect](https://www.figma.com/developers/code-connect)

## 関連記事

- Piano V2デザインシステムの活用方法
- TailwindCSS+デザイントークンの実装パターン
- Vue 3コンポーネント設計のベストプラクティス

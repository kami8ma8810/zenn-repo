# Googleプロフィール画像クロッパー調査結果

**調査日**: 2025-11-23
**調査方法**: 手動Chrome DevTools調査
**調査者**: h.kamiyama + Claude Code

---

## 📊 調査の進行状況

- [x] DevToolsを開く
- [x] クロッパー要素を特定（iframe実装を発見）
- [x] 画像要素のスタイルを確認
- [x] クロップ領域のスタイルを確認
- [x] 挙動を観察（ドラッグ・リサイズ）
- [x] 専用ズーム機能の確認（マウスホイール） ⭐
- [x] 回転機能の確認（2段階transform） ⭐⭐⭐
- [x] 三分割法グリッドの発見 ⭐
- [x] 最大ズーム制限の確認
- [x] パフォーマンス最適化の発見（transition動的制御）
- [x] **transform-origin の確認（50% 50%）** ⭐⭐⭐
- [x] **初期配置ロジックの解析（console デバッグ）** ⭐⭐⭐
- [x] **ドラッグ範囲制限の確認（短辺方向は固定）** ⭐⭐
- [x] **リアルタイム監視によるズーム挙動の解析** ⭐⭐⭐
- [x] **デモ実装完了（demo-cropper.html）** ✅
- [x] **最小ズーム制限の確認と実装** ⭐⭐
- [x] **Playwright E2Eテストの作成** ✅
- [ ] JavaScriptを調査（イベントハンドラ）※オプション
- [ ] ネットワークリクエストを確認 ※オプション
- [ ] Canvas APIの使用確認 ※オプション

**主要な調査は完了し、デモ実装も完成しました！** 🎉

---

## 🔍 調査結果

### ⭐ 重要な発見

**クロッパーは iframe で実装されている！**

```html
<iframe
  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-storage-access-by-user-activation allow-downloads"
  src="https://myaccount.google.com/profile-picture?origin=https%3A%2F%2Fmyaccount.google.com&amp;startPath=profile-picture&amp;hostId=ma&amp;theme=light"
  aria-hidden="false"
  aria-modal="true"
  allow="camera https://myaccount.google.com; display-capture https://myaccount.google.com"
  style="inset: 0px; position: fixed; border: none; height: 100%; width: 100%; z-index: 2202;">
</iframe>
```

**iframe URL**: `https://myaccount.google.com/profile-picture`

**sandbox属性**:
- `allow-same-origin` - 同一オリジンとして扱う
- `allow-scripts` - JavaScript実行を許可
- `allow-forms` - フォーム送信を許可
- `allow-popups` - ポップアップを許可
- `allow-storage-access-by-user-activation` - ユーザー操作でストレージアクセス許可
- `allow-downloads` - ダウンロードを許可

**allow属性**:
- `camera` - カメラアクセスを許可

**スタイル**:
- `position: fixed` - 画面全体に固定
- `inset: 0px` - 上下左右すべて0（全画面）
- `z-index: 2202` - 最前面に表示

---

### DOM構造

#### クロッパーコンテナ（外側）
- **セレクタ**: `div[jsname="P3Vluc"]`
- **クラス名**: `D0sgGc`
- **jscontroller**: `EnZCvd` (Google独自JavaScript)
- **cursor**: `grab`
- **特徴**: ドラッグ可能なコンテナ

#### 画像コンテナ
- **セレクタ**: `div[jsname="eolJKe"]`
- **クラス名**: `YmaRWd`
- **スタイル**:
  - `left: 104px`
  - `top: 174px`
  - `width: 632px`
  - `height: 632px`
  - `transform: rotate(0deg)`
  - `transition: none`
- **特徴**: 画像を包むコンテナ（位置とサイズが固定）

#### 画像要素
- **セレクタ**: `img[jsname="jACzre"]`
- **クラス名**: `y6oNN`
- **タグ**: `<img>`
- **src**: `https://lh3.googleusercontent.com/...`
- **transform**: `translate(-119px, 71px) scale(1.2898)` ⭐
- **transform-origin**: `50% 50%` ⭐⭐⭐ **（超重要！）**
- **transition**: `none`
- **alt**: `写真が切り抜かれています`
- **特徴**:
  - **transformで移動・拡大されている！**
  - **transform-origin が center（50% 50%）** → transform が画像の中心から行われる

#### クロップ領域（固定領域）⭐
- **セレクタ**: `div[jsname="zZyLVc"]`
- **クラス名**: `XYAICd RPkjUe VId7Cb`
- **タグ**: `<div>` + `<svg>` (マスク用)
- **スタイル**:
  - `left: 104px` ⭐ 固定位置
  - `top: 174px` ⭐ 固定位置
  - `width: 632px`
  - `height: 632px`
  - `transition: none`
- **特徴**:
  - **位置が固定されている！**
  - 画像コンテナと同じ位置・サイズ
  - SVGで円形マスクを描画
  - 4つのリサイズハンドル付き（role="slider"）

#### 三分割法グリッド（Rule of Thirds）⭐⭐
- **セレクタ**: `div[jsname="Soz5ie"]`
- **クラス名**: `UuHkY`
- **タグ**: `<div>` 内に4本のライン
- **表示タイミング**: マウスダウン時のみ表示
- **スタイル**:
  - 通常時: `opacity: 0` （非表示）
  - マウスダウン時: `opacity: 1` （表示）
- **グリッド構成**:
  - 横線×2: `top: 33.3333%`, `top: 66.6667%` （class="dZ7tPe DKlKme"）
  - 縦線×2: `left: 33.3333%`, `left: 66.6667%` （class="dZ7tPe BvBYQ"）
- **特徴**:
  - 写真構図ガイド（三分割法）を提供
  - ドラッグ中・リサイズ中にのみ表示される
  - ユーザーが構図を調整しやすくする UX 配慮

#### リサイズハンドル
- **タグ**: `<div role="slider">`
- **配置**: 四隅（左上、右上、左下、右下）
- **クラス名**: `ri20x` + 位置別クラス
- **aria-label**: `切り抜き枠の[位置]のコントロール`
- **特徴**:
  - キーボードアクセシビリティ対応
  - 矢印キーでサイズ変更可能

---

### CSSスタイル詳細

```css
/* 外側のコンテナ */
div.D0sgGc {
  cursor: grab;
  /* jsactionでドラッグイベントを処理 */
}

/* 画像コンテナ */
div.YmaRWd {
  left: 104px;
  top: 174px;
  box-sizing: border-box;
  width: 632px;
  height: 632px;
  transition: none;
  transform: rotate(0deg);
}

/* 画像要素（重要！）*/
img.y6oNN {
  position: absolute;
  top: 0;
  left: 0;
  transform: translate(-119px, 71px) scale(1.2898); /* ⭐ ドラッグ・ズームで変化 */
  transform-origin: 50% 50%; /* ⭐⭐⭐ 超重要！画像の中心を基準点にする */
  transition: none;
}

/* クロップ領域（固定）*/
div.XYAICd {
  transition: none;
  left: 104px;        /* ⭐ 固定 */
  top: 174px;         /* ⭐ 固定 */
  box-sizing: border-box;
  width: 632px;       /* 正方形 */
  height: 632px;      /* 正方形 */
}

/* SVGマスク（円形） */
svg.W8Glp {
  /* 円形のマスクを描画 */
}
```

### ⭐ 重要な実装パターン

**クロップ領域が固定 + 画像が動く方式**

```
┌─────────────────────────────┐
│  外側コンテナ (cursor: grab)  │
│  ┌─────────────────────────┐ │
│  │ クロップ領域（固定）       │ │
│  │  left: 104px             │ │
│  │  top: 174px              │ │
│  │  width: 632px            │ │
│  │  ┌───────────────┐       │ │
│  │  │  SVG マスク   │       │ │
│  │  │  (円形)       │       │ │
│  │  └───────────────┘       │ │
│  └─────────────────────────┘ │
│                               │
│  ┌─────────────────────────┐ │
│  │ 画像コンテナ（固定位置）   │ │
│  │  ┌─────────────────┐     │ │
│  │  │ <img>           │     │ │
│  │  │ transform:      │     │ │
│  │  │  translate()    │ ⬅️ ドラッグで変化
│  │  │  scale()        │ ⬅️ ズームで変化
│  │  └─────────────────┘     │ │
│  └─────────────────────────┘ │
└─────────────────────────────┘
```

---

### JavaScript

#### 使用ライブラリ
- [ ] Cropper.js
- [ ] React Image Crop
- [ ] Google独自実装
- [ ] その他: _______________

#### Canvas API
- **Canvas要素の数**:
- **用途**: プレビュー / クロップ処理 / その他

#### イベントリスナー
- **mousedown**: [ ] あり [ ] なし
- **mousemove**: [ ] あり [ ] なし
- **mouseup**: [ ] あり [ ] なし
- **touchstart**: [ ] あり [ ] なし
- **touchmove**: [ ] あり [ ] なし
- **wheel**: [ ] あり [ ] なし

---

### ネットワーク

#### 読み込まれたスクリプト

1. **ファイル名**:
   - **URL**:
   - **説明**:

2. **ファイル名**:
   - **URL**:
   - **説明**:

---

### 挙動の観察

#### ドラッグ操作 ⭐
- **画像がドラッグ可能**: ✅ はい
- **クロップ領域がドラッグ可能**: ❌ いいえ（完全に固定）
- **ドラッグ時の変化**:
  - 画像の `transform` が変化する: ✅ はい
  - **変化した値**:
    - ドラッグ前: `translate(-119px, 71px) scale(1.2898)`
    - ドラッグ後（右端）: `translate(-364.061px, 71px) scale(1.2898)`
    - 変化量: X座標が **-245px** 変化（右ドラッグ → 画像は左移動）
  - クロップ領域の位置が変化する: ❌ いいえ（常に固定）

#### ⭐ パフォーマンス最適化の発見

**transitionの動的制御**:
```css
/* ドラッグ前・ドラッグ中 */
transition: none;  /* スムーズな操作感のため無効化 */

/* ドラッグ終了後 */
transition: transform 100ms linear;  /* 滑らかなアニメーション */

/* クロップ領域のリサイズ後 */
transition: 100ms linear;  /* 滑らかなアニメーション */
```

**cursorの変化**:
```css
/* 通常時 */
cursor: grab;

/* ドラッグ終了後（一時的）*/
cursor: default;
```

**アクセシビリティ更新**:
- `aria-valuetext` が動的に更新される
- 例: `"左側を 44%、右側を 100%、上部を 0%、下部を 100% 切り抜きました"`
- スクリーンリーダーに切り抜き位置を正確に通知

#### クロップ領域のリサイズ ⭐⭐⭐

**クロップ領域のサイズは固定**:
```css
/* リサイズ前も後も変わらない */
width: 632px;
height: 632px;
left: 104px;
top: 174px;
```

**切り抜き範囲の変化**:
- `aria-valuetext`: `"左側を 64%、右側を 87%、上部を 23%、下部を 63% 切り抜きました"`
- 各ハンドルの `aria-valuenow` が変化

**画像のtransformが自動調整される！** ⭐⭐⭐:

| 状態 | translateX | translateY | scale |
|------|-----------|-----------|-------|
| リサイズ前 | -364.061px | 71px | 1.2898 |
| リサイズ後 | -835.145px | 181.07px | **3.18987** |
| 変化量 | -471px | +110px | **×2.47倍** |

**仕組み**:
1. ユーザーがクロップ領域のハンドルをドラッグ
2. 内部的な切り抜き範囲（％）が変化
3. **画像が自動的に拡大・移動**して、切り抜き範囲にフィット
4. クロップ領域の枠自体は固定サイズのまま

**つまり**: 「ズーム」ではなく、**「切り抜き範囲の調整に伴う自動スケール」**

**⭐⭐⭐ UX 最適化: 操作方法とズーム方向によって挙動が異なる**:

**クロップ領域リサイズ（ハンドルでドラッグ）**:

- **切り抜き箇所を小さくする（ズームイン）**:
  - ドラッグ中: **ズームされない**（プレビューなし）
  - マウスアップ後: 一気にズーム
  - **理由**: 拡大プレビューするとハンドルが見えづらくなり操作しづらい

- **切り抜き箇所を大きくする（ズームアウト）**:
  - ドラッグ中: **即時に画像が縮む**（リアルタイムプレビュー）
  - マウスアップ後: そのまま
  - **理由**: 縮小は操作性に影響しないため、リアルタイムで確認できる方が便利

**マウスホイールでのズーム**:
- ズームイン・ズームアウトどちらも**常にリアルタイムで適用**
- **理由**: カーソル位置が固定されているため、リアルタイムプレビューでも操作性に影響しない

#### ズーム操作 ⭐⭐⭐

**専用のズーム機能**: ✅ あり（マウスホイール）

**マウスホイールでのズーム**:
- マウスホイール上スクロール → ズームイン（拡大）
- マウスホイール下スクロール → ズームアウト（縮小）
- 即座にズーム操作が反映される
- スムーズな操作感

**⭐⭐⭐ 超重要: 切り抜き範囲のパーセンテージを固定したままズーム**:
- **現在の切り抜き範囲（%）を保ったまま**拡大・縮小
- マウスカーソルの位置は影響しない
- `scale()` と `translate()` を**同時に調整**
- 切り抜き範囲の中心位置（画像上の%）がクロップ領域の中心に固定される

**具体例（右端でズーム）**:
| 状態 | translateX | translateY | scale | 切り抜き範囲 |
|------|-----------|-----------|-------|------------|
| ズーム前 | -364.061px | 71px | 1.2898 | 44% ～ 100% |
| ズーム後 | -861.951px | 71px | 2.43437 | **44% ～ 100%** |
| 変化 | **×2.37倍** | 変化なし | **×1.89倍** | **変化なし** |

**重要**: 切り抜き範囲のパーセンテージが変わらないのに、translate も scale も変化している！

**最大ズーム制限**: ✅ あり
- 最大ズーム時の切り抜き範囲: **11% × 20%** の領域
- `aria-valuetext`: `"左側を 0%、右側を 11%、上部を 0%、下部を 20% 切り抜きました"`
- 切り抜き範囲の最小サイズ = 拡大率の最大値

**⭐ 最小ズーム制限**: ✅ あり
- **初期スケール以下にズームアウトできない**
- **理由**: 初期スケールより小さくすると、クロップ領域に画像外の部分（黒や透明な領域）が入り込んでしまうため
- **初期スケール** = 短辺をクロップ領域サイズに合わせたスケール
  - 縦長画像の場合: `scale = cropAreaSize / 画像幅`（例: `632 / 640 = 0.9875`）
  - 横長画像の場合: `scale = cropAreaSize / 画像高さ`
- **実装**: `Math.max(INITIAL_SCALE, newScale)` で最小値を制限

**最大ズーム時の transform 値**:
```css
transform: translate(2428.75px, 1367.92px) scale(6.58333);
transition: none;
```

**拡大率の比較表**:
| 状態 | translateX | translateY | scale | 切り抜き範囲 |
|------|-----------|-----------|-------|------------|
| 初期状態 | -119px | 71px | 1.2898 | 不明 |
| リサイズ後 | -835.145px | 181.07px | 3.18987 | 64%×40% (推定) |
| **最大ズーム** | **2428.75px** | **1367.92px** | **6.58333** | **11%×20%** |
| 拡大倍率 | - | - | **×5.1倍** | - |

**ズーム方法のまとめ**:
1. **マウスホイール** → 専用ズーム機能（ユーザーが自由に拡大/縮小）
2. **クロップ領域リサイズ** → 自動スケーリング（切り抜き範囲に合わせて自動調整）
3. どちらの方法でも最大ズーム制限が適用される（scale 最大値: 約 6.58）

#### 回転操作 ⭐⭐⭐

**回転機能**: ✅ あり（左回転ボタン）

**回転ボタン**:
- `aria-label="左に回転"`
- 反時計回りに90度回転
- SVGアイコン付き

**回転の実装方法（超重要！）**:

**画像コンテナ（親要素）に `rotate()` を適用**:
```html
<!-- 画像コンテナ -->
<div jsname="eolJKe" class="YmaRWd"
     style="transform: rotate(-90deg); transition: transform 100ms linear;">

  <!-- 画像要素 - transform は変わらない -->
  <img jsname="jACzre" class="y6oNN"
       style="transform: translate(2428.75px, 1367.92px) scale(6.58333);">
</div>
```

**2段階 transform による分離設計**:
```css
/* コンテナ（親）: 回転のみ */
div.YmaRWd {
  transform: rotate(-90deg);
  transition: transform 100ms linear;
}

/* 画像（子）: ドラッグ・ズームのみ */
img.y6oNN {
  transform: translate(2428.75px, 1367.92px) scale(6.58333);
  transition: transform 100ms linear;
}
```

**この実装の利点**:
- ✅ **関心の分離**: 回転 / ドラッグ / ズームが独立して管理される
- ✅ **シンプルなロジック**: 回転時に translate/scale を再計算する必要がない
- ✅ **状態の保持**: ドラッグ・ズーム状態を保ったまま回転できる
- ✅ **パフォーマンス**: 2つの transform が GPU で並列処理される

**回転角度**:
- 1回クリック: `-90deg`（左回転）
- 2回クリック: `-180deg`（推測）
- 3回クリック: `-270deg` または `90deg`（推測）
- 4回クリック: `0deg` または `360deg`（元に戻る）

#### その他の特徴
- **クロップ領域が固定**: [ ] はい [ ] いいえ
- **画像が動く**: [ ] はい [ ] いいえ
- **その他の観察**:


---

## 💡 推測される実装方法

### アーキテクチャ

**iframe による完全分離アーキテクチャ**:
- メインページとクロッパーUIを完全に分離
- `sandbox` 属性で明示的に許可された機能のみ有効化（セキュリティ強化）
- カメラアクセス権限も `allow` 属性で制御
- 独立したコンテキストで動作するため、メインページのスタイル・スクリプトに影響されない

**Google 独自 JavaScript フレームワーク**:
- `jsname` 属性でコンポーネント識別（React の `data-testid` に相当）
- `jscontroller`、`jsaction` による独自イベントハンドリング
- サーバー側で生成された難読化クラス名（`D0sgGc`、`y6oNN` など）

### 技術スタック

**CSS Transform ベースの実装**:
- 画像の移動・拡大縮小は `transform: translate() scale()` で実装
- Canvas API は使用せず、純粋な DOM + CSS で実装
- GPU アクセラレーションによる滑らかな操作感

**SVG によるマスク描画**:
- クロップ領域の円形プレビューは SVG で実装
- 円形以外の形状にも拡張可能な柔軟性

**動的スタイル制御によるパフォーマンス最適化**:
- ドラッグ中: `transition: none` で即座に追従
- ドラッグ終了後: `transition: transform 100ms linear` で滑らかな着地
- 不要な transition を避けることで 60fps を実現

**Opacity ベースのグリッド表示**:
- 三分割法グリッドは常に DOM に存在
- マウスダウン時のみ `opacity: 1` に変化
- DOM 追加/削除のコストを避けるパフォーマンス配慮

### 独特な挙動

**固定クロップ領域 + 可動画像パターン**:
- 一般的なクロッパー（Cropper.js など）とは逆の発想
- クロップ領域を画面中央に固定し、画像側を自由に動かす
- ユーザーの認知負荷を下げる UI 設計（「枠の中に収めたい部分を持ってくる」という直感的操作）

**自動スケーリング機能**:
- クロップ領域のサイズ変更時、画像が自動的に拡大/縮小
- 内部的には切り抜き範囲（%）を保持し、それに合わせて画像を調整
- 専用のズームボタンではなく、クロップ領域リサイズで拡大率を制御

**アクセシビリティへの配慮**:
- `role="slider"` によるキーボード操作対応
- `aria-valuetext` で切り抜き範囲を正確に読み上げ
- `aria-label` による各ハンドルの説明
- スクリーンリーダーユーザーも正確に操作可能


---

## 📸 スクリーンショット

（DevToolsのスクリーンショットをここに添付）

---

## 🎯 結論

### 実装の特徴

1. **iframe による完全分離アーキテクチャ**
   - セキュリティ・保守性・独立性を重視した設計
   - メインアプリケーションとの疎結合を実現

2. **CSS Transform ベースの軽量実装**
   - Canvas API を使わず、DOM + CSS のみで実装
   - GPU アクセラレーションによる高いパフォーマンス
   - ブラウザ互換性が高い

3. **固定クロップ領域 + 可動画像パターン**
   - 従来のクロッパーライブラリとは逆の発想
   - より直感的な UX を実現（「枠の中に収めたい部分を持ってくる」）
   - 認知負荷の低減

4. **2段階 transform による分離設計（最重要！）**
   - コンテナ（親）: `rotate()` で回転のみ管理
   - 画像（子）: `translate()` + `scale()` でドラッグ・ズームのみ管理
   - 回転 / ドラッグ / ズームが完全に独立
   - 複雑な座標計算やマトリックス演算が不要

5. **2種類のズーム機能（どちらも translate + scale を同時調整）**
   - マウスホイール: ユーザーが自由に拡大/縮小（専用ズーム）
     - **切り抜き範囲（%）を固定したままズーム**
     - 切り抜き範囲の中心がクロップ領域の中心に固定される
     - `translate()` と `scale()` を同時調整
   - クロップ領域リサイズ: 切り抜き範囲に合わせて自動スケーリング
     - 同様に `translate()` と `scale()` を同時調整
   - 両方とも最大ズーム制限あり（scale: 6.58）

6. **細部までこだわった UX 最適化**
   - transition の動的制御（ドラッグ中は無効、終了後は有効）
   - 三分割法グリッドの表示（構図ガイド）
   - **操作方法によるプレビュー挙動の最適化**:
     - ハンドルドラッグ（拡大）: マウスアップ後に適用（ハンドル操作性を優先）
     - ハンドルドラッグ（縮小）: リアルタイムプレビュー
     - マウスホイール: 常にリアルタイムプレビュー（カーソル固定で操作性に影響なし）
   - アクセシビリティ対応（ARIA 属性、キーボード操作）
   - 滑らかな回転アニメーション（100ms linear）

### 同様の実装を行う場合の推奨アプローチ

#### 基本構造（React/Vue での実装例）

```tsx
// 擬似コード（React）
function ImageCropper({ imageSrc, onCropChange }) {
  const [imageTransform, setImageTransform] = useState({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [rotation, setRotation] = useState(0); // 回転角度
  const [isDragging, setIsDragging] = useState(false);
  const [cropArea, setCropArea] = useState({
    width: 400,
    height: 400,
    // 固定位置（画面中央）
    left: 'calc(50% - 200px)',
    top: 'calc(50% - 200px)',
  });

  // 回転ボタン（-90度ずつ）
  const handleRotate = () => {
    setRotation((prev) => prev - 90);
  };

  return (
    <div className="cropper-container">
      {/* 回転ボタン */}
      <button onClick={handleRotate} aria-label="左に回転">
        回転
      </button>

      {/* 三分割法グリッド */}
      <div
        className="grid-overlay"
        style={{ opacity: isDragging ? 1 : 0 }}
      >
        <div className="grid-line horizontal" style={{ top: '33.33%' }} />
        <div className="grid-line horizontal" style={{ top: '66.67%' }} />
        <div className="grid-line vertical" style={{ left: '33.33%' }} />
        <div className="grid-line vertical" style={{ left: '66.67%' }} />
      </div>

      {/* クロップ領域（固定）*/}
      <div
        className="crop-area"
        style={{
          position: 'absolute',
          left: cropArea.left,
          top: cropArea.top,
          width: cropArea.width,
          height: cropArea.height,
        }}
      >
        {/* SVG マスク */}
        <svg className="mask">
          <circle cx="50%" cy="50%" r="50%" />
        </svg>

        {/* リサイズハンドル（四隅）*/}
        <div className="resize-handle top-left" />
        <div className="resize-handle top-right" />
        <div className="resize-handle bottom-left" />
        <div className="resize-handle bottom-right" />
      </div>

      {/* 画像コンテナ（回転用）⭐ */}
      <div
        className="image-container"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 100ms linear',
        }}
      >
        {/* 画像（ドラッグ・ズーム用）⭐ */}
        <img
          src={imageSrc}
          style={{
            transform: `translate(${imageTransform.x}px, ${imageTransform.y}px) scale(${imageTransform.scale})`,
            transition: isDragging ? 'none' : 'transform 100ms linear',
            cursor: 'grab',
          }}
          onMouseDown={handleDragStart}
          onWheel={handleWheel} // マウスホイールでズーム
        />
      </div>
    </div>
  );
}
```

#### 重要な実装ポイント

**1. 2段階 transform による分離設計（超重要！）**
```tsx
// コンテナ（親）: 回転のみ
<div style={{ transform: `rotate(${rotation}deg)` }}>

  {/* 画像（子）: ドラッグ・ズームのみ */}
  <img style={{ transform: `translate(${x}px, ${y}px) scale(${scale})` }} />
</div>
```

**分離の利点**:
- 回転処理はコンテナの `rotation` 状態だけを変更
- ドラッグ処理は画像の `x`, `y` だけを変更
- ズーム処理は画像の `scale` だけを変更
- それぞれが独立して動作し、複雑な座標計算が不要

**2. transition の動的制御**
```css
/* ドラッグ中 */
.image.dragging {
  transition: none; /* 即座に追従 */
}

/* ドラッグ終了後 */
.image {
  transition: transform 100ms linear; /* 滑らかな着地 */
}
```

**3. クロップ領域リサイズに伴う自動スケーリング**
```ts
// クロップ領域が縮小 → 画像を自動拡大してフィット
function onCropAreaResize(newWidth: number, newHeight: number) {
  const scaleX = cropArea.width / newWidth;
  const scaleY = cropArea.height / newHeight;
  const newScale = imageTransform.scale * Math.max(scaleX, scaleY);

  setImageTransform((prev) => ({
    ...prev,
    scale: newScale,
    // 位置も調整してセンタリング
  }));
}
```

**4. マウスホイールでのズーム対応（切り抜き範囲%を固定したまま）**
```ts
const handleWheel = (e: WheelEvent) => {
  e.preventDefault();

  // ズーム倍率の計算
  const delta = e.deltaY > 0 ? 0.9 : 1.1; // 下スクロール = 縮小、上スクロール = 拡大
  const newScale = Math.max(1, Math.min(imageTransform.scale * delta, 6.58));

  // 切り抜き範囲（%）を固定したまま拡大するため、translate も調整
  // クロップ領域の中心を基準点として、scale の変化に応じて translate を調整
  const scaleRatio = newScale / imageTransform.scale;
  const cropCenterX = cropArea.left + cropArea.width / 2;
  const cropCenterY = cropArea.top + cropArea.height / 2;

  // 切り抜き範囲の中心位置を保つように translate を調整
  const newX = cropCenterX - (cropCenterX - imageTransform.x) * scaleRatio;
  const newY = cropCenterY - (cropCenterY - imageTransform.y) * scaleRatio;

  setImageTransform({
    x: newX,
    y: newY,
    scale: newScale,
  });
};
```

**仕組み**:
1. `scale()` を変更
2. **`translate()` も同時に調整**（切り抜き範囲%を固定）
3. 切り抜き範囲の中心位置（画像上の%）がクロップ領域の中心に固定される
4. 結果的に「現在見えている範囲を保ったままズーム」が実現

**5. クロップ領域リサイズ時の UX 最適化（ズーム方向で挙動を変える）**
```ts
const handleCropResize = (newWidth: number, newHeight: number, isResizing: boolean) => {
  const currentCropPercentage = cropArea.width / imageWidth;
  const newCropPercentage = newWidth / imageWidth;

  // 縮小方向（切り抜き箇所を大きくする）のみリアルタイムプレビュー
  if (newCropPercentage > currentCropPercentage) {
    // 即座にズームアウト（リアルタイム）
    applyCropChange(newWidth, newHeight);
  } else if (!isResizing) {
    // 拡大方向はマウスアップ後のみ適用
    applyCropChange(newWidth, newHeight);
  }
  // 拡大方向のドラッグ中は何もしない（プレビューなし）
};
```

**理由**:
- ハンドルドラッグの拡大プレビュー: ハンドルが見えづらくなり操作性が悪化
- ハンドルドラッグの縮小プレビュー: 操作性に影響せず、リアルタイムで確認できる方が便利
- **マウスホイールは常にリアルタイム**: カーソル位置が固定で操作性に影響しない

**6. 三分割法グリッドの opacity 制御**
```ts
// グリッドは常に DOM に存在、マウスダウン時のみ表示
<div
  className="grid-overlay"
  style={{ opacity: isDragging || isResizing ? 1 : 0 }}
>
```

**7. アクセシビリティ対応**
```tsx
<div
  role="slider"
  aria-label="切り抜き枠の左上のコントロール"
  aria-valuenow={cropPercentage.left}
  aria-valuetext={`左側を ${cropPercentage.left}%、上部を ${cropPercentage.top}% 切り抜きました`}
  tabIndex={0}
  onKeyDown={handleKeyboardResize}
/>
```

#### 参考ライブラリ（Google 式の実装）

既存のクロッパーライブラリは「可動クロップ領域 + 固定画像」方式が多いため、Google 式の「固定クロップ領域 + 可動画像」を実装する場合は **自作** がおすすめ：

- **react-easy-crop**: 比較的近い実装だが、完全に同じではない
- **自作がベスト**: 上記の擬似コードをベースに実装することで、完全な制御とカスタマイズが可能


---

**調査完了日時**: 2025-11-23

## 📌 今後の調査が必要な項目

以下の項目は未確認のため、必要に応じて追加調査を行ってください：

### JavaScript の詳細
- [ ] イベントリスナーの種類と実装（`mousedown`, `mousemove`, `touchstart` など）
- [ ] `jscontroller="EnZCvd"` の詳細な動作
- [ ] `jsaction` 属性で定義されたイベントハンドリングの仕組み

### ネットワーク
- [ ] クロッパー関連の JavaScript ファイルの URL と内容
- [ ] 画像アップロード時のネットワークリクエスト
- [ ] サーバーサイドでのクロップ処理の有無

### Canvas API の使用
- [ ] Canvas 要素の存在確認（`document.querySelector('canvas')`）
- [ ] Canvas がクロップ処理に使用されているか（最終的な画像生成など）

### ズーム機能
- [ ] 専用のズームスライダーやボタンの存在
- [ ] マウスホイールによるズーム対応
- [ ] ピンチジェスチャーによるズーム対応

### 回転機能
- [ ] 回転ボタンの存在
- [ ] 画像の `transform: rotate()` の使用有無

---

## 🎓 学んだこと

### 主要な発見

1. **iframe 分離アーキテクチャ**
   - セキュリティとメンテナンス性を両立
   - カメラアクセス権限も細かく制御

2. **固定クロップ領域 + 可動画像パターン**
   - 従来のクロッパーとは逆転の発想
   - より直感的な UX を実現

3. **2段階 transform による分離設計（最重要発見！）**
   - コンテナ（親）に `rotate()` を適用
   - 画像（子）に `translate()` + `scale()` を適用
   - 回転 / ドラッグ / ズームが独立して管理される
   - 複雑な座標計算が不要になる

4. **マウスホイールによる専用ズーム機能**
   - クロップ領域リサイズとは別の独立したズーム操作
   - **切り抜き範囲（%）を固定したままズーム**
   - `scale()` と `translate()` を**同時に調整**
   - 切り抜き範囲の中心位置がクロップ領域の中心に固定される
   - マウスカーソル位置は無関係
   - 最大ズーム制限あり（scale: 6.58, 切り抜き範囲: 11%×20%）
   - 即座にズームが反映される滑らかな操作感

5. **パフォーマンス最適化の徹底**
   - transition の動的制御
   - opacity による表示切り替え（DOM 操作の削減）
   - GPU アクセラレーション（CSS Transform）

6. **アクセシビリティへの配慮**
   - ARIA 属性の完全実装
   - キーボード操作対応
   - スクリーンリーダー対応

7. **UX の細部へのこだわり**
   - 三分割法グリッド（構図ガイド）
   - cursor の動的変更
   - 滑らかな transition
   - **操作方法によるプレビュー挙動の最適化**:
     - ハンドルドラッグ（拡大）: マウスアップ後に適用（ハンドル操作性を優先）
     - ハンドルドラッグ（縮小）: リアルタイムプレビュー
     - マウスホイール: 常にリアルタイム（カーソル固定で操作性に影響なし）

### 実装時の参考ポイント

✅ **採用すべき手法**:
- **2段階 transform による分離設計**（コンテナで回転、画像でドラッグ・ズーム）
- **切り抜き範囲（%）を固定したままズーム**（translate と scale を同時調整）
- **操作方法によるプレビュー挙動の最適化**:
  - ハンドルドラッグ（拡大）: マウスアップ後に適用
  - ハンドルドラッグ（縮小）: リアルタイムプレビュー
  - マウスホイール: 常にリアルタイム
- CSS Transform ベースの実装（Canvas 不要）
- transition の動的制御（ドラッグ中は無効、終了後は有効）
- 固定クロップ領域パターン
- 三分割法グリッド（opacity で表示制御）
- マウスホイールでのズーム機能
- アクセシビリティ対応（ARIA 属性、キーボード操作）

❌ **避けるべきこと**:
- 過度な DOM 操作（opacity で制御すべき）
- ドラッグ中の transition（カクつきの原因）
- 複雑なライブラリ依存（自作がシンプル）
- 回転・拡大・移動を1つの transform にまとめる（座標計算が複雑になる）

---

**調査完了日時**: 2025-11-23

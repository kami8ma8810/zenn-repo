# Googleプロフィール画像クロッパー調査ツール 🔍

このツールは、Puppeteerを使用してGoogleプロフィール画像編集機能のクロッパー挙動を自動調査します。

---

## ⚠️ 重要なお知らせ（2025年11月版）

**2025年現在、Googleはパスキー認証を必須化しており、Puppeteerからの自動ログインが困難になっています。**

### 📖 推奨する調査方法

**新しい調査ガイドを用意しました！ → [`DEVTOOLS_GUIDE.md`](./DEVTOOLS_GUIDE.md)**

以下の2つのアプローチが選べます：

1. **Chrome DevTools MCP**（AI自動調査・最新）⭐
   - Claude Code（AI）があなたのログイン済みChromeブラウザを直接操作
   - パスキー問題を完全回避
   - 自動でDOM構造、CSS、JavaScriptを調査

2. **手動Chrome DevTools調査**（従来型・確実）
   - あなた自身がDevToolsを使って調査
   - 詳細な手順ガイド付き
   - すぐに始められる

**詳しくは → [`DEVTOOLS_GUIDE.md`](./DEVTOOLS_GUIDE.md) を参照してください。**

---

## 📌 以下は従来のPuppeteer調査ツールの説明です

**注意**: 現在、Googleのログインがパスキー必須になったため、このツールは動作しない可能性があります。上記の新しい調査方法を推奨します。

---

## 🎯 目的

Googleのプロフィール画像クロッパーは、一般的な画像クロッパーライブラリとは異なる独特な挙動を持っています。このツールを使って以下を調査します：

- クロップ領域が固定で画像が動くのか、逆なのか
- どのような技術スタック（Canvas API、CSS Transform等）を使用しているか
- ズーム・回転・ドラッグなどの操作方法
- 使用されているライブラリの特定
- DOM構造とスタイル情報

## 📋 前提条件

- Node.js 18以上
- npm または pnpm

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
cd research/google-cropper
npm install
# または
pnpm install
```

これにより、以下がインストールされます：
- `puppeteer`: ブラウザ自動操作
- `tsx`: TypeScript実行環境
- `typescript`: TypeScriptコンパイラ

## 🏃 実行方法

### 通常モード（ブラウザが表示される）

```bash
npm run investigate
```

### ヘッドレスモード（ブラウザが表示されない）

```bash
npm run investigate:headless
```

**注意**: ヘッドレスモードではGoogleログインが困難なため、**通常モードを推奨**します。

## 📝 使用手順

1. **スクリプトを実行**
   ```bash
   npm run investigate
   ```

2. **ブラウザが起動**
   - Puppeteerが制御するChromeブラウザが自動で開きます
   - Googleアカウント設定ページが表示されます

3. **手動でログイン**
   - ブラウザ画面でGoogleアカウントにログインしてください
   - ログイン後、プロフィールアイコンをクリック
   - 「プロフィール画像を変更」または編集ボタンをクリック
   - クロッパー画面が表示されるまで操作してください

4. **調査開始の合図**
   - クロッパー画面が表示されたら、**ターミナルに戻ってEnterキーを押してください**
   - 自動調査が開始されます

5. **調査完了**
   - 自動的にDOM解析、スクリーンショット撮影、挙動テストが実行されます
   - 結果は `output/` ディレクトリに保存されます

6. **ブラウザを閉じる**
   - 調査完了後、Enterキーを押すとブラウザが閉じます

## 📂 出力ファイル

調査結果は `output/` ディレクトリに保存されます：

```
output/
├── investigation-result.json    # 調査結果（JSON形式）
├── investigation-report.md      # 調査レポート（マークダウン形式）
├── screenshot-initial.png       # クロッパー初期状態のスクリーンショット
├── screenshot-after-drag.png    # ドラッグ後（将来的に実装予定）
└── screenshot-after-zoom.png    # ズーム後（将来的に実装予定）
```

### `investigation-result.json` の内容

```json
{
  "timestamp": "2025-11-23T02:00:00.000Z",
  "cropperInfo": {
    "containerSelector": "[class*='crop']",
    "imageSelector": "img[class*='crop']",
    "cropAreaSelector": null,
    "containerStyles": { ... },
    "imageStyles": { ... },
    "cropAreaStyles": null
  },
  "behaviorTests": {
    "imageDraggable": true,
    "cropAreaDraggable": false,
    "zoomAvailable": true,
    "rotateAvailable": false
  },
  "detectedLibraries": [],
  "scripts": [ ... ],
  "uniqueBehaviors": [
    "クロップ領域が固定位置に配置されている（画像が動く方式の可能性）",
    "CSS Transformを使用して画像を操作している"
  ],
  "screenshots": { ... }
}
```

### `investigation-report.md` の内容

マークダウン形式で読みやすく整形された調査レポートです。以下が含まれます：

- **検出されたライブラリ**
- **クロッパー要素の詳細情報**（セレクタ、スタイル）
- **挙動テスト結果**（表形式）
- **検出された独特な挙動**
- **技術的な推測と実装アプローチの提案**
- **スクリーンショットへのパス**

## 🔍 調査内容の詳細

### 1. クロッパー要素の特定

以下のセレクタパターンでクロッパー関連要素を探索します：

```typescript
// コンテナ要素
'[class*="crop"]', '[class*="Crop"]', 'canvas', '[role="img"]' など

// 画像要素
'img[class*="crop"]', 'canvas', '[class*="cropper-image"]' など

// クロップ領域
'[class*="crop-area"]', '[class*="selection"]', 'svg' など
```

### 2. スタイル情報の取得

各要素の以下のCSSプロパティを取得します：

- `position`
- `transform`
- `overflow`
- `cursor`
- `user-select`
- `pointer-events`
- `width` / `height`

### 3. 挙動テスト

以下の挙動を自動テストします：

- ✅ 画像がドラッグ可能か（`cursor: move` or `cursor: grab`）
- ✅ クロップ領域がドラッグ可能か
- ✅ ズーム機能があるか（スライダーやボタンの存在確認）
- ✅ 回転機能があるか（回転ボタンの存在確認）

### 4. ライブラリ検出

読み込まれているスクリプトURLから以下のライブラリを検出：

- cropper.js / cropperjs
- react-image-crop
- react-easy-crop
- Google独自実装

### 5. 独特な挙動の検出

以下の特徴的な実装パターンを検出します：

- クロップ領域が `position: fixed` or `absolute` で固定されているか
- Canvas要素を使用しているか
- CSS Transformで画像を操作しているか

## 💡 調査結果の活用方法

### 通常のクロッパーとの違いを理解

一般的なクロッパー（例: Cropper.js）:
```
✅ クロップ領域がドラッグ可能
❌ 画像は固定
```

Google式クロッパー（推測）:
```
❌ クロップ領域は固定（画面中央）
✅ 画像がドラッグ・ズーム可能
```

### 同様の実装を行う場合

調査結果を元に、以下のようなアプローチが推奨されます：

```tsx
// 擬似コード
<div class="cropper-container">
  {/* クロップ領域（固定） */}
  <div class="crop-area" style={{ position: 'absolute', top: '50%', left: '50%' }}>
    <div class="crop-frame"></div>
  </div>

  {/* 画像（移動可能） */}
  <img
    src={imageSrc}
    style={{
      transform: `translate(${x}px, ${y}px) scale(${zoom})`,
      cursor: 'grab',
    }}
    onMouseDown={handleDragStart}
  />
</div>
```

詳細は `output/investigation-report.md` の「推奨される実装アプローチ」セクションを参照してください。

## 🐛 トラブルシューティング

### Puppeteerがインストールできない

Chromiumのダウンロードに失敗する場合：

```bash
# 環境変数を設定してから再インストール
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm install
```

その後、システムにインストール済みのChromeを使用：

```typescript
// investigate-cropper.ts の launch オプションに追加
executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
```

### Googleログインができない

- 通常モード（`npm run investigate`）を使用してください
- ヘッドレスモードでは2段階認証が困難です

### クロッパー画面が見つからない

Googleのデザイン変更により、クロッパー画面へのアクセス方法が変わっている可能性があります。以下を試してください：

1. `https://myaccount.google.com/` にアクセス
2. 左メニューから「個人情報」をクリック
3. プロフィール写真をクリック
4. 「プロフィール写真を変更」をクリック

### 要素が検出されない

`src/investigate-cropper.ts` の `possibleSelectors` 配列にセレクタを追加してください：

```typescript
const possibleSelectors = {
  container: [
    '[class*="crop"]',
    // 新しいセレクタを追加
    '[data-testid="image-cropper"]',
  ],
  // ...
};
```

## 🔧 カスタマイズ

### より詳細な情報を取得したい

`src/investigate-cropper.ts` を編集して、以下を追加できます：

```typescript
// イベントリスナーの検出
const hasEventListeners = await page.evaluate(() => {
  const img = document.querySelector('img');
  return img && getEventListeners(img); // Chrome DevTools API
});

// 特定のCSSプロパティの取得
const additionalStyles = await page.evaluate(() => {
  const el = document.querySelector('[class*="crop"]');
  const styles = window.getComputedStyle(el);
  return {
    transition: styles.transition,
    willChange: styles.willChange,
    // ...
  };
});
```

### 自動操作を追加したい

```typescript
// ドラッグ操作のシミュレーション
await page.mouse.move(640, 360);
await page.mouse.down();
await page.mouse.move(700, 400);
await page.mouse.up();

await page.screenshot({ path: 'output/screenshot-after-drag.png' });
```

## 📚 参考リソース

- **Puppeteer公式ドキュメント**: https://pptr.dev/
- **Chrome DevTools Protocol**: https://chromedevtools.github.io/devtools-protocol/
- **画像クロッパー実装ガイド**: `画像クロッパー実装ガイド.md`（Obsidianメモリ）

## 📝 ライセンス

MIT

## 🤝 貢献

バグ報告や機能改善の提案は Issue でお願いします。

---

**作成日**: 2025-11-23
**作成者**: Claude Code
**目的**: Googleプロフィール画像クロッパーの独特な挙動を調査し、同様の実装を行うための情報を収集する

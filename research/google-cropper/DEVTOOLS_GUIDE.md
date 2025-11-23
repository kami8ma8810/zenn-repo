# Googleプロフィール画像クロッパー調査ガイド（2025年11月版）

**最終更新**: 2025-11-23

---

## 🎯 このガイドについて

Googleのプロフィール画像クロッパーは、一般的なクロッパーライブラリとは異なる独特な挙動を持っています。

**問題**: 2025年現在、Googleはパスキー認証を必須化しており、Puppeteerなどの自動化ツールからのログインが困難になっています。

**解決策**: このガイドでは、以下の2つのアプローチを提供します：

1. **Chrome DevTools MCP**（AI自動調査・最新）⭐
2. **手動Chrome DevTools調査**（従来型・確実）

---

## 📋 目次

- [方法1: Chrome DevTools MCP（推奨）](#方法1-chrome-devtools-mcp推奨)
- [方法2: 手動Chrome DevTools調査](#方法2-手動chrome-devtools調査)
- [調査チェックリスト](#調査チェックリスト)
- [結果の記録方法](#結果の記録方法)

---

# 方法1: Chrome DevTools MCP（推奨）

## 🌟 概要

**Chrome DevTools MCP**は、2025年9月にGoogleが公開した新しいツールです。

**できること**:
- Claude Code（AI）があなたのログイン済みChromeブラウザを直接操作
- DOM構造、CSS、JavaScript、ネットワークリクエストを自動調査
- **パスキー問題を完全回避**（既にログイン済みのブラウザを使用）

**仕組み**:
```
あなた → 通常のChromeでGoogleにログイン → クロッパー画面を開く
  ↓
Claude Code → DevTools MCP経由で接続 → 自動調査開始！
```

---

## 🚀 セットアップ手順

### ステップ1: Chrome DevTools MCPのインストール

```bash
# グローバルインストール
npm install -g chrome-devtools-mcp

# または、プロジェクト内にインストール
cd research/google-cropper
npm install chrome-devtools-mcp --save-dev
```

### ステップ2: MCPサーバーの起動

**方法A: 自動起動（Claude Code設定）**

Claude Codeの設定ファイルを編集：

```bash
# 設定ファイルを開く
code ~/.config/claude-code/mcp_settings.json
# または
nano ~/.config/claude-code/mcp_settings.json
```

以下の設定を追加：

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp"],
      "env": {}
    }
  }
}
```

**方法B: 手動起動**

別ターミナルで以下を実行：

```bash
npx chrome-devtools-mcp
```

サーバーが起動すると、以下のようなメッセージが表示されます：

```
Chrome DevTools MCP server running on port 3000
Waiting for connections...
```

### ステップ3: Chromeブラウザでクロッパー画面を開く

1. **通常のChromeブラウザを開く**（Puppeteerではなく、普段使っているChrome）

2. **Googleにログイン**
   - https://myaccount.google.com/ にアクセス
   - パスキーやパスワードでログイン

3. **プロフィール画像編集画面を開く**
   - 左メニュー「個人情報」をクリック
   - 「プロフィール写真」をクリック
   - 画像をアップロード
   - **クロッパー画面が表示されるまで進める**

4. **クロッパー画面でそのまま待機**

### ステップ4: Claude Codeに調査を依頼

Claude Codeに以下のように依頼：

```
Chrome DevTools MCPを使って、
現在開いているChromeのクロッパー画面を調査してください。

以下を調査してほしい：
- クロッパー要素のセレクタとDOM構造
- 使用されているCSS（transform, position等）
- Canvas APIの使用有無
- JavaScript イベントリスナー
- クロップ領域が固定か、画像が固定か
```

### ステップ5: 調査結果を確認

Claude Codeが自動的に以下を実行：

1. ✅ ブラウザに接続
2. ✅ クロッパー要素を特定
3. ✅ DOM構造を解析
4. ✅ CSSスタイルを取得
5. ✅ JavaScriptの動作を調査
6. ✅ 調査レポートを生成

---

## 🔧 トラブルシューティング

### MCPサーバーに接続できない

**原因**: ポートが既に使用されている

**解決策**:
```bash
# 別のポートで起動
PORT=3001 npx chrome-devtools-mcp
```

### Chromeブラウザが検出されない

**原因**: Chromeが起動していない or リモートデバッグが無効

**解決策**:
```bash
# リモートデバッグを有効にしてChromeを起動（Mac）
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222

# Linux
google-chrome --remote-debugging-port=9222
```

その後、`http://localhost:9222` にアクセスして、デバッグ対象のページが表示されることを確認。

### Claude Codeが調査を開始しない

**原因**: MCP設定が正しく読み込まれていない

**解決策**:
1. Claude Codeを再起動
2. 設定ファイルのJSONが正しいか確認
3. MCPサーバーのログを確認

---

## 📊 調査結果の活用

調査完了後、以下の情報が得られます：

### 1. DOM構造

```html
<div class="cropper-container" style="position: relative;">
  <div class="crop-area" style="position: absolute; ...">
    <!-- クロップ領域 -->
  </div>
  <img src="..." style="transform: translate(...) scale(...);">
</div>
```

### 2. CSS Transform情報

```css
img {
  transform: translate(123px, 456px) scale(1.5);
  cursor: grab;
}
```

### 3. 挙動の推測

- ✅ クロップ領域は固定 → 画像が動く方式
- ✅ CSS Transformで画像を操作
- ✅ Canvas APIでプレビュー生成

---

# 方法2: 手動Chrome DevTools調査

**こんな人におすすめ**:
- MCPのセットアップが難しい
- 確実に今すぐ調査したい
- DevToolsの使い方を学びたい

---

## 🔍 調査手順

### ステップ1: Googleにログイン & クロッパー画面を開く

1. **Chromeブラウザを開く**

2. **Googleアカウントにログイン**
   - https://myaccount.google.com/

3. **プロフィール画像編集画面へ**
   - 個人情報 → プロフィール写真 → 画像アップロード
   - クロッパー画面が表示されるまで進める

### ステップ2: Chrome DevToolsを開く

**キーボードショートカット**:
- **Mac**: `Cmd + Option + I`
- **Windows/Linux**: `Ctrl + Shift + I`

または、右クリック → 「検証」

### ステップ3: クロッパー要素を特定

1. **Elementsパネルを開く**

2. **要素選択ツールを使う**
   - DevToolsの左上のアイコン（矢印マーク）をクリック
   - またはショートカット: `Cmd + Shift + C` (Mac) / `Ctrl + Shift + C` (Win)

3. **クロッパー部分をクリック**
   - 画像をクリック
   - クロップ領域の枠をクリック
   - 背景のオーバーレイをクリック

4. **DOM構造を確認**
   - Elements パネルに選択された要素が表示される
   - 親要素・子要素を展開して構造を把握

**記録すること**:
```
- クロッパーコンテナのクラス名: __________________
- 画像要素のクラス名: __________________
- クロップ領域のクラス名: __________________
```

### ステップ4: CSSスタイルを調査

1. **Elementsパネル右側の「Styles」タブを確認**

2. **重要なCSSプロパティをチェック**:

   **画像要素**:
   ```
   - position: __________________
   - transform: __________________
   - cursor: __________________
   - user-select: __________________
   ```

   **クロップ領域**:
   ```
   - position: __________________
   - top/left: __________________
   - width/height: __________________
   ```

   **コンテナ**:
   ```
   - position: __________________
   - overflow: __________________
   ```

3. **Computedタブも確認**
   - 実際に適用されている最終的なスタイルが見られる

### ステップ5: JavaScriptの動作を調査

1. **Consoleパネルを開く**

2. **イベントリスナーを確認**

   Elements パネルで要素を選択した状態で、右側の「Event Listeners」タブをクリック

   **記録すること**:
   ```
   画像要素のイベント:
   - mousedown: □ あり □ なし
   - mousemove: □ あり □ なし
   - touchstart: □ あり □ なし
   - wheel: □ あり □ なし
   ```

3. **グローバル変数を調査**

   Consoleで以下を実行：

   ```javascript
   // Cropper関連のライブラリがロードされているか
   console.log(typeof Cropper);
   console.log(typeof ReactCrop);

   // Canvas要素の存在確認
   console.log(document.querySelectorAll('canvas'));

   // Transform値を取得
   const img = document.querySelector('[クラス名]');
   console.log(window.getComputedStyle(img).transform);
   ```

### ステップ6: ネットワークリクエストを確認

1. **Networkパネルを開く**

2. **フィルタを「JS」に設定**

3. **読み込まれているJavaScriptファイルを確認**

   **記録すること**:
   ```
   クロッパー関連と思われるファイル:
   - ファイル名: __________________
   - URL: __________________
   ```

4. **「Initiator」列を確認**
   - どのファイルから読み込まれたかがわかる

### ステップ7: Canvas APIの使用確認

Consoleで以下を実行：

```javascript
// Canvas要素を全て取得
const canvases = document.querySelectorAll('canvas');
console.log(`Canvas要素の数: ${canvases.length}`);

// 各Canvasの情報を表示
canvases.forEach((canvas, index) => {
  console.log(`Canvas ${index}:`);
  console.log(`  サイズ: ${canvas.width}x${canvas.height}`);
  console.log(`  親要素:`, canvas.parentElement);
});
```

### ステップ8: 実際に操作して挙動を観察

1. **画像をドラッグしてみる**

   - Elements パネルで画像の `transform` スタイルをリアルタイムで確認
   - 値がどう変化するかメモ

2. **ズーム操作**（ある場合）

   - スライダーやホイール操作時の `transform: scale(...)` の変化を確認

3. **クロップ領域を動かそうとする**

   - 動く？動かない？
   - 動く場合、どの要素の何が変化する？

---

## 📋 調査チェックリスト

以下をすべて確認してください：

### DOM構造

- [ ] クロッパーコンテナ要素のセレクタを特定
- [ ] 画像要素のセレクタを特定
- [ ] クロップ領域要素のセレクタを特定
- [ ] 親子関係を図示

### CSSスタイル

- [ ] 画像の `position` を確認
- [ ] 画像の `transform` を確認
- [ ] 画像の `cursor` を確認
- [ ] クロップ領域の `position` を確認
- [ ] クロップ領域が固定位置か確認

### JavaScript

- [ ] 使用されているライブラリを特定
- [ ] Canvas要素の有無を確認
- [ ] イベントリスナーの種類を確認
- [ ] グローバル変数/関数を確認

### 挙動

- [ ] 画像がドラッグ可能か
- [ ] クロップ領域がドラッグ可能か
- [ ] ズーム機能があるか
- [ ] 回転機能があるか
- [ ] どちらが固定でどちらが動くか

### ネットワーク

- [ ] クロッパー関連のJSファイルを特定
- [ ] ライブラリのCDN URLを特定（ある場合）

---

## 📝 結果の記録方法

### テンプレート

以下のテンプレートをコピーして、調査結果を記録してください：

```markdown
# Googleプロフィール画像クロッパー調査結果

**調査日**: 2025-11-23
**調査者**: あなたの名前

---

## DOM構造

### クロッパーコンテナ
- **セレクタ**: `[ここに記入]`
- **クラス名**: `[ここに記入]`
- **position**: `[ここに記入]`

### 画像要素
- **セレクタ**: `[ここに記入]`
- **クラス名**: `[ここに記入]`
- **タグ**: `<img>` or `<canvas>` or その他
- **position**: `[ここに記入]`
- **transform**: `[ここに記入]`
- **cursor**: `[ここに記入]`

### クロップ領域
- **セレクタ**: `[ここに記入]`
- **クラス名**: `[ここに記入]`
- **タグ**: `<div>` or `<svg>` or その他
- **position**: `[ここに記入]`
- **top/left**: `[ここに記入]`

---

## CSS詳細

```css
/* 画像要素 */
[セレクタ] {
  position: [値];
  transform: [値];
  cursor: [値];
  /* その他重要なプロパティ */
}

/* クロップ領域 */
[セレクタ] {
  position: [値];
  top: [値];
  left: [値];
  /* その他重要なプロパティ */
}
```

---

## JavaScript

### 使用ライブラリ
- [ ] Cropper.js
- [ ] React Image Crop
- [ ] Google独自実装
- [ ] その他: __________________

### Canvas API
- **Canvas要素の数**: __________________
- **用途**: プレビュー / クロップ処理 / その他

### イベントリスナー
- **mousedown**: [ ] あり [ ] なし
- **mousemove**: [ ] あり [ ] なし
- **touchstart**: [ ] あり [ ] なし
- **wheel**: [ ] あり [ ] なし

---

## 挙動の観察

### ドラッグ操作
- **画像がドラッグ可能**: [ ] はい [ ] いいえ
- **クロップ領域がドラッグ可能**: [ ] はい [ ] いいえ
- **ドラッグ時の変化**:
  - 画像の `transform` が変化する: [ ] はい [ ] いいえ
  - クロップ領域の位置が変化する: [ ] はい [ ] いいえ

### ズーム操作
- **ズーム機能**: [ ] あり [ ] なし
- **実装方法**: スライダー / ホイール / その他
- **変化するプロパティ**: transform: scale(...) / その他

### 独特な挙動
- **クロップ領域が固定**: [ ] はい [ ] いいえ
- **画像が動く**: [ ] はい [ ] いいえ
- **その他の特徴**:
  [ここに記入]

---

## ネットワーク

### 読み込まれたスクリプト
1. URL: __________________
   - 説明: __________________

2. URL: __________________
   - 説明: __________________

---

## スクリーンショット

（DevToolsのスクリーンショットを添付）

---

## 結論・推測

### 実装方法の推測

[ここに、どのように実装されていると推測されるか記入]

例:
- クロップ領域を画面中央に固定配置
- 画像をCSS Transformで移動・拡大
- Canvas APIでクロップ結果を生成

### 同様の実装を行う場合の推奨アプローチ

[ここに記入]
```

---

## 🎓 次のステップ

調査結果を元に、以下を実施：

### 1. 結果をObsidianメモリに保存

```bash
# Claude Codeに依頼
「調査結果をObsidianメモリに保存してください」
```

### 2. 実装プロトタイプの作成

調査結果を元に、同様の挙動を持つクロッパーを実装

### 3. 既存の「画像クロッパー実装ガイド」と統合

`画像クロッパー実装ガイド.md` に、Googleクロッパーの具体的な実装方法を追記

---

## 📚 参考リソース

### 公式ドキュメント

- **Chrome DevTools公式**: https://developer.chrome.com/docs/devtools/
- **Elements panel**: https://developer.chrome.com/docs/devtools/elements
- **Console panel**: https://developer.chrome.com/docs/devtools/console/

### 日本語チュートリアル

- **Chrome デベロッパーツールの使い方**: https://saruwakakun.com/html-css/basic/chrome-dev-tool
- **Chromeデベロッパーツール要素パネル編**: https://sqripts.com/2023/12/14/82607/

### Chrome DevTools MCP

- **公式GitHub**: https://github.com/ChromeDevTools/chrome-devtools-mcp
- **公式ブログ**: https://developer.chrome.com/blog/chrome-devtools-mcp

---

**作成日**: 2025-11-23
**作成者**: Claude Code
**目的**: Googleプロフィール画像クロッパーの独特な挙動を調査し、同様の実装を行うための情報を収集する

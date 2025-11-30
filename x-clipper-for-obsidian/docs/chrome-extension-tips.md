# Chrome拡張機能開発 Tips

Chrome拡張機能開発で遭遇したつまずきポイントとその解決方法をまとめたドキュメント。

## DevToolsでポップアップを検証する方法

Chrome拡張機能のポップアップは通常のWebページとは異なり、DevToolsの開き方が特殊。

### 方法1: ポップアップ内で右クリック（おすすめ）

1. 拡張機能のアイコンをクリックしてポップアップを開く
2. ポップアップ内で **右クリック** → **「検証」** を選択

### 方法2: 拡張機能の管理画面から

1. `chrome://extensions/` を開く
2. 拡張機能の「詳細」をクリック
3. 「拡張機能のビューを検証」セクションにある **「ポップアップ」** をクリック

### 方法3: ポップアップを独立したタブで開く

ポップアップのHTMLを直接ブラウザで開くと、普通のWebページとして検証できる。

```
chrome-extension://[拡張機能ID]/src/popup/popup.html
```

拡張機能IDは `chrome://extensions/` で確認可能（開発モードで「ID」として表示される）。

---

## CSSの `display` と `hidden` 属性の競合

### 問題

HTMLの `hidden` 属性を使って要素を非表示にしようとしても、CSSで `display: flex` などを指定していると、`hidden` 属性が効かない。

```css
/* この設定だと hidden 属性が効かない */
.settings-section {
  display: flex;
}
```

```html
<!-- hidden 属性を付けても表示されてしまう -->
<div class="settings-section" id="settingsSection" hidden>
```

### 原因

ブラウザのデフォルトでは `hidden` 属性は `display: none` を適用するが、CSSで `display` プロパティを明示的に指定すると、それが優先されてしまう。

### 解決方法

`[hidden]` 属性セレクタを使って明示的に `display: none` を指定する。

```css
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* hidden 属性が付いている場合は非表示 */
.settings-section[hidden] {
  display: none;
}
```

---

## ローディングスピナーが常に表示される問題

### 問題

`hidden` 属性でローディングスピナーを非表示にしようとしても、常に表示されてしまう。

```css
/* この設定だと hidden が効かない */
.btn-loading {
  display: flex;
  align-items: center;
}
```

### 解決方法

デフォルトを `display: none` にして、`:not([hidden])` で表示時のスタイルを指定する。

```css
.btn-loading {
  display: none;  /* デフォルトは非表示 */
  align-items: center;
}

.btn-loading:not([hidden]) {
  display: flex;  /* hidden 属性がない場合のみ表示 */
}
```

---

## `aria-live` の空要素を非表示にする

### 問題

`aria-live` 属性を持つ要素は、スクリーンリーダー対応のためDOMに残しておく必要があるが、空のときは高さを取らないようにしたい。

### 解決方法

`:empty` 疑似クラスを使う。

```css
.connection-result {
  font-size: 13px;
}

.connection-result:empty {
  display: none;
}
```

これにより：
- 要素はDOMに存在し続ける（`aria-live` が機能する）
- 空の場合は `display: none` で高さ0になる
- テキストが入った瞬間に表示され、スクリーンリーダーが読み上げる

---

## `chrome.runtime.openOptionsPage()` が何も起きない

### 問題

設定ボタンで `chrome.runtime.openOptionsPage()` を呼んでも何も起きない。

### 原因

`manifest.json` に `options_page` または `options_ui` が定義されていない。

```json
// manifest.json に以下のいずれかが必要
{
  "options_page": "options.html",
  // または
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  }
}
```

### 解決方法

オプションページが不要な場合は、ボタンの機能を別のものに変更する（例：設定セクションのトグル表示など）。

---

## デバッグのコツ

### console.log でイベントリスナーの動作確認

イベントが発火しているか確認するために、関数の先頭に `console.log` を追加。

```typescript
function toggleSettings(): void {
  console.log('toggleSettings called')
  console.log('element:', elements.settingsSection)
  // ...
}
```

### DevTools の Elements パネルで属性確認

要素を選択して、`hidden` 属性が正しく追加/削除されているか確認。

### Computed スタイルで実際の display 値を確認

DevTools の「Computed」タブで、実際に適用されている `display` の値を確認する。これにより、CSS の競合を発見できる。

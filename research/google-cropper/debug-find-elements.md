# Google Cropper 要素確認コード

## Step 1: まず要素が存在するか確認

```javascript
console.log('All images:', document.querySelectorAll('img'));
console.log('img.y6oNN:', document.querySelector('img.y6oNN'));
console.log('.YmaRWd:', document.querySelector('.YmaRWd'));
```

## Step 2: 要素が見つかったら初期状態を確認

```javascript
const img = document.querySelector('img.y6oNN');
const container = document.querySelector('.YmaRWd');

if (!img || !container) {
  console.error('Elements not found - Make sure you are on the cropper screen!');
} else {
  console.log('=== Google Cropper Initial State ===');
  console.log('Image natural size:', img.naturalWidth, 'x', img.naturalHeight);
  console.log('Container size:', container.style.width, 'x', container.style.height);
  console.log('Image transform:', img.style.transform);
  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;
  const containerSize = parseInt(container.style.width);
  const minDimension = Math.min(naturalWidth, naturalHeight);
  const expectedScale = containerSize / minDimension;
  const imageCenterX = naturalWidth / 2;
  const imageCenterY = naturalHeight / 2;
  const containerCenterX = containerSize / 2;
  const containerCenterY = containerSize / 2;
  const expectedTranslateX = containerCenterX - imageCenterX;
  const expectedTranslateY = containerCenterY - imageCenterY;
  console.log('=== My Calculation ===');
  console.log('Expected scale:', expectedScale.toFixed(4));
  console.log('Expected translateX:', expectedTranslateX.toFixed(2));
  console.log('Expected translateY:', expectedTranslateY.toFixed(2));
  console.log('=== Expected Transform ===');
  console.log('translate(' + expectedTranslateX.toFixed(2) + 'px, ' + expectedTranslateY.toFixed(2) + 'px) scale(' + expectedScale.toFixed(4) + ')');
}
```

## 実行手順

1. Google のプロフィール画像設定を開く
2. 「プロフィール写真を変更」をクリック
3. **画像を選択してクロッパー画面が表示されるまで待つ**
4. クロッパー画面が表示されたら、Step 1 のコードを実行
5. 要素が見つかったら、Step 2 のコードを実行

※ クロッパー画面が表示される前に実行すると要素が見つかりません

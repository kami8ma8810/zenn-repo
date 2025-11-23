# Google Cropper 初期状態デバッグコード

以下のコードを Google のクロッパー画面で、**新しい画像をアップロードした直後**に console に貼り付けて実行してください。

## デバッグコード

```javascript
const img = document.querySelector('img.y6oNN');
const container = document.querySelector('.YmaRWd');

if (!img || !container) {
  console.error('Elements not found');
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

  console.log('\n=== My Calculation ===');
  console.log('Expected scale:', expectedScale.toFixed(4));
  console.log('Expected translateX:', expectedTranslateX.toFixed(2));
  console.log('Expected translateY:', expectedTranslateY.toFixed(2));

  console.log('\n=== Expected Transform ===');
  console.log('translate(' + expectedTranslateX.toFixed(2) + 'px, ' + expectedTranslateY.toFixed(2) + 'px) scale(' + expectedScale.toFixed(4) + ')');
}
```

## 実行手順

1. Google のプロフィール画像クロッパーを開く
2. **新しい画像をアップロードする**（縦長と横長の両方で試す）
3. アップロード直後に、上記のコードを console に貼り付けて実行
4. 出力結果をコピーして教えてください

## 確認ポイント

- Google の実際の transform 値
- 私の計算した値
- 両者の違い

これで初期配置のロジックの違いが明確になります！

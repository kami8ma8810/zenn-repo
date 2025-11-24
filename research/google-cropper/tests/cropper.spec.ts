import { test, expect } from '@playwright/test';

test.describe('Google式クロッパー デモ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo-cropper.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('初期状態', () => {
    test('縦長画像の初期クロップ位置が上下左右の中央になる', async ({ page }) => {
      const image = page.locator('#cropperImage');
      await image.waitFor({ state: 'visible' });

      // 画像のnatural sizeを取得
      const naturalSize = await image.evaluate((img: HTMLImageElement) => ({
        width: img.naturalWidth,
        height: img.naturalHeight,
      }));

      // transform を取得
      const transform = await image.evaluate((img: HTMLImageElement) => {
        const transformMatch = img.style.transform.match(/translate\(([^,]+),\s*([^)]+)\)\s*scale\(([^)]+)\)/);
        if (!transformMatch) return { x: 0, y: 0, scale: 1 };
        return {
          x: parseFloat(transformMatch[1]),
          y: parseFloat(transformMatch[2]),
          scale: parseFloat(transformMatch[3]),
        };
      });

      // クロップ領域のサイズ（632px固定）
      const cropAreaSize = 632;
      const containerCenterX = cropAreaSize / 2;
      const containerCenterY = cropAreaSize / 2;

      // クロップ領域が見ている画像上の位置（%）を計算
      const imageCenterX = naturalSize.width / 2;
      const imageCenterY = naturalSize.height / 2;

      const currentImageCenterX = imageCenterX + transform.x;
      const currentImageCenterY = imageCenterY + transform.y;

      const offsetFromImageCenterX = containerCenterX - currentImageCenterX;
      const offsetFromImageCenterY = containerCenterY - currentImageCenterY;

      const imageSpaceOffsetX = offsetFromImageCenterX / transform.scale;
      const imageSpaceOffsetY = offsetFromImageCenterY / transform.scale;

      const cropCenterRatioX = 0.5 + imageSpaceOffsetX / naturalSize.width;
      const cropCenterRatioY = 0.5 + imageSpaceOffsetY / naturalSize.height;

      console.log('Natural size:', naturalSize);
      console.log('Crop center ratio X:', cropCenterRatioX);
      console.log('Crop center ratio Y:', cropCenterRatioY);

      // クロップ領域の中心が画像の中央（0.5, 0.5）にあるはず
      expect(Math.abs(cropCenterRatioX - 0.5)).toBeLessThan(0.01);
      expect(Math.abs(cropCenterRatioY - 0.5)).toBeLessThan(0.01);
    });

    test('縦長画像（640×1136）の初期配置が正しい', async ({ page }) => {
      // 画像要素を取得
      const image = page.locator('#cropperImage');

      // 画像がロードされるまで待つ
      await image.waitFor({ state: 'visible' });

      // natural size を確認
      const naturalWidth = await image.evaluate((img: HTMLImageElement) => img.naturalWidth);
      const naturalHeight = await image.evaluate((img: HTMLImageElement) => img.naturalHeight);

      expect(naturalWidth).toBe(640);
      expect(naturalHeight).toBe(1136);

      // transform を取得
      const transform = await image.evaluate((img: HTMLElement) => {
        return window.getComputedStyle(img).transform;
      });

      // transform-origin を確認
      const transformOrigin = await image.evaluate((img: HTMLElement) => {
        return window.getComputedStyle(img).transformOrigin;
      });

      expect(transformOrigin).toBe('320px 568px'); // 50% 50% = 画像の中心

      // transform が matrix 形式で返されるので、translate と scale を解析
      console.log('Initial transform:', transform);

      // スタイルの transform 属性から値を取得（より正確）
      const styleTransform = await image.evaluate((img: HTMLImageElement) => {
        return img.style.transform;
      });

      console.log('Initial style.transform:', styleTransform);

      // 期待値: translate(-4px, -252px) scale(0.9875)
      // 短辺（640px）をクロップ領域（632px）に合わせる
      // scale = 632 / 640 = 0.9875
      // translateX = 316 - 320 = -4
      // translateY = 316 - 568 = -252

      expect(styleTransform).toContain('translate(-4px, -252px)');
      expect(styleTransform).toContain('scale(0.9875)');
    });
  });

  test.describe('ドラッグ制限', () => {
    test('縦長画像は横方向にドラッグできない（短辺方向）', async ({ page }) => {
      const image = page.locator('#cropperImage');
      await image.waitFor({ state: 'visible' });

      // 初期 transform を取得
      const initialTransform = await image.evaluate((img: HTMLImageElement) => {
        return img.style.transform;
      });

      // 画像の中心を取得
      const imageBbox = await image.boundingBox();
      if (!imageBbox) throw new Error('Image bounding box not found');

      const imageCenterX = imageBbox.x + imageBbox.width / 2;
      const imageCenterY = imageBbox.y + imageBbox.height / 2;

      // 横方向に100pxドラッグを試みる
      await page.mouse.move(imageCenterX, imageCenterY);
      await page.mouse.down();
      await page.mouse.move(imageCenterX + 100, imageCenterY, { steps: 10 });
      await page.mouse.up();

      // ドラッグ後の transform を取得
      const afterTransform = await image.evaluate((img: HTMLImageElement) => {
        return img.style.transform;
      });

      console.log('Initial transform:', initialTransform);
      console.log('After horizontal drag:', afterTransform);

      // 横方向（translateX）は変化しないはず
      expect(afterTransform).toBe(initialTransform);
    });

    test('縦長画像は縦方向にドラッグできる（長辺方向）', async ({ page }) => {
      const image = page.locator('#cropperImage');
      await image.waitFor({ state: 'visible' });

      // 初期 translateY を取得
      const initialTransform = await image.evaluate((img: HTMLImageElement) => {
        const match = img.style.transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        return match ? parseFloat(match[2]) : 0;
      });

      // 画像の中心を取得
      const imageBbox = await image.boundingBox();
      if (!imageBbox) throw new Error('Image bounding box not found');

      const imageCenterX = imageBbox.x + imageBbox.width / 2;
      const imageCenterY = imageBbox.y + imageBbox.height / 2;

      // 縦方向に50pxドラッグ
      await page.mouse.move(imageCenterX, imageCenterY);
      await page.mouse.down();
      await page.mouse.move(imageCenterX, imageCenterY + 50, { steps: 10 });
      await page.mouse.up();

      // ドラッグ後の translateY を取得
      const afterTransform = await image.evaluate((img: HTMLImageElement) => {
        const match = img.style.transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        return match ? parseFloat(match[2]) : 0;
      });

      console.log('Initial translateY:', initialTransform);
      console.log('After vertical drag:', afterTransform);

      // 縦方向（translateY）は変化するはず
      expect(Math.abs(afterTransform - initialTransform)).toBeGreaterThan(0);
    });
  });

  test.describe('ズーム挙動', () => {
    test('マウスホイールでズームイン/アウトできる', async ({ page }) => {
      const image = page.locator('#cropperImage');
      await image.waitFor({ state: 'visible' });

      // 初期 scale を取得
      const initialScale = await image.evaluate((img: HTMLImageElement) => {
        const match = img.style.transform.match(/scale\(([^)]+)\)/);
        return match ? parseFloat(match[1]) : 1;
      });

      // 画像の中心でホイールズーム（ズームイン）
      const imageBbox = await image.boundingBox();
      if (!imageBbox) throw new Error('Image bounding box not found');

      const imageCenterX = imageBbox.x + imageBbox.width / 2;
      const imageCenterY = imageBbox.y + imageBbox.height / 2;

      // ズームイン（上スクロール = deltaY負）
      await page.mouse.move(imageCenterX, imageCenterY);
      await page.mouse.wheel(0, -100); // 上スクロール

      // ズーム後の scale を取得
      const afterZoomScale = await image.evaluate((img: HTMLImageElement) => {
        const match = img.style.transform.match(/scale\(([^)]+)\)/);
        return match ? parseFloat(match[1]) : 1;
      });

      console.log('Initial scale:', initialScale);
      console.log('After zoom in:', afterZoomScale);

      // scale が増加しているはず
      expect(afterZoomScale).toBeGreaterThan(initialScale);

      // ズームアウト（下スクロール = deltaY正）
      await page.mouse.wheel(0, 100); // 下スクロール

      const afterZoomOutScale = await image.evaluate((img: HTMLImageElement) => {
        const match = img.style.transform.match(/scale\(([^)]+)\)/);
        return match ? parseFloat(match[1]) : 1;
      });

      console.log('After zoom out:', afterZoomOutScale);

      // scale が減少しているはず
      expect(afterZoomOutScale).toBeLessThan(afterZoomScale);
    });

    test('ズーム時に translate も調整される（クロップ領域中心を固定）', async ({ page }) => {
      const image = page.locator('#cropperImage');
      await image.waitFor({ state: 'visible' });

      // 画像を少し下方向にドラッグ（中央から外す）
      const imageBbox = await image.boundingBox();
      if (!imageBbox) throw new Error('Image bounding box not found');

      const imageCenterX = imageBbox.x + imageBbox.width / 2;
      const imageCenterY = imageBbox.y + imageBbox.height / 2;

      await page.mouse.move(imageCenterX, imageCenterY);
      await page.mouse.down();
      await page.mouse.move(imageCenterX, imageCenterY - 100, { steps: 10 }); // 上方向に100pxドラッグ
      await page.mouse.up();

      // ドラッグ後の transform を取得
      const afterDragTransform = await image.evaluate((img: HTMLImageElement) => {
        const transformMatch = img.style.transform.match(/translate\(([^,]+),\s*([^)]+)\)\s*scale\(([^)]+)\)/);
        if (!transformMatch) return { x: 0, y: 0, scale: 1 };
        return {
          x: parseFloat(transformMatch[1]),
          y: parseFloat(transformMatch[2]),
          scale: parseFloat(transformMatch[3]),
        };
      });

      // ズームイン
      const newImageBbox = await image.boundingBox();
      if (!newImageBbox) throw new Error('Image bounding box not found');
      const newImageCenterX = newImageBbox.x + newImageBbox.width / 2;
      const newImageCenterY = newImageBbox.y + newImageBbox.height / 2;

      await page.mouse.move(newImageCenterX, newImageCenterY);
      await page.mouse.wheel(0, -100);

      // ズーム後の transform を取得
      const afterZoomTransform = await image.evaluate((img: HTMLImageElement) => {
        const transformMatch = img.style.transform.match(/translate\(([^,]+),\s*([^)]+)\)\s*scale\(([^)]+)\)/);
        if (!transformMatch) return { x: 0, y: 0, scale: 1 };
        return {
          x: parseFloat(transformMatch[1]),
          y: parseFloat(transformMatch[2]),
          scale: parseFloat(transformMatch[3]),
        };
      });

      console.log('After drag transform:', afterDragTransform);
      console.log('After zoom transform:', afterZoomTransform);

      // scale が変化している
      expect(afterZoomTransform.scale).not.toBe(afterDragTransform.scale);

      // translate も変化している（クロップ位置を固定するため）
      // 初期状態（中央）ではない位置からズームするので、translate が調整される
      expect(afterZoomTransform.y).not.toBe(afterDragTransform.y);
    });

    test('画像が下端にいるときは下端を基準にズームする', async ({ page }) => {
      const image = page.locator('#cropperImage');
      await image.waitFor({ state: 'visible' });

      // 画像を下端までドラッグ
      const imageBbox = await image.boundingBox();
      if (!imageBbox) throw new Error('Image bounding box not found');

      const imageCenterX = imageBbox.x + imageBbox.width / 2;
      const imageCenterY = imageBbox.y + imageBbox.height / 2;

      // 下方向に大きくドラッグ（画像の下端がクロップ領域の中心付近に来るように）
      await page.mouse.move(imageCenterX, imageCenterY);
      await page.mouse.down();
      await page.mouse.move(imageCenterX, imageCenterY - 300, { steps: 10 });
      await page.mouse.up();

      // ドラッグ後の transform を取得
      const afterDragTransform = await image.evaluate((img: HTMLImageElement) => {
        const transformMatch = img.style.transform.match(/translate\(([^,]+),\s*([^)]+)\)\s*scale\(([^)]+)\)/);
        if (!transformMatch) return { x: 0, y: 0, scale: 1 };
        return {
          x: parseFloat(transformMatch[1]),
          y: parseFloat(transformMatch[2]),
          scale: parseFloat(transformMatch[3]),
        };
      });

      // 画像のnatural sizeを取得
      const naturalSize = await image.evaluate((img: HTMLImageElement) => ({
        width: img.naturalWidth,
        height: img.naturalHeight,
      }));

      // ズーム前の画像の下端座標（container座標系）を計算
      // transform-origin: 50% 50% の場合、画像の下端Y座標は:
      // bottomY = IMAGE_HEIGHT/2 * (scale + 1) + translateY
      const imageNaturalCenterY = naturalSize.height / 2;
      const bottomEdgeYBefore = imageNaturalCenterY * (afterDragTransform.scale + 1) + afterDragTransform.y;

      console.log('Before zoom - Bottom edge Y:', bottomEdgeYBefore);

      // ズームイン
      const newImageBbox = await image.boundingBox();
      if (!newImageBbox) throw new Error('Image bounding box not found');
      const zoomImageCenterX = newImageBbox.x + newImageBbox.width / 2;
      const zoomImageCenterY = newImageBbox.y + newImageBbox.height / 2;

      await page.mouse.move(zoomImageCenterX, zoomImageCenterY);
      await page.mouse.wheel(0, -100); // ズームイン

      // ズーム後の transform を取得
      const afterZoomTransform = await image.evaluate((img: HTMLImageElement) => {
        const transformMatch = img.style.transform.match(/translate\(([^,]+),\s*([^)]+)\)\s*scale\(([^)]+)\)/);
        if (!transformMatch) return { x: 0, y: 0, scale: 1 };
        return {
          x: parseFloat(transformMatch[1]),
          y: parseFloat(transformMatch[2]),
          scale: parseFloat(transformMatch[3]),
        };
      });

      // ズーム後の画像の下端座標（container座標系）を計算
      const bottomEdgeYAfter = imageNaturalCenterY * (afterZoomTransform.scale + 1) + afterZoomTransform.y;

      console.log('After zoom - Bottom edge Y:', bottomEdgeYAfter);
      console.log('Difference:', Math.abs(bottomEdgeYAfter - bottomEdgeYBefore));

      // ズーム前後で画像の下端座標が変わらないはず（下端が円の下端に固定される）
      // 誤差を考慮して2px以内であればOK
      expect(Math.abs(bottomEdgeYAfter - bottomEdgeYBefore)).toBeLessThan(2);
    });

    test('画像が左端にいるときは左端を基準にズームする', async ({ page }) => {
      // 横長画像に切り替え
      // IMAGE_TYPE_ORDER = ['vertical', 'horizontal', 'square'] なので、
      // vertical をセットすると次のリロードで horizontal になる
      await page.evaluate(() => {
        localStorage.setItem('currentImageType', 'vertical'); // 次のリロードで横長になる
      });
      await page.reload();
      await page.waitForTimeout(500);

      const image = page.locator('#cropperImage');
      await image.waitFor({ state: 'visible' });

      // 画像を左端までドラッグ
      const imageBbox = await image.boundingBox();
      if (!imageBbox) throw new Error('Image bounding box not found');

      const imageCenterX = imageBbox.x + imageBbox.width / 2;
      const imageCenterY = imageBbox.y + imageBbox.height / 2;

      // 右方向に大きくドラッグ（画像の左端がクロップ領域の中心付近に来るように）
      await page.mouse.move(imageCenterX, imageCenterY);
      await page.mouse.down();
      await page.mouse.move(imageCenterX + 300, imageCenterY, { steps: 10 });
      await page.mouse.up();

      // ドラッグ後の transform を取得
      const afterDragTransform = await image.evaluate((img: HTMLImageElement) => {
        const transformMatch = img.style.transform.match(/translate\(([^,]+),\s*([^)]+)\)\s*scale\(([^)]+)\)/);
        if (!transformMatch) return { x: 0, y: 0, scale: 1 };
        return {
          x: parseFloat(transformMatch[1]),
          y: parseFloat(transformMatch[2]),
          scale: parseFloat(transformMatch[3]),
        };
      });

      // 画像のnatural sizeを取得
      const naturalSize = await image.evaluate((img: HTMLImageElement) => ({
        width: img.naturalWidth,
        height: img.naturalHeight,
      }));

      // ズーム前の画像の左端座標（container座標系）を計算
      // transform-origin: 50% 50% の場合、画像の左端X座標は:
      // leftX = IMAGE_WIDTH/2 * (1 - scale) + translateX
      const imageNaturalCenterX = naturalSize.width / 2;
      const leftEdgeXBefore = imageNaturalCenterX * (1 - afterDragTransform.scale) + afterDragTransform.x;

      console.log('Before zoom - Left edge X:', leftEdgeXBefore);

      // ズームイン
      const newImageBbox = await image.boundingBox();
      if (!newImageBbox) throw new Error('Image bounding box not found');
      const zoomImageCenterX = newImageBbox.x + newImageBbox.width / 2;
      const zoomImageCenterY = newImageBbox.y + newImageBbox.height / 2;

      await page.mouse.move(zoomImageCenterX, zoomImageCenterY);
      await page.mouse.wheel(0, -100); // ズームイン

      // ズーム後の transform を取得
      const afterZoomTransform = await image.evaluate((img: HTMLImageElement) => {
        const transformMatch = img.style.transform.match(/translate\(([^,]+),\s*([^)]+)\)\s*scale\(([^)]+)\)/);
        if (!transformMatch) return { x: 0, y: 0, scale: 1 };
        return {
          x: parseFloat(transformMatch[1]),
          y: parseFloat(transformMatch[2]),
          scale: parseFloat(transformMatch[3]),
        };
      });

      // ズーム後の画像の左端座標（container座標系）を計算
      const leftEdgeXAfter = imageNaturalCenterX * (1 - afterZoomTransform.scale) + afterZoomTransform.x;

      console.log('After zoom - Left edge X:', leftEdgeXAfter);
      console.log('Difference:', Math.abs(leftEdgeXAfter - leftEdgeXBefore));

      // ズーム前後で画像の左端座標が変わらないはず（左端が円の左端に固定される）
      // 誤差を考慮して2px以内であればOK
      expect(Math.abs(leftEdgeXAfter - leftEdgeXBefore)).toBeLessThan(2);

      // 画像タイプを元に戻す（他のテストへの影響を防ぐ）
      await page.evaluate(() => {
        localStorage.setItem('currentImageType', 'square'); // 次のリロードで vertical に戻る
      });
    });

    test('初期状態からズームアウトできない（最小スケール制限）', async ({ page }) => {
      const image = page.locator('#cropperImage');
      await image.waitFor({ state: 'visible' });

      // 初期 scale を取得
      const initialScale = await image.evaluate((img: HTMLImageElement) => {
        const match = img.style.transform.match(/scale\(([^)]+)\)/);
        return match ? parseFloat(match[1]) : 1;
      });

      // 画像の中心でズームアウトを試みる
      const imageBbox = await image.boundingBox();
      if (!imageBbox) throw new Error('Image bounding box not found');

      const imageCenterX = imageBbox.x + imageBbox.width / 2;
      const imageCenterY = imageBbox.y + imageBbox.height / 2;

      await page.mouse.move(imageCenterX, imageCenterY);
      // 下スクロール = ズームアウト（複数回試行）
      await page.mouse.wheel(0, 100);
      await page.mouse.wheel(0, 100);
      await page.mouse.wheel(0, 100);

      // ズームアウト後の scale を取得
      const afterZoomOutScale = await image.evaluate((img: HTMLImageElement) => {
        const match = img.style.transform.match(/scale\(([^)]+)\)/);
        return match ? parseFloat(match[1]) : 1;
      });

      console.log('Initial scale:', initialScale);
      console.log('After zoom out attempts:', afterZoomOutScale);

      // 初期スケールより小さくならないはず（クロップ領域に画像外の部分が入らないように）
      expect(afterZoomOutScale).toBeGreaterThanOrEqual(initialScale);
    });
  });

  test.describe('回転機能', () => {
    test('回転ボタンで-90度回転する', async ({ page }) => {
      const container = page.locator('#imageContainer');
      const rotateBtn = page.locator('#rotateBtn');

      await container.waitFor({ state: 'visible' });

      // 初期回転角度を確認
      const initialRotation = await container.evaluate((el: HTMLElement) => {
        const transform = el.style.transform;
        const match = transform.match(/rotate\(([^)]+)\)/);
        return match ? match[1] : '0deg';
      });

      expect(initialRotation).toBe('0deg');

      // 回転ボタンをクリック
      await rotateBtn.click();

      // 回転後の角度を確認
      const afterRotation = await container.evaluate((el: HTMLElement) => {
        const transform = el.style.transform;
        const match = transform.match(/rotate\(([^)]+)\)/);
        return match ? match[1] : '0deg';
      });

      expect(afterRotation).toBe('-90deg');
    });
  });

  test.describe('クロップ領域のUI', () => {
    test('クロップ領域に四隅を結ぶ1pxの白いborderが表示される', async ({ page }) => {
      const cropArea = page.locator('#cropArea');
      await cropArea.waitFor({ state: 'visible' });

      // borderスタイルを取得
      const borderStyle = await cropArea.evaluate((el: HTMLElement) => {
        const computed = window.getComputedStyle(el);
        return {
          borderTopWidth: computed.borderTopWidth,
          borderRightWidth: computed.borderRightWidth,
          borderBottomWidth: computed.borderBottomWidth,
          borderLeftWidth: computed.borderLeftWidth,
          borderTopColor: computed.borderTopColor,
          borderRightColor: computed.borderRightColor,
          borderBottomColor: computed.borderBottomColor,
          borderLeftColor: computed.borderLeftColor,
          borderTopStyle: computed.borderTopStyle,
          borderRightStyle: computed.borderRightStyle,
          borderBottomStyle: computed.borderBottomStyle,
          borderLeftStyle: computed.borderLeftStyle,
        };
      });

      console.log('Border style:', borderStyle);

      // 全ての辺が1pxであること
      expect(borderStyle.borderTopWidth).toBe('1px');
      expect(borderStyle.borderRightWidth).toBe('1px');
      expect(borderStyle.borderBottomWidth).toBe('1px');
      expect(borderStyle.borderLeftWidth).toBe('1px');

      // 全ての辺がsolidであること
      expect(borderStyle.borderTopStyle).toBe('solid');
      expect(borderStyle.borderRightStyle).toBe('solid');
      expect(borderStyle.borderBottomStyle).toBe('solid');
      expect(borderStyle.borderLeftStyle).toBe('solid');

      // 全ての辺が白色であること（rgb(255, 255, 255)）
      expect(borderStyle.borderTopColor).toBe('rgb(255, 255, 255)');
      expect(borderStyle.borderRightColor).toBe('rgb(255, 255, 255)');
      expect(borderStyle.borderBottomColor).toBe('rgb(255, 255, 255)');
      expect(borderStyle.borderLeftColor).toBe('rgb(255, 255, 255)');
    });

    test('SVGマスクの円がクロップ領域の位置とサイズに連動する', async ({ page }) => {
      const container = page.locator('#cropperContainer');
      const cropArea = page.locator('#cropArea');
      const maskCircle = page.locator('#cropMask circle');

      await cropArea.waitFor({ state: 'visible' });
      // maskCircle は mask 内の要素なので visible にはならないため、waitFor は不要

      // コンテナとクロップ領域のサイズと位置を取得
      const containerBbox = await container.boundingBox();
      const cropAreaBbox = await cropArea.boundingBox();
      if (!containerBbox) throw new Error('Container bounding box not found');
      if (!cropAreaBbox) throw new Error('Crop area bounding box not found');

      // SVG circleの属性を取得
      const circleAttrs = await maskCircle.evaluate((circle: SVGCircleElement) => ({
        cx: parseFloat(circle.getAttribute('cx') || '0'),
        cy: parseFloat(circle.getAttribute('cy') || '0'),
        r: parseFloat(circle.getAttribute('r') || '0'),
      }));

      // コンテナからの相対座標を計算（SVGの座標系はコンテナ基準）
      const relativeCropX = cropAreaBbox.x - containerBbox.x;
      const relativeCropY = cropAreaBbox.y - containerBbox.y;

      // 期待値：円の中心がクロップ領域の中心と一致（コンテナからの相対座標）
      const expectedCx = relativeCropX + cropAreaBbox.width / 2;
      const expectedCy = relativeCropY + cropAreaBbox.height / 2;
      const expectedR = cropAreaBbox.width / 2;

      // 円の中心座標がクロップ領域の中心と一致（±2pxの誤差許容）
      expect(Math.abs(circleAttrs.cx - expectedCx)).toBeLessThan(2);
      expect(Math.abs(circleAttrs.cy - expectedCy)).toBeLessThan(2);
      // 円の半径がクロップ領域の半径と一致（±2pxの誤差許容）
      expect(Math.abs(circleAttrs.r - expectedR)).toBeLessThan(2);
    });

    test('リサイズハンドルをドラッグしている最中も、SVGマスクの円がリアルタイムで更新される', async ({ page }) => {
      const container = page.locator('#cropperContainer');
      const cropArea = page.locator('#cropArea');
      const maskCircle = page.locator('#cropMask circle');
      const resizeHandle = page.locator('.resize-handle.bottom-right');

      await cropArea.waitFor({ state: 'visible' });

      // 初期状態のクロップ領域とSVG円の情報を取得
      const containerBbox = await container.boundingBox();
      const initialCropAreaBbox = await cropArea.boundingBox();
      if (!containerBbox) throw new Error('Container bounding box not found');
      if (!initialCropAreaBbox) throw new Error('Initial crop area bounding box not found');

      const initialCircleAttrs = await maskCircle.evaluate((circle: SVGCircleElement) => ({
        cx: parseFloat(circle.getAttribute('cx') || '0'),
        cy: parseFloat(circle.getAttribute('cy') || '0'),
        r: parseFloat(circle.getAttribute('r') || '0'),
      }));

      // リサイズハンドル（右下）をドラッグして縮める（拡大方向 = isZoomingIn = true）
      const handleBbox = await resizeHandle.boundingBox();
      if (!handleBbox) throw new Error('Handle bounding box not found');

      await page.mouse.move(handleBbox.x + handleBbox.width / 2, handleBbox.y + handleBbox.height / 2);
      await page.mouse.down();

      // ドラッグ中の位置（内側に-100px移動）
      await page.mouse.move(
        handleBbox.x + handleBbox.width / 2 - 100,
        handleBbox.y + handleBbox.height / 2 - 100,
        { steps: 5 } // 複数ステップでドラッグ
      );

      // ドラッグ中のクロップ領域とSVG円の情報を取得
      const duringDragCropAreaBbox = await cropArea.boundingBox();
      if (!duringDragCropAreaBbox) throw new Error('Crop area bounding box not found during drag');

      const duringDragCircleAttrs = await maskCircle.evaluate((circle: SVGCircleElement) => ({
        cx: parseFloat(circle.getAttribute('cx') || '0'),
        cy: parseFloat(circle.getAttribute('cy') || '0'),
        r: parseFloat(circle.getAttribute('r') || '0'),
      }));

      // ドラッグ中のクロップ領域の情報（コンテナ基準）
      const relativeCropX = duringDragCropAreaBbox.x - containerBbox.x;
      const relativeCropY = duringDragCropAreaBbox.y - containerBbox.y;
      const expectedCx = relativeCropX + duringDragCropAreaBbox.width / 2;
      const expectedCy = relativeCropY + duringDragCropAreaBbox.height / 2;
      const expectedR = duringDragCropAreaBbox.width / 2;

      console.log('During drag - Crop area bbox:', duringDragCropAreaBbox);
      console.log('During drag - Circle attrs:', duringDragCircleAttrs);
      console.log('During drag - Expected:', { cx: expectedCx, cy: expectedCy, r: expectedR });

      // ドラッグ中に円がリアルタイムで更新されていることを確認
      // 初期状態と異なっていること
      expect(duringDragCircleAttrs.r).not.toBe(initialCircleAttrs.r);

      // ドラッグ中の円の位置・サイズがクロップ領域に連動していること
      expect(Math.abs(duringDragCircleAttrs.cx - expectedCx)).toBeLessThan(2);
      expect(Math.abs(duringDragCircleAttrs.cy - expectedCy)).toBeLessThan(2);
      expect(Math.abs(duringDragCircleAttrs.r - expectedR)).toBeLessThan(2);

      // マウスアップ
      await page.mouse.up();
      await page.waitForTimeout(200); // transitionが完了するのを待つ

      // マウスアップ後の状態を確認（クロップ領域が元のサイズに戻り、画像がズームされる）
      const afterMouseUpCropAreaBbox = await cropArea.boundingBox();
      const afterMouseUpCircleAttrs = await maskCircle.evaluate((circle: SVGCircleElement) => ({
        cx: parseFloat(circle.getAttribute('cx') || '0'),
        cy: parseFloat(circle.getAttribute('cy') || '0'),
        r: parseFloat(circle.getAttribute('r') || '0'),
      }));

      console.log('After mouseup - Crop area bbox:', afterMouseUpCropAreaBbox);
      console.log('After mouseup - Circle attrs:', afterMouseUpCircleAttrs);

      // マウスアップ後はクロップ領域が元のサイズに戻っているはず
      if (!afterMouseUpCropAreaBbox) throw new Error('Crop area bounding box not found after mouseup');
      expect(Math.abs(afterMouseUpCropAreaBbox.width - initialCropAreaBbox.width)).toBeLessThan(2);
      expect(Math.abs(afterMouseUpCropAreaBbox.height - initialCropAreaBbox.height)).toBeLessThan(2);

      // マウスアップ後の円も初期状態と同じサイズに戻っているはず
      expect(Math.abs(afterMouseUpCircleAttrs.r - initialCircleAttrs.r)).toBeLessThan(2);
    });
  });
});

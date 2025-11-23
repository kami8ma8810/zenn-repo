import { test, expect } from '@playwright/test';

test.describe('Google式クロッパー デモ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo-cropper.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('初期状態', () => {
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

      // 初期 transform を取得
      const initialTransform = await image.evaluate((img: HTMLImageElement) => {
        const transformMatch = img.style.transform.match(/translate\(([^,]+),\s*([^)]+)\)\s*scale\(([^)]+)\)/);
        if (!transformMatch) return { x: 0, y: 0, scale: 1 };
        return {
          x: parseFloat(transformMatch[1]),
          y: parseFloat(transformMatch[2]),
          scale: parseFloat(transformMatch[3]),
        };
      });

      // 画像の中心でズームイン
      const imageBbox = await image.boundingBox();
      if (!imageBbox) throw new Error('Image bounding box not found');

      const imageCenterX = imageBbox.x + imageBbox.width / 2;
      const imageCenterY = imageBbox.y + imageBbox.height / 2;

      await page.mouse.move(imageCenterX, imageCenterY);
      await page.mouse.wheel(0, -100);

      // ズーム後の transform を取得
      const afterTransform = await image.evaluate((img: HTMLImageElement) => {
        const transformMatch = img.style.transform.match(/translate\(([^,]+),\s*([^)]+)\)\s*scale\(([^)]+)\)/);
        if (!transformMatch) return { x: 0, y: 0, scale: 1 };
        return {
          x: parseFloat(transformMatch[1]),
          y: parseFloat(transformMatch[2]),
          scale: parseFloat(transformMatch[3]),
        };
      });

      console.log('Initial transform:', initialTransform);
      console.log('After zoom:', afterTransform);

      // scale が変化している
      expect(afterTransform.scale).not.toBe(initialTransform.scale);

      // translate も変化している（クロップ領域中心を固定するため）
      expect(afterTransform.x).not.toBe(initialTransform.x);
      expect(afterTransform.y).not.toBe(initialTransform.y);
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
});

/**
 * Googleプロフィール画像クロッパーの挙動調査スクリプト
 *
 * このスクリプトはPuppeteerを使用してGoogleのプロフィール画像編集画面にアクセスし、
 * クロッパーの独特な挙動を詳細に調査します。
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Stealth Pluginを使用してGoogleの自動化検出を回避
puppeteer.use(StealthPlugin());

// 調査結果を格納する型定義
interface InvestigationResult {
  timestamp: string;
  cropperInfo: {
    containerSelector: string | null;
    imageSelector: string | null;
    cropAreaSelector: string | null;
    containerStyles: Record<string, string> | null;
    imageStyles: Record<string, string> | null;
    cropAreaStyles: Record<string, string> | null;
  };
  behaviorTests: {
    imageDraggable: boolean;
    cropAreaDraggable: boolean;
    zoomAvailable: boolean;
    rotateAvailable: boolean;
  };
  detectedLibraries: string[];
  scripts: string[];
  uniqueBehaviors: string[];
  screenshots: {
    initial: string;
    afterDrag: string;
    afterZoom: string;
  };
}

/**
 * 結果を保存するディレクトリを作成
 */
function ensureOutputDir(): string {
  const outputDir = join(process.cwd(), 'output');
  mkdirSync(outputDir, { recursive: true });
  return outputDir;
}

/**
 * Cookieを保存
 */
async function saveCookies(page: Page, outputDir: string): Promise<void> {
  const cookies = await page.cookies();
  const cookiePath = join(outputDir, 'cookies.json');
  writeFileSync(cookiePath, JSON.stringify(cookies, null, 2), 'utf-8');
  console.log(`🍪 Cookieを保存しました: ${cookiePath}`);
}

/**
 * Cookieを読み込み
 */
async function loadCookies(page: Page, outputDir: string): Promise<boolean> {
  const cookiePath = join(outputDir, 'cookies.json');

  if (!existsSync(cookiePath)) {
    console.log('🍪 保存されたCookieが見つかりません（初回実行）');
    return false;
  }

  try {
    const cookiesString = readFileSync(cookiePath, 'utf-8');
    const cookies = JSON.parse(cookiesString);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.setCookie(...(cookies as any));
    console.log('🍪 Cookieを読み込みました（ログイン状態を復元）');
    return true;
  } catch (error) {
    console.error('❌ Cookie読み込み中にエラー:', error);
    return false;
  }
}

/**
 * ページ内のスクリプトURLを取得
 */
async function getLoadedScripts(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    return scripts.map(script => script.getAttribute('src')).filter(Boolean) as string[];
  });
}

/**
 * クロッパー関連のライブラリを検出
 */
async function detectCropperLibraries(page: Page): Promise<string[]> {
  const scripts = await getLoadedScripts(page);
  const libraries: string[] = [];

  const knownLibraries = [
    { name: 'cropper.js', pattern: /cropper/i },
    { name: 'cropperjs', pattern: /cropperjs/i },
    { name: 'react-image-crop', pattern: /react-image-crop/i },
    { name: 'react-easy-crop', pattern: /react-easy-crop/i },
    { name: 'custom Google implementation', pattern: /google.*crop|profile.*crop/i },
  ];

  for (const lib of knownLibraries) {
    const found = scripts.some(src => lib.pattern.test(src));
    if (found) {
      libraries.push(lib.name);
    }
  }

  return libraries;
}

/**
 * クロッパー要素を特定
 */
async function identifyCropperElements(page: Page) {
  console.log('🔍 クロッパー要素を探索中...');

  // よくあるクロッパー要素のセレクタ候補
  const possibleSelectors = {
    container: [
      '[class*="crop"]',
      '[class*="Crop"]',
      '[data-testid*="crop"]',
      '[role="img"]',
      'canvas',
      '[class*="image-editor"]',
      '[class*="photo-editor"]',
    ],
    image: [
      'img[class*="crop"]',
      'img[class*="edit"]',
      'canvas',
      '[class*="cropper-image"]',
    ],
    cropArea: [
      '[class*="crop-area"]',
      '[class*="selection"]',
      '[class*="overlay"]',
      'svg',
    ],
  };

  const result: InvestigationResult['cropperInfo'] = {
    containerSelector: null,
    imageSelector: null,
    cropAreaSelector: null,
    containerStyles: null,
    imageStyles: null,
    cropAreaStyles: null,
  };

  // コンテナ要素を探す
  for (const selector of possibleSelectors.container) {
    try {
      const element = await page.$(selector);
      if (element) {
        console.log(`✅ コンテナ要素発見: ${selector}`);
        result.containerSelector = selector;

        // スタイルを取得
        result.containerStyles = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const styles = window.getComputedStyle(el);
          return {
            position: styles.position,
            overflow: styles.overflow,
            transform: styles.transform,
            width: styles.width,
            height: styles.height,
          };
        }, selector);

        break;
      }
    } catch (error) {
      // セレクタが無効な場合はスキップ
      continue;
    }
  }

  // 画像要素を探す
  for (const selector of possibleSelectors.image) {
    try {
      const element = await page.$(selector);
      if (element) {
        console.log(`✅ 画像要素発見: ${selector}`);
        result.imageSelector = selector;

        result.imageStyles = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const styles = window.getComputedStyle(el);
          return {
            position: styles.position,
            transform: styles.transform,
            cursor: styles.cursor,
            userSelect: styles.userSelect,
            pointerEvents: styles.pointerEvents,
          };
        }, selector);

        break;
      }
    } catch (error) {
      continue;
    }
  }

  return result;
}

/**
 * 挙動テストを実行
 */
async function testBehaviors(page: Page, imageSelector: string | null): Promise<InvestigationResult['behaviorTests']> {
  console.log('🧪 挙動テストを実行中...');

  const result: InvestigationResult['behaviorTests'] = {
    imageDraggable: false,
    cropAreaDraggable: false,
    zoomAvailable: false,
    rotateAvailable: false,
  };

  if (!imageSelector) {
    console.log('⚠️ 画像要素が見つからないため、挙動テストをスキップします');
    return result;
  }

  try {
    // 画像がドラッグ可能かテスト
    const isDraggable = await page.evaluate((selector) => {
      const element = document.querySelector(selector) as HTMLElement;
      if (!element) return false;

      const styles = window.getComputedStyle(element);
      return styles.cursor === 'move' || styles.cursor === 'grab' || element.draggable;
    }, imageSelector);

    result.imageDraggable = isDraggable;

    // ズーム機能の存在確認
    const hasZoom = await page.evaluate(() => {
      // ズームボタンやスライダーの存在確認
      const zoomButtons = document.querySelectorAll('[aria-label*="zoom" i], [title*="zoom" i], input[type="range"]');
      return zoomButtons.length > 0;
    });

    result.zoomAvailable = hasZoom;

    // 回転機能の存在確認
    const hasRotate = await page.evaluate(() => {
      const rotateButtons = document.querySelectorAll('[aria-label*="rotat" i], [title*="rotat" i]');
      return rotateButtons.length > 0;
    });

    result.rotateAvailable = hasRotate;

    console.log('✅ 挙動テスト完了');
  } catch (error) {
    console.error('❌ 挙動テスト中にエラー:', error);
  }

  return result;
}

/**
 * 独特な挙動を検出
 */
async function detectUniqueBehaviors(page: Page): Promise<string[]> {
  console.log('🔎 独特な挙動を検出中...');

  const behaviors: string[] = [];

  try {
    // クロップ領域が固定で画像が動くかチェック
    const cropAreaFixed = await page.evaluate(() => {
      const cropArea = document.querySelector('[class*="crop"]');
      if (!cropArea) return false;

      const styles = window.getComputedStyle(cropArea);
      return styles.position === 'fixed' || styles.position === 'absolute';
    });

    if (cropAreaFixed) {
      behaviors.push('クロップ領域が固定位置に配置されている（画像が動く方式の可能性）');
    }

    // Canvas使用の検出
    const usesCanvas = await page.evaluate(() => {
      return document.querySelectorAll('canvas').length > 0;
    });

    if (usesCanvas) {
      behaviors.push('Canvas要素を使用している');
    }

    // CSS Transform使用の検出
    const usesTransform = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      for (const img of images) {
        const styles = window.getComputedStyle(img);
        if (styles.transform !== 'none') {
          return true;
        }
      }
      return false;
    });

    if (usesTransform) {
      behaviors.push('CSS Transformを使用して画像を操作している');
    }

  } catch (error) {
    console.error('❌ 独特な挙動の検出中にエラー:', error);
  }

  return behaviors;
}

/**
 * スクリーンショットを撮影
 */
async function takeScreenshots(page: Page, outputDir: string): Promise<InvestigationResult['screenshots']> {
  console.log('📸 スクリーンショットを撮影中...');

  const screenshots = {
    initial: join(outputDir, 'screenshot-initial.png'),
    afterDrag: join(outputDir, 'screenshot-after-drag.png'),
    afterZoom: join(outputDir, 'screenshot-after-zoom.png'),
  };

  try {
    await page.screenshot({ path: screenshots.initial, fullPage: false });
    console.log(`✅ 初期状態のスクリーンショット保存: ${screenshots.initial}`);

    // TODO: 実際のドラッグ・ズーム操作後のスクリーンショット
    // （ユーザーが手動で操作した後にスクリーンショットを撮る方式）

  } catch (error) {
    console.error('❌ スクリーンショット撮影中にエラー:', error);
  }

  return screenshots;
}

/**
 * メイン調査関数
 */
async function investigateGoogleCropper() {
  console.log('🚀 Googleプロフィール画像クロッパーの調査を開始します\n');

  const outputDir = ensureOutputDir();
  const isHeadless = process.argv.includes('--headless');

  const browser: Browser = await puppeteer.launch({
    headless: isHeadless,
    defaultViewport: { width: 1280, height: 720 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled', // 自動化検出を回避
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--flag-switches-begin',
      '--disable-site-isolation-trials',
      '--flag-switches-end'
    ],
  });

  const page: Page = await browser.newPage();

  // より本物のブラウザに見せるための設定
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  );

  try {
    // 保存されたCookieを読み込み（2回目以降はログイン状態を復元）
    const hasCookies = await loadCookies(page, outputDir);

    console.log('📄 Googleアカウント設定ページにアクセス中...\n');
    await page.goto('https://myaccount.google.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // ユーザーに手動でログインしてもらう
    if (!isHeadless) {
      if (hasCookies) {
        console.log('\n⏸️  ========================================');
        console.log('✅ ログイン状態を復元しました！');
        console.log('📝 以下の手順で進めてください:');
        console.log('   1. プロフィール画像をクリックして編集画面を開いてください');
        console.log('   2. クロッパー画面が表示されたら、このターミナルに戻ってEnterキーを押してください');
        console.log('========================================\n');
      } else {
        console.log('\n⏸️  ========================================');
        console.log('📝 以下の手順で進めてください:');
        console.log('   1. ブラウザでGoogleにログインしてください');
        console.log('   2. プロフィール画像をクリックして編集画面を開いてください');
        console.log('   3. クロッパー画面が表示されたら、このターミナルに戻ってEnterキーを押してください');
        console.log('   ※ ログイン情報は次回のために保存されます');
        console.log('========================================\n');
      }

      // ユーザーの入力を待つ
      await new Promise<void>((resolve) => {
        process.stdin.once('data', () => resolve());
      });

      // ログイン完了後、Cookieを保存（初回のみ）
      if (!hasCookies) {
        await saveCookies(page, outputDir);
      }
    }

    console.log('\n🔍 調査を開始します...\n');

    // スクリプトURLを取得
    const scripts = await getLoadedScripts(page);
    console.log(`📦 読み込まれているスクリプト数: ${scripts.length}`);

    // ライブラリ検出
    const detectedLibraries = await detectCropperLibraries(page);
    console.log(`📚 検出されたライブラリ: ${detectedLibraries.length > 0 ? detectedLibraries.join(', ') : 'なし'}\n`);

    // クロッパー要素を特定
    const cropperInfo = await identifyCropperElements(page);

    // 挙動テスト
    const behaviorTests = await testBehaviors(page, cropperInfo.imageSelector);

    // 独特な挙動の検出
    const uniqueBehaviors = await detectUniqueBehaviors(page);

    // スクリーンショット撮影
    const screenshots = await takeScreenshots(page, outputDir);

    // 結果をまとめる
    const result: InvestigationResult = {
      timestamp: new Date().toISOString(),
      cropperInfo,
      behaviorTests,
      detectedLibraries,
      scripts: scripts.slice(0, 20), // 最初の20個のみ
      uniqueBehaviors,
      screenshots,
    };

    // 結果をJSON形式で保存
    const jsonPath = join(outputDir, 'investigation-result.json');
    writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`\n💾 調査結果をJSON形式で保存: ${jsonPath}`);

    // 結果をマークダウン形式で保存
    const markdownContent = generateMarkdownReport(result);
    const mdPath = join(outputDir, 'investigation-report.md');
    writeFileSync(mdPath, markdownContent, 'utf-8');
    console.log(`📄 調査レポートをマークダウン形式で保存: ${mdPath}`);

    console.log('\n✅ 調査が完了しました！\n');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
  } finally {
    if (!isHeadless) {
      console.log('\n⏸️  ブラウザを閉じるにはEnterキーを押してください...');
      await new Promise<void>((resolve) => {
        process.stdin.once('data', () => resolve());
      });
    }

    await browser.close();
    console.log('🔚 ブラウザを閉じました');
  }
}

/**
 * マークダウンレポートを生成
 */
function generateMarkdownReport(result: InvestigationResult): string {
  return `# Googleプロフィール画像クロッパー調査レポート

**調査日時**: ${new Date(result.timestamp).toLocaleString('ja-JP')}

---

## 📊 調査結果サマリー

### 検出されたライブラリ

${result.detectedLibraries.length > 0
  ? result.detectedLibraries.map(lib => `- ${lib}`).join('\n')
  : '- なし（独自実装の可能性）'
}

### クロッパー要素の情報

#### コンテナ要素
- **セレクタ**: \`${result.cropperInfo.containerSelector || '未検出'}\`
- **スタイル**:
\`\`\`json
${JSON.stringify(result.cropperInfo.containerStyles, null, 2)}
\`\`\`

#### 画像要素
- **セレクタ**: \`${result.cropperInfo.imageSelector || '未検出'}\`
- **スタイル**:
\`\`\`json
${JSON.stringify(result.cropperInfo.imageStyles, null, 2)}
\`\`\`

---

## 🧪 挙動テスト結果

| 項目 | 結果 |
|------|------|
| 画像がドラッグ可能 | ${result.behaviorTests.imageDraggable ? '✅ はい' : '❌ いいえ'} |
| クロップ領域がドラッグ可能 | ${result.behaviorTests.cropAreaDraggable ? '✅ はい' : '❌ いいえ'} |
| ズーム機能あり | ${result.behaviorTests.zoomAvailable ? '✅ はい' : '❌ いいえ'} |
| 回転機能あり | ${result.behaviorTests.rotateAvailable ? '✅ はい' : '❌ いいえ'} |

---

## 🎯 検出された独特な挙動

${result.uniqueBehaviors.length > 0
  ? result.uniqueBehaviors.map((behavior, i) => `${i + 1}. ${behavior}`).join('\n')
  : 'なし'
}

---

## 📸 スクリーンショット

- **初期状態**: \`${result.screenshots.initial}\`
- **ドラッグ後**: \`${result.screenshots.afterDrag}\`
- **ズーム後**: \`${result.screenshots.afterZoom}\`

---

## 🔧 技術的な推測

### 実装方法の推測

${result.uniqueBehaviors.includes('Canvas要素を使用している')
  ? '- Canvas APIを使用した独自実装の可能性が高い'
  : ''
}

${result.uniqueBehaviors.includes('CSS Transformを使用して画像を操作している')
  ? '- CSS Transformで画像を移動・拡大している'
  : ''
}

${result.uniqueBehaviors.includes('クロップ領域が固定位置に配置されている（画像が動く方式の可能性）')
  ? '- **重要**: クロップ領域を固定し、画像側を動かす方式（一般的なクロッパーとは逆）'
  : ''
}

### 推奨される実装アプローチ

Googleと同様の挙動を実装する場合:

1. **固定クロップ領域方式**
   - クロップ枠を画面中央に固定配置
   - 画像をドラッグ・ズームで動かす
   - CSS Transform（translate, scale）を使用

2. **Canvas APIの活用**
   - プレビュー表示にCanvas要素を使用
   - クロップ結果の生成も Canvas.toDataURL()

3. **UX最適化**
   - ピンチズーム対応（タッチデバイス）
   - スムーズなアニメーション
   - 画像の範囲外制限

---

## 📚 参考情報

- 読み込まれているスクリプト総数: ${result.scripts.length}
- 詳細なスクリプトリストは \`investigation-result.json\` を参照

---

**生成日時**: ${new Date().toLocaleString('ja-JP')}
`;
}

// スクリプト実行
investigateGoogleCropper().catch(console.error);

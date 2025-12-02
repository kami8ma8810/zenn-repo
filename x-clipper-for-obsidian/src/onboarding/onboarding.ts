import { getSettings, saveSettings } from '@/lib/storage'
import { testConnection } from '@/lib/obsidian-api'

/**
 * オンボーディング画面のロジック
 */

/** 現在のステップ（1-4） */
let currentStep = 1
const totalSteps = 4

/** 接続テストが成功したかどうか */
let isConnectionTested = false

/** DOM要素のキャッシュ */
interface Elements {
  stepProgress: HTMLElement
  stepItems: NodeListOf<HTMLElement>
  stepContents: NodeListOf<HTMLElement>
  prevBtn: HTMLButtonElement
  nextBtn: HTMLButtonElement
  completeBtn: HTMLButtonElement
  apiUrlInput: HTMLInputElement
  apiKeyInput: HTMLInputElement
  testConnectionBtn: HTMLButtonElement
  connectionResult: HTMLElement
}

let elements: Elements

/**
 * 初期化
 */
async function init(): Promise<void> {
  // DOM要素を取得
  elements = {
    stepProgress: document.querySelector('.step-progress') as HTMLElement,
    stepItems: document.querySelectorAll('.step-item') as NodeListOf<HTMLElement>,
    stepContents: document.querySelectorAll('.step-content') as NodeListOf<HTMLElement>,
    prevBtn: document.getElementById('prevBtn') as HTMLButtonElement,
    nextBtn: document.getElementById('nextBtn') as HTMLButtonElement,
    completeBtn: document.getElementById('completeBtn') as HTMLButtonElement,
    apiUrlInput: document.getElementById('apiUrlInput') as HTMLInputElement,
    apiKeyInput: document.getElementById('apiKeyInput') as HTMLInputElement,
    testConnectionBtn: document.getElementById('testConnectionBtn') as HTMLButtonElement,
    connectionResult: document.getElementById('connectionResult') as HTMLElement,
  }

  // 保存済みの設定を読み込み
  const settings = await getSettings()
  elements.apiUrlInput.value = settings.obsidianApiUrl
  elements.apiKeyInput.value = settings.obsidianApiKey

  // イベントリスナーを設定
  setupEventListeners()

  // 多言語対応
  applyI18n()

  // 初期表示を更新
  updateStepDisplay()
}

/**
 * イベントリスナーを設定
 */
function setupEventListeners(): void {
  // 戻るボタン
  elements.prevBtn.addEventListener('click', goToPrevStep)

  // 次へボタン
  elements.nextBtn.addEventListener('click', goToNextStep)

  // 完了ボタン
  elements.completeBtn.addEventListener('click', handleComplete)

  // 接続テストボタン
  elements.testConnectionBtn.addEventListener('click', handleTestConnection)

  // API入力欄の変更時に接続テスト状態をリセット
  elements.apiUrlInput.addEventListener('input', resetConnectionTest)
  elements.apiKeyInput.addEventListener('input', resetConnectionTest)
}

/**
 * 前のステップへ
 */
function goToPrevStep(): void {
  if (currentStep > 1) {
    currentStep--
    updateStepDisplay()
  }
}

/**
 * 次のステップへ
 */
function goToNextStep(): void {
  if (currentStep < totalSteps) {
    currentStep++
    updateStepDisplay()
  }
}

/**
 * ステップ表示を更新
 */
function updateStepDisplay(): void {
  // ステップインジケーターを更新
  elements.stepItems.forEach((item, index) => {
    const stepNum = index + 1
    item.classList.remove('active', 'completed')

    if (stepNum === currentStep) {
      item.classList.add('active')
    } else if (stepNum < currentStep) {
      item.classList.add('completed')
    }
  })

  // プログレスバーのaria属性を更新
  elements.stepProgress.setAttribute('aria-valuenow', String(currentStep))

  // コンテンツを表示/非表示
  elements.stepContents.forEach((content, index) => {
    const stepNum = index + 1
    if (stepNum === currentStep) {
      content.hidden = false
      content.removeAttribute('hidden')
    } else {
      content.hidden = true
      content.setAttribute('hidden', '')
    }
  })

  // ナビゲーションボタンを更新
  updateNavigationButtons()
}

/**
 * ナビゲーションボタンの表示を更新
 */
function updateNavigationButtons(): void {
  // 戻るボタン
  if (currentStep === 1) {
    elements.prevBtn.hidden = true
  } else {
    elements.prevBtn.hidden = false
  }

  // 次へ / 完了ボタン
  if (currentStep === totalSteps) {
    elements.nextBtn.hidden = true
    elements.completeBtn.hidden = false
    // 接続テスト成功時のみ完了ボタンを有効化
    elements.completeBtn.disabled = !isConnectionTested
  } else {
    elements.nextBtn.hidden = false
    elements.completeBtn.hidden = true
  }
}

/**
 * 接続テストを実行
 */
async function handleTestConnection(): Promise<void> {
  const btnText = elements.testConnectionBtn.querySelector('.btn-text') as HTMLElement
  const btnLoading = elements.testConnectionBtn.querySelector('.btn-loading') as HTMLElement

  // ローディング表示
  btnText.hidden = true
  btnLoading.hidden = false
  elements.testConnectionBtn.disabled = true
  elements.connectionResult.textContent = ''
  elements.connectionResult.className = 'connection-result'

  try {
    // 設定を一時的に構築
    const settings = {
      obsidianApiUrl: elements.apiUrlInput.value.trim(),
      obsidianApiKey: elements.apiKeyInput.value.trim(),
      defaultFolder: 'X Clipper',
      imageFolder: 'X Clipper/images',
    }

    // 接続テスト
    const connected = await testConnection(settings)

    if (connected) {
      // 成功
      isConnectionTested = true
      elements.connectionResult.textContent = getMessage('onboardingConnectionSuccess')
      elements.connectionResult.className = 'connection-result success'

      // 設定を保存
      await saveSettings({
        obsidianApiUrl: settings.obsidianApiUrl,
        obsidianApiKey: settings.obsidianApiKey,
      })
    } else {
      // 失敗
      isConnectionTested = false
      elements.connectionResult.textContent = getMessage('onboardingConnectionFailed')
      elements.connectionResult.className = 'connection-result error'
    }
  } catch (error) {
    // エラー
    isConnectionTested = false
    elements.connectionResult.textContent = getMessage('onboardingConnectionFailed')
    elements.connectionResult.className = 'connection-result error'
    console.error('Connection test failed:', error)
  } finally {
    // ローディング解除
    btnText.hidden = false
    btnLoading.hidden = true
    elements.testConnectionBtn.disabled = false

    // 完了ボタンの状態を更新
    updateNavigationButtons()
  }
}

/**
 * 接続テスト状態をリセット
 */
function resetConnectionTest(): void {
  isConnectionTested = false
  elements.connectionResult.textContent = ''
  elements.connectionResult.className = 'connection-result'
  updateNavigationButtons()
}

/**
 * 完了処理
 */
async function handleComplete(): Promise<void> {
  // 設定が保存されていることを確認
  const settings = {
    obsidianApiUrl: elements.apiUrlInput.value.trim(),
    obsidianApiKey: elements.apiKeyInput.value.trim(),
  }

  await saveSettings(settings)

  // タブを閉じる
  window.close()
}

/**
 * 多言語メッセージを取得
 */
function getMessage(key: string): string {
  return chrome.i18n.getMessage(key) || key
}

/**
 * 多言語対応を適用
 */
function applyI18n(): void {
  // data-i18n 属性を持つ要素を処理
  const elements = document.querySelectorAll('[data-i18n]')
  elements.forEach((el) => {
    const key = el.getAttribute('data-i18n')
    if (key) {
      const message = getMessage(key)
      if (message && message !== key) {
        el.textContent = message
      }
    }
  })
}

// DOMContentLoaded で初期化
document.addEventListener('DOMContentLoaded', init)

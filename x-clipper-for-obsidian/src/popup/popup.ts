import { isValidTweetUrl } from '@/lib/tweet-parser'
import { getSettings, saveSettings } from '@/lib/storage'
import { testConnection, listFolders } from '@/lib/obsidian-api'
import { createTagManager, type TagManager } from '@/lib/tag-manager'
import { shouldSaveAsThread } from '@/lib/thread-utils'

/** DOM要素（遅延初期化） */
let elements: {
  statusDot: HTMLElement
  statusText: HTMLElement
  settingsSection: HTMLElement
  apiUrlInput: HTMLInputElement
  apiKeyInput: HTMLInputElement
  testConnectionBtn: HTMLButtonElement
  connectionResult: HTMLElement
  urlInput: HTMLInputElement
  urlError: HTMLElement
  threadInfo: HTMLElement
  threadCount: HTMLElement
  mergeThreadCheckbox: HTMLInputElement
  folderSelect: HTMLSelectElement
  tagInput: HTMLInputElement
  addTagBtn: HTMLButtonElement
  tagList: HTMLElement
  tagCount: HTMLElement
  saveBtn: HTMLButtonElement
  saveBtnText: HTMLElement
  saveBtnLoading: HTMLElement
  result: HTMLElement
  resultText: HTMLElement
  settingsBtn: HTMLElement
}

/** タグ管理インスタンス */
let tagManager: TagManager

/** スレッド情報 */
let detectedThreadCount = 0

function initElements(): void {
  elements = {
    statusDot: document.getElementById('statusDot')!,
    statusText: document.getElementById('statusText')!,
    settingsSection: document.getElementById('settingsSection')!,
    apiUrlInput: document.getElementById('apiUrlInput') as HTMLInputElement,
    apiKeyInput: document.getElementById('apiKeyInput') as HTMLInputElement,
    testConnectionBtn: document.getElementById('testConnectionBtn') as HTMLButtonElement,
    connectionResult: document.getElementById('connectionResult')!,
    urlInput: document.getElementById('urlInput') as HTMLInputElement,
    urlError: document.getElementById('urlError')!,
    threadInfo: document.getElementById('threadInfo')!,
    threadCount: document.getElementById('threadCount')!,
    mergeThreadCheckbox: document.getElementById('mergeThreadCheckbox') as HTMLInputElement,
    folderSelect: document.getElementById('folderSelect') as HTMLSelectElement,
    tagInput: document.getElementById('tagInput') as HTMLInputElement,
    addTagBtn: document.getElementById('addTagBtn') as HTMLButtonElement,
    tagList: document.getElementById('tagList')!,
    tagCount: document.getElementById('tagCount')!,
    saveBtn: document.getElementById('saveBtn') as HTMLButtonElement,
    saveBtnText: document.querySelector('.btn-text')!,
    saveBtnLoading: document.querySelector('.btn-loading')!,
    result: document.getElementById('result')!,
    resultText: document.getElementById('resultText')!,
    settingsBtn: document.getElementById('settingsBtn')!,
  }
}

/** 状態 */
let isConnected = false
let isSaving = false

/** 設定セクションが手動で表示されているか */
let isSettingsVisible = false

/**
 * 初期化
 */
async function init(): Promise<void> {
  // DOM要素を初期化
  initElements()

  // タグ管理を初期化
  tagManager = createTagManager()

  // イベントリスナーを設定
  elements.urlInput.addEventListener('input', handleUrlInput)
  elements.saveBtn.addEventListener('click', handleSave)
  elements.settingsBtn.addEventListener('click', toggleSettings)
  elements.testConnectionBtn.addEventListener('click', handleTestConnection)

  // タグ関連のイベントリスナー
  elements.addTagBtn.addEventListener('click', handleAddTag)
  elements.tagInput.addEventListener('keydown', handleTagInputKeydown)

  // 保存済みの設定を入力欄に反映
  const settings = await getSettings()
  elements.apiUrlInput.value = settings.obsidianApiUrl
  elements.apiKeyInput.value = settings.obsidianApiKey

  // 現在のタブからURLを取得
  await fillCurrentTabUrl()

  // Obsidian接続テスト
  await checkConnection()
}

/**
 * 現在のタブのURLを入力欄に設定し、スレッドを検出
 */
async function fillCurrentTabUrl(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.url && isValidTweetUrl(tab.url)) {
      elements.urlInput.value = tab.url
      validateUrl()

      // スレッド検出を試みる
      if (tab.id) {
        await detectThread(tab.id)
      }
    }
  } catch {
    // タブ取得に失敗しても続行
  }
}

/**
 * Content Scriptからスレッド情報を取得
 */
async function detectThread(tabId: number): Promise<void> {
  try {
    const result = await chrome.tabs.sendMessage(tabId, { type: 'GET_THREAD_DATA' }) as {
      success: boolean
      thread?: { tweets: unknown[] }
      error?: string
    }

    if (result?.success && result.thread && result.thread.tweets.length > 1) {
      detectedThreadCount = result.thread.tweets.length
      showThreadInfo(detectedThreadCount)
    } else {
      hideThreadInfo()
    }
  } catch {
    // Content Scriptが読み込まれていないなど
    hideThreadInfo()
  }
}

/**
 * スレッド情報を表示
 */
function showThreadInfo(count: number): void {
  elements.threadCount.textContent = `${count}件のスレッドを検出`
  elements.threadInfo.removeAttribute('hidden')
}

/**
 * スレッド情報を非表示
 */
function hideThreadInfo(): void {
  detectedThreadCount = 0
  elements.threadInfo.setAttribute('hidden', '')
}

/**
 * Obsidian接続をチェック
 */
async function checkConnection(): Promise<void> {
  updateConnectionStatus('checking')

  try {
    const settings = await getSettings()
    isConnected = await testConnection(settings)

    if (isConnected) {
      updateConnectionStatus('connected')
      await loadFolders()
    } else {
      updateConnectionStatus('disconnected')
    }
  } catch {
    isConnected = false
    updateConnectionStatus('disconnected')
  }

  updateSaveButton()
}

/**
 * 接続ステータスを更新
 */
function updateConnectionStatus(status: 'checking' | 'connected' | 'disconnected'): void {
  elements.statusDot.className = 'status-dot'

  switch (status) {
    case 'checking':
      elements.statusText.textContent = '確認中...'
      break
    case 'connected':
      elements.statusDot.classList.add('connected')
      elements.statusText.textContent = '接続中'
      // 手動で表示されていない限り、設定セクションを非表示
      if (!isSettingsVisible) {
        updateSettingsVisibility()
      }
      break
    case 'disconnected':
      elements.statusDot.classList.add('disconnected')
      elements.statusText.textContent = '未接続'
      // 未接続時はデフォルトで設定セクションを表示
      isSettingsVisible = true
      updateSettingsVisibility()
      break
  }
}

/**
 * 接続テスト
 */
async function handleTestConnection(): Promise<void> {
  // 末尾のスラッシュを除去
  const apiUrl = elements.apiUrlInput.value.trim().replace(/\/+$/, '')
  const apiKey = elements.apiKeyInput.value.trim()

  if (!apiUrl) {
    showConnectionResult('error', 'API URLを入力してください')
    return
  }

  // 入力欄も更新（スラッシュなしに）
  elements.apiUrlInput.value = apiUrl

  // 設定を保存
  await saveSettings({
    obsidianApiUrl: apiUrl,
    obsidianApiKey: apiKey,
  })

  showConnectionResult('', '接続テスト中...')

  // 再接続テスト
  await checkConnection()

  // 結果を表示
  if (isConnected) {
    showConnectionResult('success', '接続成功！')
  } else {
    showConnectionResult('error', '接続失敗！')
  }
}

/**
 * 接続結果を表示
 */
function showConnectionResult(type: 'success' | 'error' | '', message: string): void {
  elements.connectionResult.className = `connection-result ${type}`
  elements.connectionResult.textContent = message
}

/**
 * フォルダ一覧を読み込み
 */
async function loadFolders(): Promise<void> {
  try {
    const settings = await getSettings()
    const folders = await listFolders(settings)

    // デフォルトフォルダを追加
    if (!folders.includes(settings.defaultFolder)) {
      folders.unshift(settings.defaultFolder)
    }

    // セレクトボックスを更新
    elements.folderSelect.innerHTML = folders
      .map(folder => `<option value="${folder}">${folder}</option>`)
      .join('')

    // デフォルトフォルダを選択
    elements.folderSelect.value = settings.defaultFolder
  } catch {
    // フォルダ取得に失敗してもデフォルトのまま
  }
}

/**
 * URL入力ハンドラ
 */
function handleUrlInput(): void {
  validateUrl()
  hideResult()
}

/**
 * URLを検証
 */
function validateUrl(): boolean {
  const url = elements.urlInput.value.trim()

  if (!url) {
    elements.urlError.textContent = ''
    elements.urlInput.classList.remove('error')
    updateSaveButton()
    return false
  }

  if (!isValidTweetUrl(url)) {
    elements.urlError.textContent = chrome.i18n.getMessage('invalidUrl') || '有効なX/TwitterのURLを入力してください'
    elements.urlInput.classList.add('error')
    updateSaveButton()
    return false
  }

  elements.urlError.textContent = ''
  elements.urlInput.classList.remove('error')
  updateSaveButton()
  return true
}

/**
 * 保存ボタンの状態を更新
 */
function updateSaveButton(): void {
  const url = elements.urlInput.value.trim()
  const isValid = url && isValidTweetUrl(url)
  elements.saveBtn.disabled = !isConnected || !isValid || isSaving
}

/**
 * タグ追加ハンドラ
 * カンマ区切りで複数タグを一度に追加可能
 */
function handleAddTag(): void {
  const value = elements.tagInput.value.trim()
  if (!value) return

  // カンマ区切りで複数タグを追加
  const addedCount = tagManager.addTags(value)
  if (addedCount > 0) {
    elements.tagInput.value = ''
    renderTags()
  }

  // フォーカスを戻す
  elements.tagInput.focus()
}

/**
 * タグ入力欄でEnterキー押下時
 * IME入力中（変換中）は処理しない
 */
function handleTagInputKeydown(e: KeyboardEvent): void {
  // IME入力中（変換確定時など）は無視
  if (e.isComposing) {
    return
  }

  if (e.key === 'Enter') {
    e.preventDefault()
    handleAddTag()
  }
}

/**
 * タグ削除ハンドラ
 */
function handleRemoveTag(tag: string): void {
  tagManager.removeTag(tag)
  renderTags()
}

/**
 * タグリストを描画
 */
function renderTags(): void {
  const tags = tagManager.getTags()

  // タグ数を更新
  elements.tagCount.textContent = `(${tagManager.getCount()}/10)`

  // 追加ボタンの状態を更新
  elements.addTagBtn.disabled = !tagManager.canAddMore()

  // タグリストをクリアして再描画
  elements.tagList.innerHTML = ''

  tags.forEach(tag => {
    const tagElement = document.createElement('span')
    tagElement.className = 'tag-item'
    tagElement.setAttribute('role', 'listitem')

    const tagText = document.createElement('span')
    tagText.textContent = tag

    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'
    removeBtn.className = 'tag-remove-btn'
    removeBtn.setAttribute('aria-label', `${tag} を削除`)
    removeBtn.textContent = '×'
    removeBtn.addEventListener('click', () => handleRemoveTag(tag))

    tagElement.appendChild(tagText)
    tagElement.appendChild(removeBtn)
    elements.tagList.appendChild(tagElement)
  })
}

/**
 * 保存処理
 */
async function handleSave(): Promise<void> {
  if (!validateUrl() || !isConnected || isSaving) return

  const url = elements.urlInput.value.trim()
  const folder = elements.folderSelect.value
  const tags = tagManager.getTags()

  isSaving = true
  setSavingState(true)
  hideResult()

  try {
    // スレッドが検出されていて、かつ「まとめる」がONの場合のみスレッド保存
    const messageType = shouldSaveAsThread(detectedThreadCount, elements.mergeThreadCheckbox.checked)
      ? 'SAVE_THREAD'
      : 'SAVE_TWEET'

    const response = await chrome.runtime.sendMessage({
      type: messageType,
      data: { url, folder, tags },
    })

    if (response?.success) {
      const successMessage = messageType === 'SAVE_THREAD'
        ? `スレッド（${detectedThreadCount}件）を保存しました！`
        : chrome.i18n.getMessage('saveSuccess') || '保存しました！'
      showResult('success', successMessage)
    } else {
      showResult('error', response?.error || chrome.i18n.getMessage('saveError') || '保存に失敗しました')
    }
  } catch (error) {
    console.error('Save error:', error)
    const message = error instanceof Error ? error.message : '不明なエラー'
    showResult('error', message)
  }

  // 必ずローディングを解除
  isSaving = false
  setSavingState(false)
  updateSaveButton()
}

/**
 * 保存中の状態を設定
 */
function setSavingState(saving: boolean): void {
  if (saving) {
    elements.saveBtnText.textContent = chrome.i18n.getMessage('saving') || '保存中...'
    elements.saveBtnLoading.removeAttribute('hidden')
  } else {
    elements.saveBtnText.textContent = chrome.i18n.getMessage('saveButton') || '保存'
    elements.saveBtnLoading.setAttribute('hidden', '')
  }
}

/**
 * 結果を表示
 */
function showResult(type: 'success' | 'error', message: string): void {
  elements.result.className = `result ${type}`
  elements.resultText.textContent = message
  elements.result.removeAttribute('hidden')
}

/**
 * 結果を非表示
 */
function hideResult(): void {
  elements.result.setAttribute('hidden', '')
}

/**
 * 設定セクションの表示/非表示をトグル
 */
function toggleSettings(): void {
  isSettingsVisible = !isSettingsVisible
  updateSettingsVisibility()
}

/**
 * 設定セクションの表示状態を更新
 */
function updateSettingsVisibility(): void {
  // aria-expanded を更新
  elements.settingsBtn.setAttribute('aria-expanded', String(isSettingsVisible))

  // aria-label を更新（開閉状態に応じて）
  const labelKey = isSettingsVisible ? 'settingsClose' : 'settingsOpen'
  const fallbackLabel = isSettingsVisible ? '設定を閉じる' : '設定を開く'
  elements.settingsBtn.setAttribute(
    'aria-label',
    chrome.i18n.getMessage(labelKey) || fallbackLabel
  )

  // 設定セクションの表示/非表示
  if (isSettingsVisible) {
    elements.settingsSection.removeAttribute('hidden')
  } else {
    elements.settingsSection.setAttribute('hidden', '')
  }
}

// DOMContentLoaded後に初期化
document.addEventListener('DOMContentLoaded', init)

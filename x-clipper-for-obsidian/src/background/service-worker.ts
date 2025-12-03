import { getSettings } from '@/lib/storage'
import { fetchTweetViaOEmbed, formatTweetAsMarkdown, formatThreadAsMarkdown, generateFileName, generateThreadFileName } from '@/lib/tweet-parser'
import { createNote, getUniqueFilePath, downloadImage, saveImage, getImageExtension } from '@/lib/obsidian-api'
import type { MessageType, TweetData, ThreadData, ThreadExtractionResult } from '@/types'

/** Content Script から返される引用ツイートの情報 */
interface QuotedTweetData {
  text: string
  url: string
  authorUsername: string
  /** 添付画像のURLリスト */
  images?: string[]
  /** 動画が含まれているか */
  hasVideo?: boolean
  /** アニメーションGIFが含まれているか */
  hasAnimatedGif?: boolean
}

/** Content Script から返される画像データ */
interface TweetImageData {
  tweetId: string
  imageUrls: string[]
  authorBio?: string
  /** 動画が含まれているか */
  hasVideo: boolean
  /** アニメーションGIFが含まれているか */
  hasAnimatedGif: boolean
  /** 引用ツイートの情報 */
  quotedTweet?: QuotedTweetData
}

/**
 * メッセージリスナー
 * Popup や Content Script からのメッセージを処理
 */
chrome.runtime.onMessage.addListener((
  message: MessageType,
  _sender,
  sendResponse: (response: { success: boolean; error?: string; notePath?: string }) => void
) => {
  if (message.type === 'SAVE_TWEET') {
    handleSaveTweet(message.data.url, message.data.folder, message.data.tags)
      .then(notePath => sendResponse({ success: true, notePath }))
      .catch(error => {
        console.error('Failed to save tweet:', error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : '保存に失敗しました',
        })
      })

    // 非同期レスポンスを返すため true を返す
    return true
  }

  if (message.type === 'SAVE_THREAD') {
    handleSaveThread(message.data.url, message.data.folder, message.data.tags)
      .then(notePath => sendResponse({ success: true, notePath }))
      .catch(error => {
        console.error('Failed to save thread:', error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'スレッドの保存に失敗しました',
        })
      })

    return true
  }
})

/**
 * 現在アクティブなタブからツイート画像を取得
 */
async function getImagesFromContentScript(): Promise<TweetImageData | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return null

    // Content Script にメッセージを送信
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_TWEET_IMAGES' })
    return response as TweetImageData | null
  } catch {
    // Content Script が読み込まれていない場合など
    console.warn('Failed to get images from content script')
    return null
  }
}

/**
 * 画像をダウンロードしてObsidianに保存
 */
async function saveImagesToObsidian(
  tweet: TweetData,
  folder: string
): Promise<string[]> {
  const settings = await getSettings()
  const savedImagePaths: string[] = []

  for (let i = 0; i < tweet.images.length; i++) {
    const imageUrl = tweet.images[i]
    try {
      // 画像をダウンロード
      const imageBlob = await downloadImage(imageUrl)

      // 拡張子を決定
      const ext = getImageExtension(imageUrl, imageBlob.type)

      // ファイル名を生成
      const imageFileName = `tweet-${tweet.id}-${i + 1}.${ext}`

      // ファイルパスを生成（ノートと同じフォルダに保存）
      const imagePath = `${folder}/${imageFileName}`

      // Obsidianに保存
      await saveImage(imagePath, imageBlob, settings)
      savedImagePaths.push(imageFileName)
    } catch (error) {
      console.error(`Failed to save image ${i + 1}:`, error)
      // 1枚の画像保存に失敗しても続行
    }
  }

  return savedImagePaths
}

/**
 * 引用ツイートの画像をダウンロードしてObsidianに保存
 */
async function saveQuotedImagesToObsidian(
  imageUrls: string[],
  quotedUrl: string,
  folder: string
): Promise<string[]> {
  const settings = await getSettings()
  const savedImagePaths: string[] = []

  // 引用ツイートのIDをURLから抽出
  const match = quotedUrl.match(/\/status\/(\d+)/)
  const quotedTweetId = match ? match[1] : 'quoted'

  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i]
    try {
      const imageBlob = await downloadImage(imageUrl)
      const ext = getImageExtension(imageUrl, imageBlob.type)
      // 引用ツイートの画像は quoted- プレフィックスをつける
      const imageFileName = `quoted-${quotedTweetId}-${i + 1}.${ext}`
      const imagePath = `${folder}/${imageFileName}`
      await saveImage(imagePath, imageBlob, settings)
      savedImagePaths.push(imageFileName)
    } catch (error) {
      console.error(`Failed to save quoted image ${i + 1}:`, error)
    }
  }

  return savedImagePaths
}

/**
 * ツイートを保存
 * @param url ツイートURL
 * @param folder 保存先フォルダ
 * @param tags タグ配列
 * @param existingTweet 既存のツイートデータ（スレッドから引き継ぐ場合）
 * @returns 保存したノートのパス
 */
async function handleSaveTweet(url: string, folder: string, tags: string[], existingTweet?: TweetData): Promise<string> {
  const settings = await getSettings()

  let tweet: TweetData

  if (existingTweet) {
    // 既存のツイートデータがある場合はそれを使用
    tweet = existingTweet
  } else {
    // ツイートデータを取得
    tweet = await fetchTweetViaOEmbed(url)

    // Content Scriptから画像URLとBIOを取得（可能であれば）
    const imageData = await getImagesFromContentScript()

    if (imageData?.imageUrls && imageData.imageUrls.length > 0) {
      tweet.images = imageData.imageUrls
    }
    // BIOが取得できた場合はセット（ポスト詳細ページでのみ取得される）
    if (imageData?.authorBio) {
      tweet.authorBio = imageData.authorBio
    }
    // 動画/GIF 情報をセット
    if (imageData?.hasVideo) {
      tweet.hasVideo = true
    }
    if (imageData?.hasAnimatedGif) {
      tweet.hasAnimatedGif = true
    }
    // 引用ツイートの情報をセット（Content Script から取得した場合を優先）
    if (imageData?.quotedTweet) {
      tweet.quotedTweet = imageData.quotedTweet
    }
  }

  // ファイル名を生成（ツイートの出だし20文字）
  const fileName = generateFileName(tweet)
  const fileNameWithoutExt = fileName.replace(/\.md$/, '')

  // 画像がある場合（メインまたは引用）は専用フォルダを作成
  const hasMainImages = tweet.images.length > 0
  const hasQuotedImages = (tweet.quotedTweet?.images?.length ?? 0) > 0
  let noteFolder = folder
  let savedImagePaths: string[] = []
  let quotedSavedImagePaths: string[] = []

  if (hasMainImages || hasQuotedImages) {
    // 専用フォルダ: X Clipper/ツイートの出だし/
    noteFolder = `${folder}/${fileNameWithoutExt}`

    // メインツイートの画像を保存
    if (hasMainImages) {
      savedImagePaths = await saveImagesToObsidian(tweet, noteFolder)
    }

    // 引用ツイートの画像を保存
    if (hasQuotedImages && tweet.quotedTweet?.images) {
      quotedSavedImagePaths = await saveQuotedImagesToObsidian(
        tweet.quotedTweet.images,
        tweet.quotedTweet.url,
        noteFolder
      )
    }
  }

  // Markdown形式に変換（保存済み画像パス、タグを渡す）
  const markdown = formatTweetAsMarkdown(tweet, new Date(), savedImagePaths, tags, quotedSavedImagePaths)

  // ファイルパスを生成
  const basePath = `${noteFolder}/${fileName}`

  // 重複しないファイルパスを取得
  const filePath = await getUniqueFilePath(basePath, settings)

  // Obsidianに保存
  await createNote(filePath, markdown, settings)

  return filePath
}

/**
 * バックグラウンドタブを開いてスレッドデータを取得
 */
async function getThreadFromBackgroundTab(url: string): Promise<ThreadData | null> {
  let tabId: number | null = null

  try {
    // バックグラウンドでタブを作成
    const tab = await chrome.tabs.create({ url, active: false })
    tabId = tab.id ?? null

    if (!tabId) {
      throw new Error('Failed to create tab')
    }

    // ページの読み込み完了を待つ
    await new Promise<void>((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout>

      const listener = (changedTabId: number, changeInfo: { status?: string }) => {
        if (changedTabId === tabId && changeInfo.status === 'complete') {
          clearTimeout(timeoutId)
          chrome.tabs.onUpdated.removeListener(listener)
          resolve()
        }
      }

      timeoutId = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener)
        reject(new Error('Page load timeout'))
      }, 30000) // 30秒タイムアウト

      chrome.tabs.onUpdated.addListener(listener)
    })

    // 少し待ってからDOMが安定するのを待つ
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Content Scriptにメッセージを送信してスレッドを取得
    const result = await chrome.tabs.sendMessage(tabId, { type: 'GET_THREAD_DATA' }) as ThreadExtractionResult

    if (!result.success || !result.thread) {
      throw new Error(result.error ?? 'Failed to extract thread')
    }

    return result.thread
  } finally {
    // タブを閉じる
    if (tabId) {
      try {
        await chrome.tabs.remove(tabId)
      } catch {
        // タブが既に閉じられている場合は無視
      }
    }
  }
}

/**
 * スレッドの画像を保存
 * @returns ツイートIDごとの保存済みファイル名マップ
 */
async function saveThreadImagesToObsidian(
  thread: ThreadData,
  folder: string
): Promise<Map<string, string[]>> {
  const settings = await getSettings()
  const savedImageMap = new Map<string, string[]>()

  for (const tweet of thread.tweets) {
    const savedImages: string[] = []

    for (let i = 0; i < tweet.images.length; i++) {
      const imageUrl = tweet.images[i]
      try {
        const imageBlob = await downloadImage(imageUrl)
        const ext = getImageExtension(imageUrl, imageBlob.type)
        const imageFileName = `tweet-${tweet.id}-${i + 1}.${ext}`
        const imagePath = `${folder}/${imageFileName}`
        await saveImage(imagePath, imageBlob, settings)
        savedImages.push(imageFileName)
      } catch (error) {
        console.error(`Failed to save image:`, error)
        // 失敗した場合はプレースホルダーを追加
        savedImages.push(`tweet-${tweet.id}-${i + 1}.jpg`)
      }
    }

    if (savedImages.length > 0) {
      savedImageMap.set(tweet.id, savedImages)
    }
  }

  return savedImageMap
}

/**
 * 現在アクティブなタブからスレッドデータを取得
 */
async function getThreadFromActiveTab(): Promise<ThreadData | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return null

    const result = await chrome.tabs.sendMessage(tab.id, { type: 'GET_THREAD_DATA' }) as ThreadExtractionResult

    if (!result.success || !result.thread) {
      console.error('Failed to get thread from active tab:', result.error)
      return null
    }

    return result.thread
  } catch (error) {
    console.error('Failed to get thread from active tab:', error)
    return null
  }
}

/**
 * スレッドを保存
 */
async function handleSaveThread(url: string, folder: string, tags: string[]): Promise<string> {
  const settings = await getSettings()

  // 現在アクティブなタブからスレッドを取得
  let thread = await getThreadFromActiveTab()

  // アクティブタブから取得できなかった場合はバックグラウンドタブで再取得
  if (!thread || thread.tweets.length === 0) {
    thread = await getThreadFromBackgroundTab(url)
  }

  if (!thread || thread.tweets.length === 0) {
    throw new Error('スレッドを取得できませんでした')
  }

  // 1件のみの場合は単一ツイートとして保存（既存データを引き継ぐ）
  if (thread.tweets.length === 1) {
    return handleSaveTweet(url, folder, tags, thread.tweets[0])
  }

  // ファイル名を生成
  const fileName = generateThreadFileName(thread)
  const fileNameWithoutExt = fileName.replace(/\.md$/, '')

  // 画像があるかチェック
  const hasImages = thread.tweets.some(t => t.images.length > 0)

  // 画像がある場合は専用フォルダを作成して保存
  let noteFolder = folder
  let savedImageMap: Map<string, string[]> | undefined

  if (hasImages) {
    noteFolder = `${folder}/${fileNameWithoutExt}`
    savedImageMap = await saveThreadImagesToObsidian(thread, noteFolder)
  }

  // Markdown形式に変換（保存済み画像マップを渡す）
  const markdown = formatThreadAsMarkdown(thread, new Date(), tags, savedImageMap)

  // ファイルパスを生成
  const basePath = `${noteFolder}/${fileName}`
  const filePath = await getUniqueFilePath(basePath, settings)

  // Obsidianに保存
  await createNote(filePath, markdown, settings)

  return filePath
}

/**
 * インストール時の処理
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 初回インストール時にオンボーディングページを開く
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/onboarding/onboarding.html'),
    })
  }
})

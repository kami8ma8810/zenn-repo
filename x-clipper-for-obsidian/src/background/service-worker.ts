import { getSettings } from '@/lib/storage'
import { fetchTweetViaOEmbed, formatTweetAsMarkdown, generateFileName } from '@/lib/tweet-parser'
import { createNote, getUniqueFilePath, downloadImage, saveImage, getImageExtension } from '@/lib/obsidian-api'
import type { MessageType, TweetData } from '@/types'

/** Content Script から返される画像データ */
interface TweetImageData {
  tweetId: string
  imageUrls: string[]
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
 * ツイートを保存
 * @param url ツイートURL
 * @param folder 保存先フォルダ
 * @param tags タグ配列
 * @returns 保存したノートのパス
 */
async function handleSaveTweet(url: string, folder: string, tags: string[]): Promise<string> {
  const settings = await getSettings()

  // ツイートデータを取得
  const tweet = await fetchTweetViaOEmbed(url)

  // Content Scriptから画像URLを取得（可能であれば）
  const imageData = await getImagesFromContentScript()
  if (imageData?.imageUrls && imageData.imageUrls.length > 0) {
    tweet.images = imageData.imageUrls
  }

  // ファイル名を生成（ツイートの出だし20文字）
  const fileName = generateFileName(tweet)
  const fileNameWithoutExt = fileName.replace(/\.md$/, '')

  // 画像がある場合は専用フォルダを作成
  let noteFolder = folder
  let savedImagePaths: string[] = []

  if (tweet.images.length > 0) {
    // 専用フォルダ: X Clipper/ツイートの出だし/
    noteFolder = `${folder}/${fileNameWithoutExt}`
    savedImagePaths = await saveImagesToObsidian(tweet, noteFolder)
  }

  // Markdown形式に変換（保存済み画像パス、タグを渡す）
  const markdown = formatTweetAsMarkdown(tweet, new Date(), savedImagePaths, tags)

  // ファイルパスを生成
  const basePath = `${noteFolder}/${fileName}`

  // 重複しないファイルパスを取得
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
    // 初回インストール時にオンボーディングページを開く（Phase 3で実装）
    console.log('X Clipper for Obsidian installed')
  }
})

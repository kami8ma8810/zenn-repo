import { getSettings } from '@/lib/storage'
import { fetchTweetViaOEmbed, formatTweetAsMarkdown, generateFileName } from '@/lib/tweet-parser'
import { createNote, getUniqueFilePath } from '@/lib/obsidian-api'
import type { MessageType } from '@/types'

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
    handleSaveTweet(message.data.url, message.data.folder)
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
 * ツイートを保存
 * @param url ツイートURL
 * @param folder 保存先フォルダ
 * @returns 保存したノートのパス
 */
async function handleSaveTweet(url: string, folder: string): Promise<string> {
  const settings = await getSettings()

  // ツイートデータを取得
  const tweet = await fetchTweetViaOEmbed(url)

  // Markdown形式に変換
  const markdown = formatTweetAsMarkdown(tweet)

  // ファイル名を生成（ツイートの出だし20文字）
  const fileName = generateFileName(tweet)
  const basePath = `${folder}/${fileName}`

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

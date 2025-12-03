/**
 * Content Script - X/Twitterページからツイート情報を抽出
 */

import type { TweetData, ThreadData, ThreadExtractionResult } from '@/types'

interface TweetImageData {
  tweetId: string
  imageUrls: string[]
  authorBio?: string
}

/**
 * 投稿者のBIO（プロフィール）を抽出
 * ホバーカードを開いてBIOを取得する非同期関数
 */
async function extractAuthorBioAsync(): Promise<string | undefined> {
  // ポスト詳細ページかどうかを確認（/status/ を含むURL）
  if (!window.location.pathname.includes('/status/')) {
    return undefined
  }

  // すでにUserDescriptionが存在するか確認（プロフィールページの場合など）
  const existingBio = document.querySelector('[data-testid="UserDescription"]')
  if (existingBio?.textContent) {
    return existingBio.textContent.trim()
  }

  // ツイート内のユーザーアバターを探す
  const tweetArticle = document.querySelector('article[data-testid="tweet"]')
  if (!tweetArticle) {
    return undefined
  }

  // ホバー対象を探す（ユーザー名リンクがホバーカードをトリガーしやすい）
  const userNameContainer = tweetArticle.querySelector('[data-testid="User-Name"]')
  const userNameLink = userNameContainer?.querySelector('a[role="link"]')

  // アバターも取得（フォールバック用）
  const userAvatarContainer = tweetArticle.querySelector('[data-testid="Tweet-User-Avatar"]')
  const avatarLink = userAvatarContainer?.querySelector('a[role="link"]')

  // ユーザー名リンクを優先、なければアバター
  const targetElement = userNameLink || avatarLink
  if (!targetElement) {
    return undefined
  }

  const rect = targetElement.getBoundingClientRect()

  // 複数のイベントタイプを試す
  const eventOptions = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  }

  // pointerenter, mouseenter, mouseover を順番に試す
  targetElement.dispatchEvent(new PointerEvent('pointerenter', eventOptions))
  targetElement.dispatchEvent(new MouseEvent('mouseenter', eventOptions))
  targetElement.dispatchEvent(new MouseEvent('mouseover', eventOptions))

  // ホバーカードが表示されるのを待つ（最大3秒）
  let bio: string | undefined
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 100))

    const hoverCard = document.querySelector('[data-testid="HoverCard"]')
    if (!hoverCard) continue

    // 方法1: UserDescription（data-testid）を探す
    const hoverCardBio = hoverCard.querySelector('[data-testid="UserDescription"]')
    if (hoverCardBio?.textContent) {
      bio = hoverCardBio.textContent.trim()
      break
    }

    // 方法2: div[dir="auto"]からBIOを探す
    // 「クリックして〜をフォロー」などのボタンテキストを除外
    const textElements = hoverCard.querySelectorAll('div[dir="auto"]')
    for (const el of textElements) {
      const text = el.textContent?.trim()
      if (!text || text.length < 10) continue

      // ボタンテキストやユーザー名を除外
      if (text.startsWith('クリックして')) continue
      if (text.startsWith('Click to')) continue
      if (text.startsWith('@')) continue

      // フォローボタン内のテキストを除外（親要素がbuttonの場合）
      if (el.closest('button')) continue

      // 残ったテキストがBIO
      bio = text
      break
    }

    if (bio) break
  }

  // ホバーを解除
  targetElement.dispatchEvent(new PointerEvent('pointerleave', eventOptions))
  targetElement.dispatchEvent(new MouseEvent('mouseleave', eventOptions))
  targetElement.dispatchEvent(new MouseEvent('mouseout', eventOptions))

  return bio
}

/**
 * 投稿者のBIO（プロフィール）を抽出（同期版 - 後方互換性のため）
 */
function extractAuthorBio(): string | undefined {
  // ポスト詳細ページかどうかを確認（/status/ を含むURL）
  if (!window.location.pathname.includes('/status/')) {
    return undefined
  }

  // すでにUserDescriptionが存在するか確認
  const existingBio = document.querySelector('[data-testid="UserDescription"]')
  if (existingBio?.textContent) {
    return existingBio.textContent.trim()
  }

  // ホバーカード内のBIO
  const hoverCardBio = document.querySelector('[data-testid="HoverCard"] [data-testid="UserDescription"]')
  if (hoverCardBio?.textContent) {
    return hoverCardBio.textContent.trim()
  }

  // レイヤー内のBIO
  const layerBio = document.querySelector('#layers [data-testid="UserDescription"]')
  if (layerBio?.textContent) {
    return layerBio.textContent.trim()
  }

  return undefined
}

/**
 * 現在のページからツイートの画像URLを抽出
 */
function extractTweetImages(): TweetImageData | null {
  // 現在のURLからツイートIDを取得
  const match = window.location.pathname.match(/\/status\/(\d+)/)
  if (!match) {
    return null
  }

  const tweetId = match[1]

  // ツイートの画像を探す
  // X/Twitterの画像は pbs.twimg.com/media/ から配信される
  const imageUrls: string[] = []

  // 全てのarticle要素を取得
  const articles = document.querySelectorAll('article[data-testid="tweet"]')

  // 対象のツイートIDを含むarticleを探す
  let targetArticle: Element | null = null

  for (const article of articles) {
    // article内のリンクからツイートIDを探す
    const links = article.querySelectorAll('a[href*="/status/"]')
    for (const link of links) {
      const href = link.getAttribute('href')
      if (href?.includes(`/status/${tweetId}`)) {
        targetArticle = article
        break
      }
    }
    if (targetArticle) break
  }

  // 見つからなければ最初のarticleを使用（フォールバック）
  if (!targetArticle && articles.length > 0) {
    targetArticle = articles[0]
  }

  if (targetArticle) {
    // img要素を探す
    const images = targetArticle.querySelectorAll('img[src*="pbs.twimg.com/media"]')

    images.forEach(img => {
      const src = img.getAttribute('src')
      if (src) {
        // 高解像度版のURLに変換
        const highResUrl = src
          .replace(/name=\w+/, 'name=large')
          .replace(/format=webp/, 'format=jpg')
        imageUrls.push(highResUrl)
      }
    })

    // 方法2: 背景画像として設定されている場合
    if (imageUrls.length === 0) {
      const divs = targetArticle.querySelectorAll('div[style*="background-image"]')
      divs.forEach(div => {
        const style = div.getAttribute('style')
        if (style) {
          const urlMatch = style.match(/url\("?(https:\/\/pbs\.twimg\.com\/media\/[^")\s]+)"?\)/)
          if (urlMatch?.[1]) {
            imageUrls.push(urlMatch[1])
          }
        }
      })
    }
  }

  // 重複を除去
  const uniqueUrls = [...new Set(imageUrls)]

  // BIOを取得（ポスト詳細ページでのみ）
  const authorBio = extractAuthorBio()

  return {
    tweetId,
    imageUrls: uniqueUrls,
    authorBio,
  }
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_TWEET_IMAGES') {
    // 非同期でBIOを取得してから返す
    (async () => {
      const result = extractTweetImages()
      if (!result) {
        sendResponse(null)
        return
      }
      // 同期版でBIOが取れなかった場合、非同期版で再試行
      if (!result.authorBio) {
        const asyncBio = await extractAuthorBioAsync()
        if (asyncBio) {
          result.authorBio = asyncBio
        }
      }
      sendResponse(result)
    })()
    return true // 非同期レスポンスのため
  } else if (message.type === 'GET_THREAD_DATA') {
    const result = extractThread()
    sendResponse(result)
  }
  return true // 非同期レスポンスのため
})

/**
 * article要素から単一ツイートのデータを抽出
 */
function extractTweetFromArticle(article: Element): TweetData | null {
  // ユーザー名を取得
  const userNameElement = article.querySelector('[data-testid="User-Name"]')
  let username = ''
  let displayName = ''

  if (userNameElement) {
    const usernameLink = userNameElement.querySelector('a[href^="/"]')
    if (usernameLink) {
      const href = usernameLink.getAttribute('href')
      username = href?.replace('/', '') ?? ''
    }

    // 表示名を取得（最初のspan）
    const nameSpan = userNameElement.querySelector('span')
    displayName = nameSpan?.textContent ?? ''
  }

  if (!username) {
    return null
  }

  // ツイートIDを取得
  let tweetId = ''
  const statusLinks = article.querySelectorAll('a[href*="/status/"]')
  for (const link of statusLinks) {
    const href = link.getAttribute('href')
    const match = href?.match(/\/status\/(\d+)/)
    if (match) {
      tweetId = match[1]
      break
    }
  }

  if (!tweetId) {
    return null
  }

  // ツイート本文を取得
  const tweetTextElement = article.querySelector('[data-testid="tweetText"]')
  const tweetText = tweetTextElement?.textContent ?? ''

  // 画像を取得
  const images = article.querySelectorAll('img[src*="pbs.twimg.com/media"]')
  const imageUrls = Array.from(images).map(img => {
    const src = img.getAttribute('src') ?? ''
    // 高解像度版に変換
    return src
      .replace(/name=\w+/, 'name=large')
      .replace(/format=webp/, 'format=jpg')
  }).filter(Boolean)

  // タイムスタンプを取得
  const timeElement = article.querySelector('time')
  const createdAt = timeElement?.getAttribute('datetime') ?? undefined

  // BIOを取得（ポスト詳細ページでのみ）
  const authorBio = extractAuthorBio()

  return {
    id: tweetId,
    text: tweetText,
    authorUsername: username,
    authorName: displayName,
    authorBio,
    url: `https://x.com/${username}/status/${tweetId}`,
    createdAt,
    images: imageUrls,
  }
}

/**
 * 現在のページからスレッド（連投リプ）を抽出
 * 大元のツイート作者による連続リプのみを収集
 */
function extractThread(): ThreadExtractionResult {
  // URLからツイートIDを取得
  const urlMatch = window.location.pathname.match(/\/status\/(\d+)/)
  if (!urlMatch) {
    return { success: false, error: 'Not a tweet page' }
  }

  // 全てのツイート（article要素）を取得
  const articles = document.querySelectorAll('article[data-testid="tweet"]')

  if (articles.length === 0) {
    return { success: false, error: 'No tweets found on page' }
  }

  // 各articleからツイートデータを抽出
  const allTweets: TweetData[] = []
  for (const article of articles) {
    const tweet = extractTweetFromArticle(article)
    if (tweet) {
      allTweets.push(tweet)
    }
  }

  if (allTweets.length === 0) {
    return { success: false, error: 'Failed to extract tweet data' }
  }

  // 最初のツイートの作者を大元の作者とする
  const originalAuthor = allTweets[0].authorUsername
  const originalAuthorName = allTweets[0].authorName
  const originalAuthorBio = allTweets[0].authorBio

  // 同じ作者による連続ツイートのみを収集
  const threadTweets: TweetData[] = []
  for (const tweet of allTweets) {
    if (tweet.authorUsername === originalAuthor) {
      threadTweets.push(tweet)
    } else {
      // 他のユーザーが出てきたら終了
      break
    }
  }

  const thread: ThreadData = {
    authorUsername: originalAuthor,
    authorName: originalAuthorName,
    authorBio: originalAuthorBio,
    tweets: threadTweets,
    originalUrl: window.location.href,
  }

  return { success: true, thread }
}

// ページロード時に自動で画像情報を収集することも可能だが、
// 現時点ではメッセージリクエストに応答する形式のみ

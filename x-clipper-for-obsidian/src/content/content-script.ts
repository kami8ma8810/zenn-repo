/**
 * Content Script - X/Twitterページからツイート情報を抽出
 */

import type { TweetData, ThreadData, ThreadExtractionResult } from '@/types'

/** 引用ツイートの情報 */
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

interface TweetImageData {
  tweetId: string
  imageUrls: string[]
  authorBio?: string
  /** 動画が含まれているか（ダウンロード不可） */
  hasVideo: boolean
  /** アニメーションGIFが含まれているか（ダウンロード不可） */
  hasAnimatedGif: boolean
  /** 引用ツイートの情報 */
  quotedTweet?: QuotedTweetData
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
 * React Fiber から引用ツイートの URL を取得
 * X/Twitter は引用ツイートの URL を React の内部状態に保持している
 */
function getQuotedUrlFromReactFiber(element: Element): string | undefined {
  // React Fiber キーを探す
  const keys = Object.keys(element)
  const fiberKey = keys.find(key => key.startsWith('__reactFiber'))

  if (!fiberKey) {
    return undefined
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fiber = (element as any)[fiberKey]
    // fiber.return.memoizedProps.link.pathname に URL がある
    const link = fiber?.return?.memoizedProps?.link
    if (link?.pathname) {
      // twitter.com を x.com に統一
      return link.pathname.replace('twitter.com', 'x.com')
    }
  } catch {
    // React Fiber へのアクセスに失敗した場合は無視
  }

  return undefined
}

/**
 * 引用ツイートを抽出
 * @param article メインツイートの article 要素
 * @returns 引用ツイートの情報、または undefined
 */
function extractQuotedTweet(article: Element): QuotedTweetData | undefined {
  // 方法1: role="link" で tweetText を含む要素を探す（引用ツイートのコンテナ）
  const linkRoles = article.querySelectorAll('[role="link"]')
  let quotedContainer: Element | null = null

  for (const linkRole of linkRoles) {
    // tweetText を含む role="link" 要素を探す
    if (linkRole.querySelector('[data-testid="tweetText"]')) {
      quotedContainer = linkRole
      break
    }
  }

  // 方法2: フォールバック - 従来の方法
  if (!quotedContainer) {
    quotedContainer = article.querySelector('[data-testid="quoteTweet"]')
      ?? article.querySelector('[data-testid="card.wrapper"]')
  }

  if (!quotedContainer) {
    return undefined
  }

  // React Fiber から URL を取得
  let quotedUrl = getQuotedUrlFromReactFiber(quotedContainer) ?? ''

  // URL からユーザー名を抽出
  let quotedUsername = ''
  const urlMatch = quotedUrl.match(/\/([^/]+)\/status\/(\d+)/)
  if (urlMatch) {
    quotedUsername = urlMatch[1]
  }

  // URL が取得できなかった場合、DOM から探す
  if (!quotedUrl) {
    const statusLinks = quotedContainer.querySelectorAll('a[href*="/status/"]')
    for (const link of statusLinks) {
      const href = link.getAttribute('href')
      const match = href?.match(/\/([^/]+)\/status\/(\d+)/)
      if (match) {
        quotedUsername = match[1]
        const tweetId = match[2]
        quotedUrl = `https://x.com/${quotedUsername}/status/${tweetId}`
        break
      }
    }
  }

  // ユーザー名が取得できなかった場合、UserAvatar-Container から取得
  if (!quotedUsername) {
    const avatarContainer = quotedContainer.querySelector('[data-testid^="UserAvatar-Container-"]')
    if (avatarContainer) {
      const testId = avatarContainer.getAttribute('data-testid')
      const match = testId?.match(/UserAvatar-Container-(.+)/)
      if (match) {
        quotedUsername = match[1]
      }
    }
  }

  // ユーザー名がまだ取得できない場合、User-Name 内の @username を探す
  if (!quotedUsername) {
    const userNameElement = quotedContainer.querySelector('[data-testid="User-Name"]')
    if (userNameElement) {
      const text = userNameElement.textContent ?? ''
      const match = text.match(/@(\w+)/)
      if (match) {
        quotedUsername = match[1]
      }
    }
  }

  // URL もユーザー名も取得できなかった場合は undefined
  if (!quotedUrl && !quotedUsername) {
    return undefined
  }

  // 引用ツイートのテキストを取得
  const quotedTextElement = quotedContainer.querySelector('[data-testid="tweetText"]')
  const quotedText = quotedTextElement?.textContent ?? ''

  // 引用ツイート内の画像URLを抽出
  const quotedImages: string[] = []
  const quotedImageElements = quotedContainer.querySelectorAll('img[src*="pbs.twimg.com/media"]')
  quotedImageElements.forEach(img => {
    const src = img.getAttribute('src')
    if (src) {
      // 高解像度版のURLに変換
      const highResUrl = src
        .replace(/name=\w+/, 'name=large')
        .replace(/format=webp/, 'format=jpg')
      quotedImages.push(highResUrl)
    }
  })

  // 引用ツイート内の動画を検出
  const quotedHasVideo = quotedContainer.querySelector('video') !== null

  // 引用ツイート内のGIFを検出
  const quotedGifBadge = quotedContainer.querySelector('[aria-label*="GIF"]')
  const quotedGifTestId = quotedContainer.querySelector('[data-testid="tweetGif"]')
  const quotedGifLabel = quotedContainer.querySelector('[data-testid="tweetPhoto"] span')
  const quotedHasGifLabel = quotedGifLabel?.textContent?.toUpperCase() === 'GIF'
  const quotedHasAnimatedGif = !!(quotedGifBadge || quotedGifTestId || quotedHasGifLabel)

  return {
    text: quotedText,
    url: quotedUrl,
    authorUsername: quotedUsername,
    images: quotedImages.length > 0 ? quotedImages : undefined,
    hasVideo: quotedHasVideo || undefined,
    hasAnimatedGif: quotedHasAnimatedGif || undefined,
  }
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

  // 引用ツイートを先に取得（動画/GIF検出で除外するため）
  const quotedTweet = targetArticle ? extractQuotedTweet(targetArticle) : undefined

  // 引用ツイートのコンテナを特定（メインツイートの動画/GIF検出で除外するため）
  let quotedContainer: Element | null = null
  if (targetArticle) {
    const linkRoles = targetArticle.querySelectorAll('[role="link"]')
    for (const linkRole of linkRoles) {
      if (linkRole.querySelector('[data-testid="tweetText"]')) {
        quotedContainer = linkRole
        break
      }
    }
    if (!quotedContainer) {
      quotedContainer = targetArticle.querySelector('[data-testid="quoteTweet"]')
        ?? targetArticle.querySelector('[data-testid="card.wrapper"]')
    }
  }

  // 動画の検出（メインツイートのみ - 引用ツイート内は除外）
  let hasVideo = false
  if (targetArticle) {
    const videos = targetArticle.querySelectorAll('video')
    for (const video of videos) {
      // 引用ツイートのコンテナ内でなければメインツイートの動画
      if (!quotedContainer || !quotedContainer.contains(video)) {
        hasVideo = true
        break
      }
    }
  }

  // アニメーションGIFの検出（メインツイートのみ - 引用ツイート内は除外）
  let hasAnimatedGif = false
  if (targetArticle) {
    // GIF バッジを検出（複数のパターンに対応）
    const gifBadge = targetArticle.querySelector('[aria-label*="GIF"]')
    const gifTestId = targetArticle.querySelector('[data-testid="tweetGif"]')
    const gifLabel = targetArticle.querySelector('[data-testid="tweetPhoto"] span')
    const hasGifLabel = gifLabel?.textContent?.toUpperCase() === 'GIF'

    // 引用ツイート内でないか確認
    const isInQuote = (el: Element | null) => el && quotedContainer?.contains(el)
    if ((gifBadge && !isInQuote(gifBadge)) ||
        (gifTestId && !isInQuote(gifTestId)) ||
        (hasGifLabel && gifLabel && !isInQuote(gifLabel))) {
      hasAnimatedGif = true
    }
  }

  // BIOを取得（ポスト詳細ページでのみ）
  const authorBio = extractAuthorBio()

  return {
    tweetId,
    imageUrls: uniqueUrls,
    authorBio,
    hasVideo,
    hasAnimatedGif,
    quotedTweet,
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

  // 引用コンテナを特定（引用ツイートの画像を除外するため）
  let quotedContainer: Element | null = null
  const linkRoles = article.querySelectorAll('[role="link"]')
  for (const linkRole of linkRoles) {
    if (linkRole.querySelector('[data-testid="tweetText"]')) {
      quotedContainer = linkRole
      break
    }
  }
  if (!quotedContainer) {
    quotedContainer = article.querySelector('[data-testid="quoteTweet"]')
      ?? article.querySelector('[data-testid="card.wrapper"]')
  }

  // 画像を取得（引用コンテナ内の画像を除外）
  const images = article.querySelectorAll('img[src*="pbs.twimg.com/media"]')
  const imageUrls = Array.from(images)
    .filter(img => !quotedContainer || !quotedContainer.contains(img))
    .map(img => {
      const src = img.getAttribute('src') ?? ''
      // 高解像度版に変換
      return src
        .replace(/name=\w+/, 'name=large')
        .replace(/format=webp/, 'format=jpg')
    }).filter(Boolean)

  // タイムスタンプを取得
  const timeElement = article.querySelector('time')
  const createdAt = timeElement?.getAttribute('datetime') ?? undefined

  // 動画の検出（引用コンテナ外に1つでもあればtrue）
  const videoElements = article.querySelectorAll('video')
  const hasVideo = Array.from(videoElements).some(
    video => !quotedContainer || !quotedContainer.contains(video)
  )

  // アニメーションGIFの検出（引用コンテナ外に1つでもあればtrue）
  const gifBadges = article.querySelectorAll('[aria-label*="GIF"]')
  const gifTestIds = article.querySelectorAll('[data-testid="tweetGif"]')
  const gifLabels = article.querySelectorAll('[data-testid="tweetPhoto"] span')

  const hasGifBadge = Array.from(gifBadges).some(
    el => !quotedContainer || !quotedContainer.contains(el)
  )
  const hasGifTestId = Array.from(gifTestIds).some(
    el => !quotedContainer || !quotedContainer.contains(el)
  )
  const hasGifLabel = Array.from(gifLabels).some(
    el => (!quotedContainer || !quotedContainer.contains(el)) && el.textContent?.toUpperCase() === 'GIF'
  )

  const hasAnimatedGif = hasGifBadge || hasGifTestId || hasGifLabel

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
    hasVideo,
    hasAnimatedGif,
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

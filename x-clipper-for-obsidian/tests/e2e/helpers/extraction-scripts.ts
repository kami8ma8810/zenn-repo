/**
 * E2E テスト用抽出スクリプト
 *
 * Chrome DevTools MCP の evaluate_script で実行するためのスクリプト群
 * Content Script の抽出ロジックをブラウザのページコンテキストで実行可能な形式にしたもの
 */

/**
 * extractTweetImages を実行するスクリプト
 *
 * evaluate_script で実行する際は、このスクリプトを文字列として渡す
 */
export const EXTRACT_TWEET_IMAGES_SCRIPT = `
() => {
  /** 引用ツイートの情報 */
  interface QuotedTweetData {
    text: string
    url: string
    authorUsername: string
    images?: string[]
    hasVideo?: boolean
    hasAnimatedGif?: boolean
  }

  interface TweetImageData {
    tweetId: string
    imageUrls: string[]
    authorBio?: string
    hasVideo: boolean
    hasAnimatedGif: boolean
    quotedTweet?: QuotedTweetData
  }

  /**
   * React Fiber から引用ツイートの URL を取得
   */
  function getQuotedUrlFromReactFiber(element) {
    const keys = Object.keys(element)
    const fiberKey = keys.find(key => key.startsWith('__reactFiber'))

    if (!fiberKey) {
      return undefined
    }

    try {
      const fiber = element[fiberKey]
      const link = fiber?.return?.memoizedProps?.link
      if (link?.pathname) {
        return link.pathname.replace('twitter.com', 'x.com')
      }
    } catch {
      // React Fiber へのアクセスに失敗した場合は無視
    }

    return undefined
  }

  /**
   * 引用ツイートを抽出
   */
  function extractQuotedTweet(article) {
    const linkRoles = article.querySelectorAll('[role="link"]')
    let quotedContainer = null

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

    if (!quotedContainer) {
      return undefined
    }

    let quotedUrl = getQuotedUrlFromReactFiber(quotedContainer) ?? ''
    let quotedUsername = ''
    const urlMatch = quotedUrl.match(/\\/([^/]+)\\/status\\/(\\d+)/)
    if (urlMatch) {
      quotedUsername = urlMatch[1]
    }

    if (!quotedUrl) {
      const statusLinks = quotedContainer.querySelectorAll('a[href*="/status/"]')
      for (const link of statusLinks) {
        const href = link.getAttribute('href')
        const match = href?.match(/\\/([^/]+)\\/status\\/(\\d+)/)
        if (match) {
          quotedUsername = match[1]
          const tweetId = match[2]
          quotedUrl = 'https://x.com/' + quotedUsername + '/status/' + tweetId
          break
        }
      }
    }

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

    if (!quotedUsername) {
      const userNameElement = quotedContainer.querySelector('[data-testid="User-Name"]')
      if (userNameElement) {
        const text = userNameElement.textContent ?? ''
        const match = text.match(/@(\\w+)/)
        if (match) {
          quotedUsername = match[1]
        }
      }
    }

    if (!quotedUrl && !quotedUsername) {
      return undefined
    }

    const quotedTextElement = quotedContainer.querySelector('[data-testid="tweetText"]')
    const quotedText = quotedTextElement?.textContent ?? ''

    const quotedImages = []
    const quotedImageElements = quotedContainer.querySelectorAll('img[src*="pbs.twimg.com/media"]')
    quotedImageElements.forEach(img => {
      const src = img.getAttribute('src')
      if (src) {
        const highResUrl = src
          .replace(/name=\\w+/, 'name=large')
          .replace(/format=webp/, 'format=jpg')
        quotedImages.push(highResUrl)
      }
    })

    const quotedHasVideo = quotedContainer.querySelector('video') !== null

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
   * 投稿者のBIO（プロフィール）を抽出
   */
  function extractAuthorBio() {
    if (!window.location.pathname.includes('/status/')) {
      return undefined
    }

    const existingBio = document.querySelector('[data-testid="UserDescription"]')
    if (existingBio?.textContent) {
      return existingBio.textContent.trim()
    }

    const hoverCardBio = document.querySelector('[data-testid="HoverCard"] [data-testid="UserDescription"]')
    if (hoverCardBio?.textContent) {
      return hoverCardBio.textContent.trim()
    }

    const layerBio = document.querySelector('#layers [data-testid="UserDescription"]')
    if (layerBio?.textContent) {
      return layerBio.textContent.trim()
    }

    return undefined
  }

  /**
   * メイン処理: ツイートの画像URLを抽出
   */
  function extractTweetImages() {
    const match = window.location.pathname.match(/\\/status\\/(\\d+)/)
    if (!match) {
      return null
    }

    const tweetId = match[1]
    const imageUrls = []

    const articles = document.querySelectorAll('article[data-testid="tweet"]')
    let targetArticle = null

    for (const article of articles) {
      const links = article.querySelectorAll('a[href*="/status/"]')
      for (const link of links) {
        const href = link.getAttribute('href')
        if (href?.includes('/status/' + tweetId)) {
          targetArticle = article
          break
        }
      }
      if (targetArticle) break
    }

    if (!targetArticle && articles.length > 0) {
      targetArticle = articles[0]
    }

    if (targetArticle) {
      const images = targetArticle.querySelectorAll('img[src*="pbs.twimg.com/media"]')

      images.forEach(img => {
        const src = img.getAttribute('src')
        if (src) {
          const highResUrl = src
            .replace(/name=\\w+/, 'name=large')
            .replace(/format=webp/, 'format=jpg')
          imageUrls.push(highResUrl)
        }
      })

      if (imageUrls.length === 0) {
        const divs = targetArticle.querySelectorAll('div[style*="background-image"]')
        divs.forEach(div => {
          const style = div.getAttribute('style')
          if (style) {
            const urlMatch = style.match(/url\\("?(https:\\/\\/pbs\\.twimg\\.com\\/media\\/[^")\\s]+)"?\\)/)
            if (urlMatch?.[1]) {
              imageUrls.push(urlMatch[1])
            }
          }
        })
      }
    }

    const uniqueUrls = [...new Set(imageUrls)]
    const quotedTweet = targetArticle ? extractQuotedTweet(targetArticle) : undefined

    let quotedContainer = null
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

    let hasVideo = false
    if (targetArticle) {
      const videos = targetArticle.querySelectorAll('video')
      for (const video of videos) {
        if (!quotedContainer || !quotedContainer.contains(video)) {
          hasVideo = true
          break
        }
      }
    }

    let hasAnimatedGif = false
    if (targetArticle) {
      const gifBadge = targetArticle.querySelector('[aria-label*="GIF"]')
      const gifTestId = targetArticle.querySelector('[data-testid="tweetGif"]')
      const gifLabel = targetArticle.querySelector('[data-testid="tweetPhoto"] span')
      const hasGifLabel = gifLabel?.textContent?.toUpperCase() === 'GIF'

      const isInQuote = (el) => el && quotedContainer?.contains(el)
      if ((gifBadge && !isInQuote(gifBadge)) ||
          (gifTestId && !isInQuote(gifTestId)) ||
          (hasGifLabel && gifLabel && !isInQuote(gifLabel))) {
        hasAnimatedGif = true
      }
    }

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

  return extractTweetImages()
}
`

/**
 * extractThread を実行するスクリプト
 */
export const EXTRACT_THREAD_SCRIPT = `
() => {
  /**
   * article要素から単一ツイートのデータを抽出
   */
  function extractTweetFromArticle(article) {
    const userNameElement = article.querySelector('[data-testid="User-Name"]')
    let username = ''
    let displayName = ''

    if (userNameElement) {
      const usernameLink = userNameElement.querySelector('a[href^="/"]')
      if (usernameLink) {
        const href = usernameLink.getAttribute('href')
        username = href?.replace('/', '') ?? ''
      }

      const nameSpan = userNameElement.querySelector('span')
      displayName = nameSpan?.textContent ?? ''
    }

    if (!username) {
      return null
    }

    let tweetId = ''
    const statusLinks = article.querySelectorAll('a[href*="/status/"]')
    for (const link of statusLinks) {
      const href = link.getAttribute('href')
      const match = href?.match(/\\/status\\/(\\d+)/)
      if (match) {
        tweetId = match[1]
        break
      }
    }

    if (!tweetId) {
      return null
    }

    const tweetTextElement = article.querySelector('[data-testid="tweetText"]')
    const tweetText = tweetTextElement?.textContent ?? ''

    let quotedContainer = null
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

    const images = article.querySelectorAll('img[src*="pbs.twimg.com/media"]')
    const imageUrls = Array.from(images)
      .filter(img => !quotedContainer || !quotedContainer.contains(img))
      .map(img => {
        const src = img.getAttribute('src') ?? ''
        return src
          .replace(/name=\\w+/, 'name=large')
          .replace(/format=webp/, 'format=jpg')
      }).filter(Boolean)

    const timeElement = article.querySelector('time')
    const createdAt = timeElement?.getAttribute('datetime') ?? undefined

    const videoElements = article.querySelectorAll('video')
    const hasVideo = Array.from(videoElements).some(
      video => !quotedContainer || !quotedContainer.contains(video)
    )

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

    return {
      id: tweetId,
      text: tweetText,
      authorUsername: username,
      authorName: displayName,
      url: 'https://x.com/' + username + '/status/' + tweetId,
      createdAt,
      images: imageUrls,
      hasVideo,
      hasAnimatedGif,
    }
  }

  /**
   * メイン処理: スレッドを抽出
   */
  function extractThread() {
    const urlMatch = window.location.pathname.match(/\\/status\\/(\\d+)/)
    if (!urlMatch) {
      return { success: false, error: 'Not a tweet page' }
    }

    const articles = document.querySelectorAll('article[data-testid="tweet"]')

    if (articles.length === 0) {
      return { success: false, error: 'No tweets found on page' }
    }

    const allTweets = []
    for (const article of articles) {
      const tweet = extractTweetFromArticle(article)
      if (tweet) {
        allTweets.push(tweet)
      }
    }

    if (allTweets.length === 0) {
      return { success: false, error: 'Failed to extract tweet data' }
    }

    const originalAuthor = allTweets[0].authorUsername
    const originalAuthorName = allTweets[0].authorName

    const threadTweets = []
    for (const tweet of allTweets) {
      if (tweet.authorUsername === originalAuthor) {
        threadTweets.push(tweet)
      } else {
        break
      }
    }

    const thread = {
      authorUsername: originalAuthor,
      authorName: originalAuthorName,
      tweets: threadTweets,
      originalUrl: window.location.href,
    }

    return { success: true, thread }
  }

  return extractThread()
}
`

/**
 * DOM セレクタの存在を確認するスクリプト
 * DOM 構造の変更を検知するために使用
 */
export const CHECK_SELECTORS_SCRIPT = `
() => {
  const selectors = {
    tweetArticle: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    userName: '[data-testid="User-Name"]',
    userDescription: '[data-testid="UserDescription"]',
    quoteTweet: '[data-testid="quoteTweet"]',
    tweetGif: '[data-testid="tweetGif"]',
    tweetPhoto: '[data-testid="tweetPhoto"]',
    hoverCard: '[data-testid="HoverCard"]',
    userAvatar: '[data-testid^="UserAvatar-Container-"]',
  }

  const results = {}
  for (const [name, selector] of Object.entries(selectors)) {
    const element = document.querySelector(selector)
    results[name] = {
      found: element !== null,
      count: document.querySelectorAll(selector).length,
    }
  }

  return results
}
`

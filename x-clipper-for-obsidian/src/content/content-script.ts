/**
 * Content Script - X/Twitterページから画像URLを抽出
 */

interface TweetImageData {
  tweetId: string
  imageUrls: string[]
}

/**
 * 現在のページからツイートの画像URLを抽出
 */
function extractTweetImages(): TweetImageData | null {
  console.log('[X Clipper] extractTweetImages called')
  console.log('[X Clipper] Current URL:', window.location.href)

  // 現在のURLからツイートIDを取得
  const match = window.location.pathname.match(/\/status\/(\d+)/)
  if (!match) {
    console.log('[X Clipper] No tweet ID found in URL')
    return null
  }

  const tweetId = match[1]
  console.log('[X Clipper] Tweet ID:', tweetId)

  // ツイートの画像を探す
  // X/Twitterの画像は pbs.twimg.com/media/ から配信される
  const imageUrls: string[] = []

  // 全てのarticle要素を取得
  const articles = document.querySelectorAll('article[data-testid="tweet"]')
  console.log('[X Clipper] Found articles:', articles.length)

  // 対象のツイートIDを含むarticleを探す
  let targetArticle: Element | null = null

  for (const article of articles) {
    // article内のリンクからツイートIDを探す
    const links = article.querySelectorAll('a[href*="/status/"]')
    for (const link of links) {
      const href = link.getAttribute('href')
      if (href?.includes(`/status/${tweetId}`)) {
        targetArticle = article
        console.log('[X Clipper] Found matching article for tweet ID:', tweetId)
        break
      }
    }
    if (targetArticle) break
  }

  // 見つからなければ最初のarticleを使用（フォールバック）
  if (!targetArticle && articles.length > 0) {
    console.log('[X Clipper] No matching article found, using first article as fallback')
    targetArticle = articles[0]
  }

  if (targetArticle) {
    // img要素を探す
    const images = targetArticle.querySelectorAll('img[src*="pbs.twimg.com/media"]')
    console.log('[X Clipper] Found images in target article:', images.length)

    images.forEach((img, index) => {
      const src = img.getAttribute('src')
      console.log(`[X Clipper] Image ${index + 1} src:`, src)
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
      console.log('[X Clipper] Trying background-image method')
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
  console.log('[X Clipper] Final image URLs:', uniqueUrls)

  return {
    tweetId,
    imageUrls: uniqueUrls,
  }
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_TWEET_IMAGES') {
    const result = extractTweetImages()
    sendResponse(result)
  }
  return true // 非同期レスポンスのため
})

// ページロード時に自動で画像情報を収集することも可能だが、
// 現時点ではメッセージリクエストに応答する形式のみ

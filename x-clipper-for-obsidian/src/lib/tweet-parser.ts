import type { TweetData, ThreadData } from '@/types'

/** ファイル名に使用できない文字のパターン */
const INVALID_FILE_NAME_CHARS = /[\/\\:<>"|?*]/g

/**
 * 絵文字を検出する正規表現
 * Emoji_Presentation: 絵文字として表示される文字
 * Extended_Pictographic: 絵文字的な記号（より広い範囲）
 */
const EMOJI_REGEX = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu

/**
 * 句点（日本語の。と英語の.）を検出する正規表現
 */
const PERIOD_REGEX = /[。.]/

/**
 * テキストから意味のある区切りでタイトルを抽出
 * 優先順位: 句点（。.） > 絵文字 の先に来る方
 * @param text 入力テキスト
 * @returns 区切りまでのテキスト（区切り文字を含む）
 */
function extractTitle(text: string): string {
  // 句点の位置を探す
  const periodMatch = text.match(PERIOD_REGEX)
  const periodIndex = periodMatch ? text.indexOf(periodMatch[0]) : -1

  // 絵文字の位置を探す
  const emojiMatch = text.match(EMOJI_REGEX)
  const emojiIndex = emojiMatch ? text.indexOf(emojiMatch[0]) : -1

  // どちらも見つからない場合は全文を返す
  if (periodIndex === -1 && emojiIndex === -1) {
    return text
  }

  // 句点のみ見つかった場合
  if (periodIndex !== -1 && emojiIndex === -1) {
    return text.slice(0, periodIndex + 1)
  }

  // 絵文字のみ見つかった場合
  if (periodIndex === -1 && emojiIndex !== -1) {
    const emojiLength = emojiMatch![0].length
    return text.slice(0, emojiIndex + emojiLength)
  }

  // 両方見つかった場合は先に来る方を優先
  if (periodIndex <= emojiIndex) {
    return text.slice(0, periodIndex + 1)
  } else {
    const emojiLength = emojiMatch![0].length
    return text.slice(0, emojiIndex + emojiLength)
  }
}

/**
 * ツイートからファイル名を生成
 * 区切り優先順位: 句点（。.） > 絵文字 > 改行
 * @param tweet ツイートデータ
 * @returns ファイル名（.md拡張子付き）
 */
export function generateFileName(tweet: TweetData): string {
  // 最初の行を取得（改行で区切り）
  const firstLine = tweet.text.split('\n')[0]

  // ファイル名に使えない文字を除去
  const sanitized = firstLine.replace(INVALID_FILE_NAME_CHARS, '').trim()

  // 空白のみの場合はツイートIDをファイル名に
  if (!sanitized) {
    return `tweet-${tweet.id}.md`
  }

  // 意味のある区切りでタイトルを抽出
  const title = extractTitle(sanitized)

  return `${title}.md`
}

/**
 * Twitter Snowflake IDのエポック（2010年11月4日 01:42:54.657 UTC）
 * 参考: https://developer.twitter.com/en/docs/twitter-ids
 */
const TWITTER_EPOCH = 1288834974657n

/**
 * ツイートIDから投稿日時を抽出
 * TwitterのツイートIDはSnowflake形式で、上位ビットにタイムスタンプが含まれる
 * @param tweetId ツイートID
 * @returns 投稿日時 または null
 */
export function extractPostedAtFromTweetId(tweetId: string): Date | null {
  if (!tweetId || !/^\d+$/.test(tweetId)) {
    return null
  }

  try {
    // ツイートIDをBigIntに変換し、右に22ビットシフトしてタイムスタンプを取得
    const id = BigInt(tweetId)
    const timestamp = (id >> 22n) + TWITTER_EPOCH
    return new Date(Number(timestamp))
  } catch {
    return null
  }
}

/**
 * X/Twitter URLからツイートIDを抽出
 * @param url ツイートのURL
 * @returns ツイートID または null
 */
export function extractTweetId(url: string): string | null {
  // x.com/username/status/1234567890
  // twitter.com/username/status/1234567890
  const patterns = [
    /(?:x\.com|twitter\.com)\/\w+\/status\/(\d+)/,
    /(?:x\.com|twitter\.com)\/\w+\/statuses\/(\d+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }

  return null
}

/**
 * URLがX/TwitterのURLかどうかを検証
 */
export function isValidTweetUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const isValidDomain = urlObj.hostname === 'x.com' || urlObj.hostname === 'twitter.com'
    const hasStatusPath = urlObj.pathname.includes('/status/')
    return isValidDomain && hasStatusPath
  } catch {
    return false
  }
}

/**
 * oEmbed APIを使ってツイートデータを取得
 * @param url ツイートのURL
 * @returns ツイートデータ
 */
export async function fetchTweetViaOEmbed(url: string): Promise<TweetData> {
  const tweetId = extractTweetId(url)
  if (!tweetId) {
    throw new Error('Invalid tweet URL')
  }

  // oEmbed API
  const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`
  const response = await fetch(oembedUrl)

  if (!response.ok) {
    throw new Error(`Failed to fetch tweet: ${response.status}`)
  }

  const data = await response.json() as {
    html: string
    author_name: string
    author_url: string
  }

  // HTMLからテキストを抽出
  const text = extractTextFromOEmbedHtml(data.html)

  // author_urlからユーザー名を抽出
  const authorUsername = data.author_url.split('/').pop() ?? ''

  // 画像URLを抽出（oEmbedには含まれないため、別途取得が必要）
  // Phase 2で実装予定

  const tweetData: TweetData = {
    id: tweetId,
    text,
    authorUsername,
    authorName: data.author_name,
    url,
    images: [],
  }

  // 引用ツイートがあれば取得
  const quotedTweetUrl = extractQuotedTweetUrl(data.html)
  if (quotedTweetUrl) {
    try {
      const quotedTweet = await fetchQuotedTweetData(quotedTweetUrl)
      tweetData.quotedTweet = quotedTweet
    } catch {
      // 引用ツイートの取得に失敗した場合は引用元セクションを表示しない
      // （本文中のリンクが誤検出された可能性があるため）
      console.warn('Failed to fetch quoted tweet, skipping:', quotedTweetUrl)
    }
  }

  return tweetData
}

/**
 * 引用ツイートのデータを取得
 */
async function fetchQuotedTweetData(url: string): Promise<TweetData['quotedTweet']> {
  // t.co URLの場合はリダイレクト先を解決する必要があるが、
  // CORSの制限があるため、まずはそのまま試す
  let resolvedUrl = url

  // t.co URLの場合、リダイレクト解決を試みる
  if (url.includes('t.co')) {
    try {
      // fetch でリダイレクトを追跡（CORSが許可されていれば）
      const redirectResponse = await fetch(url, { redirect: 'follow' })
      if (redirectResponse.url && redirectResponse.url !== url) {
        resolvedUrl = redirectResponse.url
      }
    } catch {
      // リダイレクト解決に失敗した場合は元のURLを使用
      console.warn('Failed to resolve t.co URL:', url)
    }
  }

  // 解決されたURLがツイートURLでなければスキップ
  if (!isValidTweetUrl(resolvedUrl)) {
    throw new Error('Quoted URL is not a valid tweet URL')
  }

  const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(resolvedUrl)}&omit_script=true`
  const response = await fetch(oembedUrl)

  if (!response.ok) {
    throw new Error(`Failed to fetch quoted tweet: ${response.status}`)
  }

  const data = await response.json() as {
    html: string
    author_url: string
  }

  const text = extractTextFromOEmbedHtml(data.html)
  const authorUsername = data.author_url.split('/').pop() ?? ''

  return {
    text,
    url: resolvedUrl,
    authorUsername,
  }
}

/**
 * oEmbed HTMLからテキストを抽出
 */
function extractTextFromOEmbedHtml(html: string): string {
  // blockquote内のテキストを取得
  // <blockquote class="twitter-tweet"><p lang="ja" dir="ltr">テキスト</p>
  const match = html.match(/<p[^>]*>(.+?)<\/p>/s)
  if (match?.[1]) {
    // HTMLタグを除去してプレーンテキストに
    return match[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<a[^>]*>([^<]*)<\/a>/gi, '$1')
      .replace(/<[^>]+>/g, '')
      .trim()
  }
  return ''
}

/**
 * oEmbed HTMLから引用ツイートのURLを抽出
 * 完全な twitter.com/x.com URL のみを検出する（t.co URL は誤検出の原因になるため除外）
 * @param html oEmbed API から返された HTML
 * @returns 引用ツイートのURL または null
 */
export function extractQuotedTweetUrl(html: string): string | null {
  // 完全なTwitter/X URLを探す
  // t.co 短縮URLは通常のリンクと区別できないため、完全なURLのみを対象とする
  const fullUrlPattern = /<a\s+href="(https:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/\d+)"[^>]*>/gi
  const fullMatches = [...html.matchAll(fullUrlPattern)]
  if (fullMatches.length > 0) {
    return fullMatches[fullMatches.length - 1][1]
  }

  return null
}

/** デフォルトタグ */
const DEFAULT_TAG = 'x-clipper'

/**
 * タグ配列を構築
 * - x-clipperを先頭に配置
 * - ユーザー名を2番目に配置
 * - 重複を除去
 * - 空文字・空白のみを除外
 */
function buildTags(authorUsername: string, inputTags?: string[]): string[] {
  const userTag = `x-user-${authorUsername}`
  const result = [DEFAULT_TAG, userTag]

  if (inputTags) {
    for (const tag of inputTags) {
      const trimmed = tag.trim()
      // 空文字、x-clipper、ユーザー名タグ（重複防止）を除外
      if (trimmed && trimmed !== DEFAULT_TAG && trimmed !== userTag) {
        result.push(trimmed)
      }
    }
  }

  return result
}

/**
 * ツイートデータをMarkdown形式に変換
 * @param tweet ツイートデータ
 * @param savedAt 保存日時
 * @param savedImagePaths 保存済み画像の相対パス配列（省略時はtweet.imagesから生成）
 * @param tags タグ配列（x-clipperは自動追加される）
 * @param quotedSavedImagePaths 引用ツイートの保存済み画像パス配列
 */
export function formatTweetAsMarkdown(
  tweet: TweetData,
  savedAt: Date = new Date(),
  savedImagePaths?: string[],
  tags?: string[],
  quotedSavedImagePaths?: string[]
): string {
  // プロフィールページURL
  const profileUrl = `https://x.com/${tweet.authorUsername}`

  // ツイートIDからポスト日時を抽出
  const postedAt = extractPostedAtFromTweetId(tweet.id)

  const frontmatterLines = [
    '---',
    `author_name: "${tweet.authorName}"`,
    `author_url: "${profileUrl}"`,
  ]

  // BIOがある場合（ポスト詳細ページで取得できた場合のみ）
  if (tweet.authorBio) {
    // BIOに含まれる改行やダブルクォートをエスケープ
    const escapedBio = tweet.authorBio.replace(/"/g, '\\"').replace(/\n/g, ' ')
    frontmatterLines.push(`author_bio: "${escapedBio}"`)
  }

  frontmatterLines.push(`posted_at: ${postedAt?.toISOString() ?? 'unknown'}`)
  frontmatterLines.push(`saved_at: ${savedAt.toISOString()}`)
  frontmatterLines.push(`original_url: ${tweet.url}`)
  frontmatterLines.push(`post_id: "${tweet.id}"`)

  // 画像がある場合
  if (tweet.images.length > 0) {
    frontmatterLines.push(`has_images: true`)
    frontmatterLines.push(`image_count: ${tweet.images.length}`)
  }

  // 引用ポストの場合
  if (tweet.quotedTweet) {
    frontmatterLines.push(`has_quote: true`)
    frontmatterLines.push(`quoted_url: "${tweet.quotedTweet.url}"`)
  }

  // 動画がある場合
  if (tweet.hasVideo) {
    frontmatterLines.push(`has_video: true`)
  }

  // アニメーションGIFがある場合
  if (tweet.hasAnimatedGif) {
    frontmatterLines.push(`has_animated_gif: true`)
  }

  // タグを処理: x-clipperを先頭に、重複を除去、空文字を除外
  // YAMLで@などの特殊文字を含む場合はクォートが必要
  const processedTags = buildTags(tweet.authorUsername, tags)
  const quotedTags = processedTags.map(tag => `"${tag}"`)
  frontmatterLines.push(`tags: [${quotedTags.join(', ')}]`)
  frontmatterLines.push('---')

  const frontmatter = frontmatterLines.join('\n')

  // i18n でタイトルと保存日時のテキストを取得
  const postTitle = chrome.i18n.getMessage('mdPostTitle', [tweet.authorUsername])
    || `@${tweet.authorUsername} のポスト`

  const body = [
    '',
    `# ${postTitle}`,
    '',
    tweet.text,
    '',
  ]

  // 画像がある場合
  const imagePaths = savedImagePaths ?? tweet.images.map((_, index) => `tweet-${tweet.id}-${index + 1}.jpg`)
  if (imagePaths.length > 0) {
    body.push('')
    imagePaths.forEach(path => {
      body.push(`![[${path}]]`)
    })
  }

  // 動画/GIF の警告を Obsidian Callout 形式で追加
  if (tweet.hasVideo && tweet.hasAnimatedGif) {
    // 動画とGIF両方がある場合
    const warningTitle = chrome.i18n.getMessage('mdVideoAndGifWarningTitle')
      || 'このポストには動画とアニメーションGIFが含まれています'
    const warningBody = chrome.i18n.getMessage('mdVideoAndGifWarningBody')
      || 'これらのメディアはダウンロードできないため、元のポストをご確認ください。'
    body.push('')
    body.push(`> [!warning] ${warningTitle}`)
    body.push(`> ${warningBody}`)
  } else if (tweet.hasVideo) {
    // 動画のみの場合
    const warningTitle = chrome.i18n.getMessage('mdVideoWarningTitle')
      || 'このポストには動画が含まれています'
    const warningBody = chrome.i18n.getMessage('mdVideoWarningBody')
      || '動画はダウンロードできないため、元のポストをご確認ください。'
    body.push('')
    body.push(`> [!warning] ${warningTitle}`)
    body.push(`> ${warningBody}`)
  } else if (tweet.hasAnimatedGif) {
    // GIFのみの場合
    const warningTitle = chrome.i18n.getMessage('mdGifWarningTitle')
      || 'このポストにはアニメーションGIFが含まれています'
    const warningBody = chrome.i18n.getMessage('mdGifWarningBody')
      || 'GIFはダウンロードできないため、元のポストをご確認ください。'
    body.push('')
    body.push(`> [!warning] ${warningTitle}`)
    body.push(`> ${warningBody}`)
  }

  // 引用ツイートがある場合
  if (tweet.quotedTweet) {
    const quotedHeading = chrome.i18n.getMessage('mdQuotedSource') || '引用元'
    body.push('')
    body.push(`### ${quotedHeading}`)
    body.push('')
    // 引用ツイートの内容をブロッククォートで表示
    const quotedLines = tweet.quotedTweet.text.split('\n')
    quotedLines.forEach(line => {
      body.push(`> ${line}`)
    })
    body.push('>')
    // authorUsernameがある場合のみ表示
    if (tweet.quotedTweet.authorUsername) {
      body.push(`> — @${tweet.quotedTweet.authorUsername}`)
    }
    body.push(`> ${tweet.quotedTweet.url}`)

    // 引用ツイートの画像を埋め込み
    if (quotedSavedImagePaths && quotedSavedImagePaths.length > 0) {
      body.push('')
      quotedSavedImagePaths.forEach(path => {
        body.push(`![[${path}]]`)
      })
    }

    // 引用ツイートに動画/GIF がある場合の警告
    if (tweet.quotedTweet.hasVideo && tweet.quotedTweet.hasAnimatedGif) {
      const warningTitle = chrome.i18n.getMessage('mdVideoAndGifWarningTitle')
        || 'このポストには動画とアニメーションGIFが含まれています'
      const warningBody = chrome.i18n.getMessage('mdVideoAndGifWarningBody')
        || 'これらのメディアはダウンロードできないため、元のポストをご確認ください。'
      body.push('')
      body.push(`> [!warning] ${warningTitle}`)
      body.push(`> ${warningBody}`)
    } else if (tweet.quotedTweet.hasVideo) {
      const warningTitle = chrome.i18n.getMessage('mdVideoWarningTitle')
        || 'このポストには動画が含まれています'
      const warningBody = chrome.i18n.getMessage('mdVideoWarningBody')
        || '動画はダウンロードできないため、元のポストをご確認ください。'
      body.push('')
      body.push(`> [!warning] ${warningTitle}`)
      body.push(`> ${warningBody}`)
    } else if (tweet.quotedTweet.hasAnimatedGif) {
      const warningTitle = chrome.i18n.getMessage('mdGifWarningTitle')
        || 'このポストにはアニメーションGIFが含まれています'
      const warningBody = chrome.i18n.getMessage('mdGifWarningBody')
        || 'GIFはダウンロードできないため、元のポストをご確認ください。'
      body.push('')
      body.push(`> [!warning] ${warningTitle}`)
      body.push(`> ${warningBody}`)
    }
  }

  // ロケールに応じた日時フォーマット
  const uiLanguage = chrome.i18n.getUILanguage()
  const locale = uiLanguage.startsWith('ja') ? 'ja-JP' : 'en-US'
  const formattedDate = savedAt.toLocaleString(locale)
  const savedAtText = chrome.i18n.getMessage('mdSavedAt', [formattedDate])
    || `保存日時: ${formattedDate}`

  body.push('')
  body.push('---')
  body.push(`*${savedAtText}*`)

  return frontmatter + body.join('\n')
}

/**
 * スレッド（連投リプ）をMarkdown形式に変換
 * @param thread スレッドデータ
 * @param savedAt 保存日時
 * @param tags タグ配列（x-clipperは自動追加される）
 * @param savedImageMap ツイートIDごとの保存済み画像ファイル名マップ
 */
export function formatThreadAsMarkdown(
  thread: ThreadData,
  savedAt: Date = new Date(),
  tags?: string[],
  savedImageMap?: Map<string, string[]>
): string {
  const firstTweet = thread.tweets[0]
  if (!firstTweet) {
    throw new Error('Thread has no tweets')
  }

  // プロフィールページURL
  const profileUrl = `https://x.com/${thread.authorUsername}`

  // 最初のツイートIDからポスト日時を抽出
  const postedAt = extractPostedAtFromTweetId(firstTweet.id)

  // 全ツイートの画像数を集計
  const totalImageCount = thread.tweets.reduce((sum, t) => sum + t.images.length, 0)

  const frontmatterLines = [
    '---',
    `author_name: "${thread.authorName}"`,
    `author_url: "${profileUrl}"`,
  ]

  // BIOがある場合（ポスト詳細ページで取得できた場合のみ）
  if (thread.authorBio) {
    // BIOに含まれる改行やダブルクォートをエスケープ
    const escapedBio = thread.authorBio.replace(/"/g, '\\"').replace(/\n/g, ' ')
    frontmatterLines.push(`author_bio: "${escapedBio}"`)
  }

  frontmatterLines.push(`thread_count: ${thread.tweets.length}`)
  frontmatterLines.push(`posted_at: ${postedAt?.toISOString() ?? 'unknown'}`)
  frontmatterLines.push(`saved_at: ${savedAt.toISOString()}`)
  frontmatterLines.push(`original_url: ${thread.originalUrl}`)
  frontmatterLines.push(`post_id: "${firstTweet.id}"`)

  // 画像がある場合
  if (totalImageCount > 0) {
    frontmatterLines.push(`has_images: true`)
    frontmatterLines.push(`image_count: ${totalImageCount}`)
  }

  // タグを処理
  const processedTags = buildTags(thread.authorUsername, tags)
  const quotedTags = processedTags.map(tag => `"${tag}"`)
  frontmatterLines.push(`tags: [${quotedTags.join(', ')}]`)
  frontmatterLines.push('---')

  const frontmatter = frontmatterLines.join('\n')

  // i18n でタイトルを取得
  const threadTitle = chrome.i18n.getMessage('mdThreadTitle', [thread.authorUsername])
    || `@${thread.authorUsername} のスレッド`

  const body = [
    '',
    `# ${threadTitle}`,
    '',
  ]

  // 各ツイートをセクションとして追加
  thread.tweets.forEach((tweet, index) => {
    body.push(`## ${index + 1}`)
    body.push('')
    body.push(tweet.text)
    body.push('')

    // 画像がある場合
    if (tweet.images.length > 0) {
      const savedImages = savedImageMap?.get(tweet.id) ?? []
      tweet.images.forEach((_, imgIndex) => {
        // 保存済みファイル名があればそれを使用、なければデフォルト
        const fileName = savedImages[imgIndex] ?? `tweet-${tweet.id}-${imgIndex + 1}.jpg`
        body.push(`![[${fileName}]]`)
      })
      body.push('')
    }
  })

  // ロケールに応じた日時フォーマット
  const uiLanguage = chrome.i18n.getUILanguage()
  const locale = uiLanguage.startsWith('ja') ? 'ja-JP' : 'en-US'
  const formattedDate = savedAt.toLocaleString(locale)
  const savedAtText = chrome.i18n.getMessage('mdSavedAt', [formattedDate])
    || `保存日時: ${formattedDate}`

  body.push('---')
  body.push(`*${savedAtText}*`)

  return frontmatter + body.join('\n')
}

/**
 * スレッドからファイル名を生成
 * @param thread スレッドデータ
 * @returns ファイル名（.md拡張子付き）
 */
export function generateThreadFileName(thread: ThreadData): string {
  const firstTweet = thread.tweets[0]
  if (!firstTweet) {
    return `thread-${Date.now()}.md`
  }

  // 最初のツイートの内容からファイル名を生成
  const firstLine = firstTweet.text.split('\n')[0]
  const sanitized = firstLine.replace(INVALID_FILE_NAME_CHARS, '').trim()

  if (!sanitized) {
    return `thread-${firstTweet.id}.md`
  }

  // 意味のある区切りでタイトルを抽出
  const title = extractTitle(sanitized)

  return `${title}.md`
}

import type { TweetData } from '@/types'

/** ファイル名の最大文字数 */
const MAX_FILE_NAME_LENGTH = 20

/** ファイル名に使用できない文字のパターン */
const INVALID_FILE_NAME_CHARS = /[\/\\:<>"|?*]/g

/**
 * ツイートからファイル名を生成
 * @param tweet ツイートデータ
 * @returns ファイル名（.md拡張子付き）
 */
export function generateFileName(tweet: TweetData): string {
  // 最初の行を取得
  const firstLine = tweet.text.split('\n')[0]

  // ファイル名に使えない文字を除去
  const sanitized = firstLine.replace(INVALID_FILE_NAME_CHARS, '').trim()

  // 空白のみの場合はツイートIDをファイル名に
  if (!sanitized) {
    return `tweet-${tweet.id}.md`
  }

  // 20文字以下の場合はそのまま、それ以上は切り詰め
  const truncated = sanitized.length <= MAX_FILE_NAME_LENGTH
    ? sanitized
    : sanitized.slice(0, MAX_FILE_NAME_LENGTH)

  return `${truncated}.md`
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
      // 引用ツイートの取得に失敗した場合、URLだけでも保存
      console.warn('Failed to fetch quoted tweet:', quotedTweetUrl)
      tweetData.quotedTweet = {
        text: '（引用元の内容を取得できませんでした）',
        url: quotedTweetUrl,
        authorUsername: '',
      }
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
 * @param html oEmbed API から返された HTML
 * @returns 引用ツイートのURL または null
 */
export function extractQuotedTweetUrl(html: string): string | null {
  // 方法1: 完全なTwitter/X URLを探す
  const fullUrlPattern = /<a\s+href="(https:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/\d+)"[^>]*>/gi
  const fullMatches = [...html.matchAll(fullUrlPattern)]
  if (fullMatches.length > 0) {
    return fullMatches[fullMatches.length - 1][1]
  }

  // 方法2: t.co 短縮URLを探す（引用ツイートの場合によくある）
  // blockquote内のテキストに含まれるt.co URLを探す
  const tcoPattern = /<a\s+href="(https:\/\/t\.co\/[A-Za-z0-9]+)"[^>]*>/gi
  const tcoMatches = [...html.matchAll(tcoPattern)]

  // t.co URLがあれば最後のものを返す（通常、引用ツイートは最後に配置される）
  if (tcoMatches.length > 0) {
    return tcoMatches[tcoMatches.length - 1][1]
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
 */
export function formatTweetAsMarkdown(
  tweet: TweetData,
  savedAt: Date = new Date(),
  savedImagePaths?: string[],
  tags?: string[]
): string {
  // プロフィールページURL
  const profileUrl = `https://x.com/${tweet.authorUsername}`

  // ツイートIDからポスト日時を抽出
  const postedAt = extractPostedAtFromTweetId(tweet.id)

  const frontmatterLines = [
    '---',
    `author_name: "${tweet.authorName}"`,
    `author_url: "${profileUrl}"`,
    `posted_at: ${postedAt?.toISOString() ?? 'unknown'}`,
    `saved_at: ${savedAt.toISOString()}`,
    `original_url: ${tweet.url}`,
    `post_id: "${tweet.id}"`,
  ]

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

  // タグを処理: x-clipperを先頭に、重複を除去、空文字を除外
  // YAMLで@などの特殊文字を含む場合はクォートが必要
  const processedTags = buildTags(tweet.authorUsername, tags)
  const quotedTags = processedTags.map(tag => `"${tag}"`)
  frontmatterLines.push(`tags: [${quotedTags.join(', ')}]`)
  frontmatterLines.push('---')

  const frontmatter = frontmatterLines.join('\n')

  const body = [
    '',
    `# @${tweet.authorUsername} のポスト`,
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

  // 引用ツイートがある場合
  if (tweet.quotedTweet) {
    body.push('')
    body.push('### 引用元')
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
  }

  body.push('')
  body.push('---')
  body.push(`*保存日時: ${savedAt.toLocaleString('ja-JP')}*`)

  return frontmatter + body.join('\n')
}

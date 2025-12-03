import { describe, it, expect, vi } from 'vitest'
import {
  extractTweetId,
  isValidTweetUrl,
  formatTweetAsMarkdown,
  formatThreadAsMarkdown,
  extractQuotedTweetUrl,
  generateFileName,
  generateThreadFileName,
} from '../../src/lib/tweet-parser'
import type { TweetData, ThreadData } from '../../src/types'

// chrome.i18n のモック
vi.stubGlobal('chrome', {
  i18n: {
    getMessage: (key: string, substitutions?: string[]) => {
      const messages: Record<string, string> = {
        mdPostTitle: substitutions ? `@${substitutions[0]} のポスト` : '',
        mdThreadTitle: substitutions ? `@${substitutions[0]} のスレッド` : '',
        mdQuotedSource: '引用元',
        mdSavedAt: substitutions ? `保存日時: ${substitutions[0]}` : '',
        mdQuoteUnavailable: '（引用元の内容を取得できませんでした）',
        mdVideoWarningTitle: 'このポストには動画が含まれています',
        mdVideoWarningBody: '動画はダウンロードできないため、元のポストをご確認ください。',
        mdGifWarningTitle: 'このポストにはアニメーションGIFが含まれています',
        mdGifWarningBody: 'GIFはダウンロードできないため、元のポストをご確認ください。',
        mdVideoAndGifWarningTitle: 'このポストには動画とアニメーションGIFが含まれています',
        mdVideoAndGifWarningBody: 'これらのメディアはダウンロードできないため、元のポストをご確認ください。',
      }
      return messages[key] || ''
    },
    getUILanguage: () => 'ja',
  },
})

describe('extractTweetId', () => {
  it('x.com の status URL からツイートIDを抽出できる', () => {
    const url = 'https://x.com/username/status/1234567890123456789'
    expect(extractTweetId(url)).toBe('1234567890123456789')
  })

  it('twitter.com の status URL からツイートIDを抽出できる', () => {
    const url = 'https://twitter.com/username/status/1234567890123456789'
    expect(extractTweetId(url)).toBe('1234567890123456789')
  })

  it('クエリパラメータ付きURLからもIDを抽出できる', () => {
    const url = 'https://x.com/username/status/1234567890123456789?s=20'
    expect(extractTweetId(url)).toBe('1234567890123456789')
  })

  it('無効なURLの場合はnullを返す', () => {
    expect(extractTweetId('https://example.com')).toBeNull()
    expect(extractTweetId('https://x.com/username')).toBeNull()
    expect(extractTweetId('invalid')).toBeNull()
  })
})

describe('isValidTweetUrl', () => {
  it('x.com の有効なURLを検証できる', () => {
    expect(isValidTweetUrl('https://x.com/user/status/123')).toBe(true)
  })

  it('twitter.com の有効なURLを検証できる', () => {
    expect(isValidTweetUrl('https://twitter.com/user/status/123')).toBe(true)
  })

  it('status がないURLは無効', () => {
    expect(isValidTweetUrl('https://x.com/user')).toBe(false)
    expect(isValidTweetUrl('https://x.com/user/likes')).toBe(false)
  })

  it('他のドメインは無効', () => {
    expect(isValidTweetUrl('https://example.com/user/status/123')).toBe(false)
  })

  it('不正なURLは無効', () => {
    expect(isValidTweetUrl('not a url')).toBe(false)
    expect(isValidTweetUrl('')).toBe(false)
  })
})

describe('formatTweetAsMarkdown', () => {
  const mockTweet: TweetData = {
    id: '1234567890',
    text: 'これはテストツイートです。',
    authorUsername: 'testuser',
    authorName: 'Test User',
    url: 'https://x.com/testuser/status/1234567890',
    images: [],
  }

  it('ツイートをMarkdown形式に変換できる', () => {
    const markdown = formatTweetAsMarkdown(mockTweet)

    expect(markdown).toContain('---')
    expect(markdown).toContain('author_name: "Test User"')
    expect(markdown).toContain('author_url: "https://x.com/testuser"')
    expect(markdown).toContain('post_id: "1234567890"')
    expect(markdown).toContain('これはテストツイートです。')
    // author は author_url があるため不要
    expect(markdown).not.toMatch(/^author: /m)
  })

  it('タグが指定されない場合はx-clipperとユーザー名（クォート付き）', () => {
    const markdown = formatTweetAsMarkdown(mockTweet)
    expect(markdown).toContain('tags: ["x-clipper", "x-user-testuser"]')
  })

  it('タグが指定された場合はx-clipper、ユーザー名、入力タグと結合', () => {
    const markdown = formatTweetAsMarkdown(mockTweet, new Date(), undefined, ['important', 'reference'])
    expect(markdown).toContain('tags: ["x-clipper", "x-user-testuser", "important", "reference"]')
  })

  it('x-clipperが入力に含まれても重複しない', () => {
    const markdown = formatTweetAsMarkdown(mockTweet, new Date(), undefined, ['x-clipper', 'test'])
    expect(markdown).toContain('tags: ["x-clipper", "x-user-testuser", "test"]')
    expect(markdown).not.toContain('"x-clipper", "x-clipper"')
  })

  it('ユーザー名が入力に含まれても重複しない', () => {
    const markdown = formatTweetAsMarkdown(mockTweet, new Date(), undefined, ['x-user-testuser', 'test'])
    expect(markdown).toContain('tags: ["x-clipper", "x-user-testuser", "test"]')
    expect(markdown).not.toContain('"x-user-testuser", "x-user-testuser"')
  })

  it('空文字タグは除外される', () => {
    const markdown = formatTweetAsMarkdown(mockTweet, new Date(), undefined, ['', 'valid', '  '])
    expect(markdown).toContain('tags: ["x-clipper", "x-user-testuser", "valid"]')
  })

  it('画像がある場合はリンクが含まれる', () => {
    const tweetWithImages: TweetData = {
      ...mockTweet,
      images: ['https://pbs.twimg.com/media/xxx.jpg'],
    }
    const markdown = formatTweetAsMarkdown(tweetWithImages)
    expect(markdown).toContain('![[tweet-1234567890-1.jpg]]')
    expect(markdown).toContain('has_images: true')
    expect(markdown).toContain('image_count: 1')
  })

  it('複数の画像がある場合は連番でリンクされる', () => {
    const tweetWithImages: TweetData = {
      ...mockTweet,
      images: [
        'https://pbs.twimg.com/media/xxx.jpg',
        'https://pbs.twimg.com/media/yyy.jpg',
      ],
    }
    const markdown = formatTweetAsMarkdown(tweetWithImages)
    expect(markdown).toContain('![[tweet-1234567890-1.jpg]]')
    expect(markdown).toContain('![[tweet-1234567890-2.jpg]]')
    expect(markdown).toContain('image_count: 2')
  })

  it('プロフィールURLがfrontmatterに含まれる', () => {
    const markdown = formatTweetAsMarkdown(mockTweet)
    expect(markdown).toContain('author_url: "https://x.com/testuser"')
  })

  it('ポスト時間がfrontmatterに含まれる', () => {
    const markdown = formatTweetAsMarkdown(mockTweet)
    // ツイートID 1234567890 からポスト日時を抽出
    expect(markdown).toContain('posted_at:')
  })

  it('ポスト時間がISO形式で出力される', () => {
    // 実際のツイートIDを使用（2021年10月4日のツイート）
    const tweetWithRealId: TweetData = {
      ...mockTweet,
      id: '1445078208190291973',
    }
    const markdown = formatTweetAsMarkdown(tweetWithRealId)
    // 2021-10-04 のISO形式が含まれる
    expect(markdown).toMatch(/posted_at: 2021-10-04T/)
  })

  it('引用ポストがある場合は引用セクションが含まれる', () => {
    const tweetWithQuote: TweetData = {
      ...mockTweet,
      quotedTweet: {
        text: '引用元のツイート内容',
        url: 'https://x.com/quoted_user/status/9876543210',
        authorUsername: 'quoted_user',
      },
    }
    const markdown = formatTweetAsMarkdown(tweetWithQuote)
    expect(markdown).toContain('> 引用元のツイート内容')
    expect(markdown).toContain('https://x.com/quoted_user/status/9876543210')
    expect(markdown).toContain('@quoted_user')
  })

  // === 動画/GIF 警告のテスト ===
  it('動画がある場合、フロントマターに has_video: true が含まれる', () => {
    const tweetWithVideo: TweetData = {
      ...mockTweet,
      hasVideo: true,
    }
    const markdown = formatTweetAsMarkdown(tweetWithVideo)
    expect(markdown).toContain('has_video: true')
  })

  it('GIF がある場合、フロントマターに has_animated_gif: true が含まれる', () => {
    const tweetWithGif: TweetData = {
      ...mockTweet,
      hasAnimatedGif: true,
    }
    const markdown = formatTweetAsMarkdown(tweetWithGif)
    expect(markdown).toContain('has_animated_gif: true')
  })

  it('動画がある場合、Obsidian Callout 形式の警告が含まれる', () => {
    const tweetWithVideo: TweetData = {
      ...mockTweet,
      hasVideo: true,
    }
    const markdown = formatTweetAsMarkdown(tweetWithVideo)
    expect(markdown).toContain('> [!warning]')
    expect(markdown).toContain('このポストには動画が含まれています')
    expect(markdown).toContain('動画はダウンロードできないため、元のポストをご確認ください。')
  })

  it('GIF がある場合、Obsidian Callout 形式の警告が含まれる', () => {
    const tweetWithGif: TweetData = {
      ...mockTweet,
      hasAnimatedGif: true,
    }
    const markdown = formatTweetAsMarkdown(tweetWithGif)
    expect(markdown).toContain('> [!warning]')
    expect(markdown).toContain('このポストにはアニメーションGIFが含まれています')
    expect(markdown).toContain('GIFはダウンロードできないため、元のポストをご確認ください。')
  })

  it('動画とGIF両方がある場合、両方の情報がフロントマターに含まれる', () => {
    const tweetWithBoth: TweetData = {
      ...mockTweet,
      hasVideo: true,
      hasAnimatedGif: true,
    }
    const markdown = formatTweetAsMarkdown(tweetWithBoth)
    expect(markdown).toContain('has_video: true')
    expect(markdown).toContain('has_animated_gif: true')
    expect(markdown).toContain('> [!warning]')
    expect(markdown).toContain('このポストには動画とアニメーションGIFが含まれています')
  })

  it('動画/GIF がない場合、警告は含まれない', () => {
    const markdown = formatTweetAsMarkdown(mockTweet)
    expect(markdown).not.toContain('has_video:')
    expect(markdown).not.toContain('has_animated_gif:')
    expect(markdown).not.toContain('> [!warning]')
  })

  // === 引用ツイートの動画/GIF 警告のテスト ===
  it('引用ツイートのみに動画がある場合、引用元セクションに警告が表示される', () => {
    const tweetWithQuotedVideo: TweetData = {
      ...mockTweet,
      quotedTweet: {
        text: '引用元のツイート内容',
        url: 'https://x.com/quoted_user/status/9876543210',
        authorUsername: 'quoted_user',
        hasVideo: true,
      },
    }
    const markdown = formatTweetAsMarkdown(tweetWithQuotedVideo)
    // メインツイートには警告がない
    expect(markdown).not.toContain('has_video: true')
    // 引用元セクションに警告がある
    expect(markdown).toContain('### 引用元')
    expect(markdown).toContain('> [!warning]')
    expect(markdown).toContain('このポストには動画が含まれています')
  })

  it('引用ツイートのみにGIFがある場合、引用元セクションに警告が表示される', () => {
    const tweetWithQuotedGif: TweetData = {
      ...mockTweet,
      quotedTweet: {
        text: '引用元のツイート内容',
        url: 'https://x.com/quoted_user/status/9876543210',
        authorUsername: 'quoted_user',
        hasAnimatedGif: true,
      },
    }
    const markdown = formatTweetAsMarkdown(tweetWithQuotedGif)
    expect(markdown).not.toContain('has_animated_gif: true')
    expect(markdown).toContain('### 引用元')
    expect(markdown).toContain('> [!warning]')
    expect(markdown).toContain('このポストにはアニメーションGIFが含まれています')
  })

  it('メインツイートと引用ツイート両方に動画がある場合、両方に警告が表示される', () => {
    const tweetWithBothVideo: TweetData = {
      ...mockTweet,
      hasVideo: true,
      quotedTweet: {
        text: '引用元のツイート内容',
        url: 'https://x.com/quoted_user/status/9876543210',
        authorUsername: 'quoted_user',
        hasVideo: true,
      },
    }
    const markdown = formatTweetAsMarkdown(tweetWithBothVideo)
    // メインツイートの警告
    expect(markdown).toContain('has_video: true')
    // 警告が2回出現する（メインと引用元）
    const warningCount = (markdown.match(/> \[!warning\]/g) || []).length
    expect(warningCount).toBe(2)
  })

  it('メインに動画、引用にGIFがある場合、それぞれ適切な警告が表示される', () => {
    const tweetWithMixedMedia: TweetData = {
      ...mockTweet,
      hasVideo: true,
      quotedTweet: {
        text: '引用元のツイート内容',
        url: 'https://x.com/quoted_user/status/9876543210',
        authorUsername: 'quoted_user',
        hasAnimatedGif: true,
      },
    }
    const markdown = formatTweetAsMarkdown(tweetWithMixedMedia)
    expect(markdown).toContain('has_video: true')
    // 警告が2回出現する
    const warningCount = (markdown.match(/> \[!warning\]/g) || []).length
    expect(warningCount).toBe(2)
    // 両方のメッセージが含まれる
    expect(markdown).toContain('このポストには動画が含まれています')
    expect(markdown).toContain('このポストにはアニメーションGIFが含まれています')
  })

  it('引用ツイートに動画とGIF両方がある場合、引用元セクションに複合警告が表示される', () => {
    const tweetWithQuotedBoth: TweetData = {
      ...mockTweet,
      quotedTweet: {
        text: '引用元のツイート内容',
        url: 'https://x.com/quoted_user/status/9876543210',
        authorUsername: 'quoted_user',
        hasVideo: true,
        hasAnimatedGif: true,
      },
    }
    const markdown = formatTweetAsMarkdown(tweetWithQuotedBoth)
    expect(markdown).toContain('### 引用元')
    expect(markdown).toContain('> [!warning]')
    expect(markdown).toContain('このポストには動画とアニメーションGIFが含まれています')
  })

  // === 引用ツイートの画像埋め込みテスト ===
  it('引用ツイートの画像パスを渡すと引用元セクションに画像が埋め込まれる', () => {
    const tweetWithQuote: TweetData = {
      ...mockTweet,
      quotedTweet: {
        text: '引用元のツイート内容',
        url: 'https://x.com/quoted_user/status/9876543210',
        authorUsername: 'quoted_user',
      },
    }
    const quotedImagePaths = ['quoted-9876543210-1.jpg', 'quoted-9876543210-2.jpg']
    const markdown = formatTweetAsMarkdown(tweetWithQuote, new Date(), [], [], quotedImagePaths)
    expect(markdown).toContain('### 引用元')
    expect(markdown).toContain('![[quoted-9876543210-1.jpg]]')
    expect(markdown).toContain('![[quoted-9876543210-2.jpg]]')
  })

  it('引用ツイートの画像と動画警告が両方表示される', () => {
    const tweetWithQuote: TweetData = {
      ...mockTweet,
      quotedTweet: {
        text: '引用元のツイート内容',
        url: 'https://x.com/quoted_user/status/9876543210',
        authorUsername: 'quoted_user',
        hasVideo: true,
      },
    }
    const quotedImagePaths = ['quoted-9876543210-1.jpg']
    const markdown = formatTweetAsMarkdown(tweetWithQuote, new Date(), [], [], quotedImagePaths)
    expect(markdown).toContain('![[quoted-9876543210-1.jpg]]')
    expect(markdown).toContain('> [!warning]')
    expect(markdown).toContain('このポストには動画が含まれています')
  })

  it('メインと引用両方に画像がある場合、それぞれ正しい位置に埋め込まれる', () => {
    const tweetWithBothImages: TweetData = {
      ...mockTweet,
      images: ['https://pbs.twimg.com/media/main.jpg'],
      quotedTweet: {
        text: '引用元のツイート内容',
        url: 'https://x.com/quoted_user/status/9876543210',
        authorUsername: 'quoted_user',
      },
    }
    const mainImagePaths = ['tweet-1234567890-1.jpg']
    const quotedImagePaths = ['quoted-9876543210-1.jpg']
    const markdown = formatTweetAsMarkdown(tweetWithBothImages, new Date(), mainImagePaths, [], quotedImagePaths)
    // メインツイートの画像
    expect(markdown).toContain('![[tweet-1234567890-1.jpg]]')
    // 引用ツイートの画像
    expect(markdown).toContain('![[quoted-9876543210-1.jpg]]')
    // 引用元見出しの後に引用画像がある
    const quotedHeadingIndex = markdown.indexOf('### 引用元')
    const quotedImageIndex = markdown.indexOf('![[quoted-9876543210-1.jpg]]')
    expect(quotedImageIndex).toBeGreaterThan(quotedHeadingIndex)
  })
})

describe('extractQuotedTweetUrl', () => {
  it('oEmbed HTMLから引用ツイートのURLを抽出できる', () => {
    const html = `<blockquote class="twitter-tweet"><p>メインツイート</p>
    <a href="https://twitter.com/quoted_user/status/9876543210">twitter.com/quoted_user/st…</a></blockquote>`
    const url = extractQuotedTweetUrl(html)
    expect(url).toBe('https://twitter.com/quoted_user/status/9876543210')
  })

  it('t.co短縮URLのみの場合はnullを返す（誤検出防止）', () => {
    const html = `<blockquote class="twitter-tweet"><p>メインツイート <a href="https://t.co/LxVZpoQtHl">https://t.co/LxVZpoQtHl</a></p></blockquote>`
    const url = extractQuotedTweetUrl(html)
    expect(url).toBeNull()
  })

  it('引用がない場合はnullを返す', () => {
    const html = '<blockquote class="twitter-tweet"><p>通常のツイート</p></blockquote>'
    const url = extractQuotedTweetUrl(html)
    expect(url).toBeNull()
  })
})

describe('extractPostedAtFromTweetId', () => {
  // TwitterのツイートIDはSnowflake ID
  // 上位ビットにタイムスタンプが埋め込まれている
  // 参考: https://developer.twitter.com/en/docs/twitter-ids

  it('ツイートIDからポスト日時を抽出できる', async () => {
    const { extractPostedAtFromTweetId } = await import('../../src/lib/tweet-parser')

    // 2021年10月4日のツイート例: 1445078208190291973
    const date = extractPostedAtFromTweetId('1445078208190291973')
    expect(date).toBeInstanceOf(Date)
    // 2021年10月4日（UTC）であることを確認
    expect(date?.getUTCFullYear()).toBe(2021)
    expect(date?.getUTCMonth()).toBe(9) // 0-indexed, 9 = October
    expect(date?.getUTCDate()).toBe(4)
  })

  it('無効なIDの場合はnullを返す', async () => {
    const { extractPostedAtFromTweetId } = await import('../../src/lib/tweet-parser')

    expect(extractPostedAtFromTweetId('')).toBeNull()
    expect(extractPostedAtFromTweetId('invalid')).toBeNull()
  })
})

describe('generateFileName', () => {
  // ヘルパー関数
  const createTweet = (text: string): TweetData => ({
    id: '1234567890',
    text,
    authorUsername: 'testuser',
    authorName: 'Test User',
    url: 'https://x.com/testuser/status/1234567890',
    images: [],
  })

  // === 句点での区切り ===
  it('句点（。）で区切る', () => {
    const tweet = createTweet('今日は良い天気。明日も晴れるかな')
    expect(generateFileName(tweet)).toBe('今日は良い天気。.md')
  })

  it('句点（.）で区切る（スペースなし）', () => {
    const tweet = createTweet('Hello.World')
    expect(generateFileName(tweet)).toBe('Hello..md')
  })

  // === 絵文字での区切り ===
  it('テキスト＋絵文字で区切る（絵文字を含む）', () => {
    const tweet = createTweet('こんにちは😊今日はいい天気')
    expect(generateFileName(tweet)).toBe('こんにちは😊.md')
  })

  it('複数の絵文字がある場合、最初の絵文字で区切る', () => {
    const tweet = createTweet('楽しい🎉素敵な🌸一日')
    expect(generateFileName(tweet)).toBe('楽しい🎉.md')
  })

  // === 改行での区切り ===
  it('改行がある場合は最初の行のみ使用する', () => {
    const tweet = createTweet('1行目のテキスト\n2行目のテキスト\n3行目')
    expect(generateFileName(tweet)).toBe('1行目のテキスト.md')
  })

  // === 区切りなし ===
  it('区切りがない場合は全文を使用', () => {
    const tweet = createTweet('区切りなしテキスト')
    expect(generateFileName(tweet)).toBe('区切りなしテキスト.md')
  })

  // === 優先順位確認 ===
  it('句点が絵文字より先にあれば句点で区切る', () => {
    const tweet = createTweet('テスト。😊これは後')
    expect(generateFileName(tweet)).toBe('テスト。.md')
  })

  it('絵文字が句点より先にあれば絵文字で区切る', () => {
    const tweet = createTweet('テスト😊これは後。')
    expect(generateFileName(tweet)).toBe('テスト😊.md')
  })

  // === エッジケース ===
  it('絵文字のみの場合', () => {
    const tweet = createTweet('😊😊😊')
    expect(generateFileName(tweet)).toBe('😊.md')
  })

  it('先頭が絵文字の場合', () => {
    const tweet = createTweet('😊こんにちは')
    expect(generateFileName(tweet)).toBe('😊.md')
  })

  it('ファイル名に使えない文字は除去される', () => {
    const tweet = createTweet('テスト/パス:名前<>"|?*')
    const fileName = generateFileName(tweet)
    expect(fileName).not.toMatch(/[\/:<>"|?*]/)
    expect(fileName).toBe('テストパス名前.md')
  })

  it('空白文字のみの場合はツイートIDをファイル名にする', () => {
    const tweet = createTweet('   ')
    expect(generateFileName(tweet)).toBe('tweet-1234567890.md')
  })

  // === 追加の絵文字テスト ===
  it('火の絵文字で区切る', () => {
    const tweet = createTweet('これはすごい🔥今日のハイライト')
    expect(generateFileName(tweet)).toBe('これはすごい🔥.md')
  })

  it('星絵文字で区切る', () => {
    const tweet = createTweet('すごい⭐今日のハイライト')
    expect(generateFileName(tweet)).toBe('すごい⭐.md')
  })

  // === スペースを含むテキスト ===
  it('スペースを含む英文は全文を使用', () => {
    const tweet = createTweet('Hello world')
    expect(generateFileName(tweet)).toBe('Hello world.md')
  })

  it('句点（.）で区切る（スペースを含む英文）', () => {
    const tweet = createTweet('Hello world. How are you?')
    expect(generateFileName(tweet)).toBe('Hello world..md')
  })
})

describe('formatThreadAsMarkdown', () => {
  const createThread = (tweets: Partial<TweetData>[]): ThreadData => ({
    authorUsername: 'testuser',
    authorName: 'Test User',
    originalUrl: 'https://x.com/testuser/status/1234567890',
    tweets: tweets.map((t, i) => ({
      id: t.id ?? `123456789${i}`,
      text: t.text ?? `Tweet ${i + 1}`,
      authorUsername: t.authorUsername ?? 'testuser',
      authorName: t.authorName ?? 'Test User',
      url: t.url ?? `https://x.com/testuser/status/123456789${i}`,
      images: t.images ?? [],
    })),
  })

  it('スレッドをMarkdown形式に変換できる', () => {
    const thread = createThread([
      { text: '最初のツイート' },
      { text: '2番目のツイート' },
      { text: '3番目のツイート' },
    ])
    const markdown = formatThreadAsMarkdown(thread, new Date('2024-01-01T12:00:00Z'))

    expect(markdown).toContain('# @testuser のスレッド')
    expect(markdown).toContain('## 1')
    expect(markdown).toContain('最初のツイート')
    expect(markdown).toContain('## 2')
    expect(markdown).toContain('2番目のツイート')
    expect(markdown).toContain('## 3')
    expect(markdown).toContain('3番目のツイート')
    expect(markdown).toContain('thread_count: 3')
  })

  it('画像がある場合、savedImageMapのファイル名を使用する', () => {
    const thread = createThread([
      { id: 'tweet1', text: 'テキスト', images: ['http://example.com/img1.png'] },
    ])
    const savedImageMap = new Map<string, string[]>()
    savedImageMap.set('tweet1', ['tweet-tweet1-1.png'])

    const markdown = formatThreadAsMarkdown(thread, new Date(), undefined, savedImageMap)

    expect(markdown).toContain('![[tweet-tweet1-1.png]]')
    expect(markdown).not.toContain('.jpg')
  })

  it('savedImageMapがない場合、デフォルトのjpg拡張子を使用する', () => {
    const thread = createThread([
      { id: 'tweet1', text: 'テキスト', images: ['http://example.com/img1.png'] },
    ])

    const markdown = formatThreadAsMarkdown(thread, new Date())

    expect(markdown).toContain('![[tweet-tweet1-1.jpg]]')
  })

  it('タグが正しく追加される', () => {
    const thread = createThread([{ text: 'テスト' }])
    const markdown = formatThreadAsMarkdown(thread, new Date(), ['custom-tag'])

    expect(markdown).toContain('"x-clipper"')
    expect(markdown).toContain('"x-user-testuser"')
    expect(markdown).toContain('"custom-tag"')
  })
})

describe('generateThreadFileName', () => {
  // ヘルパー関数
  const createThread = (text: string): ThreadData => ({
    authorUsername: 'testuser',
    authorName: 'Test User',
    originalUrl: 'https://x.com/testuser/status/123',
    tweets: [
      {
        id: '123',
        text,
        authorUsername: 'testuser',
        authorName: 'Test User',
        url: 'https://x.com/testuser/status/123',
        images: [],
      },
    ],
  })

  it('最初のツイートの内容からファイル名を生成する', () => {
    const thread = createThread('これはテストツイートです')
    expect(generateThreadFileName(thread)).toBe('これはテストツイートです.md')
  })

  it('句点で区切る', () => {
    const thread = createThread('スレッドの始まり。続きがあります')
    expect(generateThreadFileName(thread)).toBe('スレッドの始まり。.md')
  })

  it('絵文字で区切る', () => {
    const thread = createThread('楽しいスレッド🎉みんな見てね')
    expect(generateThreadFileName(thread)).toBe('楽しいスレッド🎉.md')
  })

  it('区切りがない場合は全文を使用', () => {
    const thread = createThread('区切りなしスレッド')
    expect(generateThreadFileName(thread)).toBe('区切りなしスレッド.md')
  })
})

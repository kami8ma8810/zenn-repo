import { describe, it, expect } from 'vitest'
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
})

describe('extractQuotedTweetUrl', () => {
  it('oEmbed HTMLから引用ツイートのURLを抽出できる', () => {
    const html = `<blockquote class="twitter-tweet"><p>メインツイート</p>
    <a href="https://twitter.com/quoted_user/status/9876543210">twitter.com/quoted_user/st…</a></blockquote>`
    const url = extractQuotedTweetUrl(html)
    expect(url).toBe('https://twitter.com/quoted_user/status/9876543210')
  })

  it('t.co短縮URLを抽出できる', () => {
    const html = `<blockquote class="twitter-tweet"><p>メインツイート <a href="https://t.co/LxVZpoQtHl">https://t.co/LxVZpoQtHl</a></p></blockquote>`
    const url = extractQuotedTweetUrl(html)
    expect(url).toBe('https://t.co/LxVZpoQtHl')
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
  it('ツイートの出だし20文字でファイル名を生成する', () => {
    const tweet: TweetData = {
      id: '1234567890',
      text: 'これはテストツイートです。長いテキストの場合は切り詰められます。',
      authorUsername: 'testuser',
      authorName: 'Test User',
      url: 'https://x.com/testuser/status/1234567890',
      images: [],
    }
    const fileName = generateFileName(tweet)
    // 20文字で切り詰め: 「これはテストツイートです。長いテキストの」
    expect(fileName).toBe('これはテストツイートです。長いテキストの.md')
  })

  it('20文字以下の場合はそのままファイル名になる', () => {
    const tweet: TweetData = {
      id: '1234567890',
      text: '短いテキスト',
      authorUsername: 'testuser',
      authorName: 'Test User',
      url: 'https://x.com/testuser/status/1234567890',
      images: [],
    }
    const fileName = generateFileName(tweet)
    expect(fileName).toBe('短いテキスト.md')
  })

  it('改行がある場合は最初の行のみ使用する', () => {
    const tweet: TweetData = {
      id: '1234567890',
      text: '1行目のテキスト\n2行目のテキスト\n3行目',
      authorUsername: 'testuser',
      authorName: 'Test User',
      url: 'https://x.com/testuser/status/1234567890',
      images: [],
    }
    const fileName = generateFileName(tweet)
    expect(fileName).toBe('1行目のテキスト.md')
  })

  it('ファイル名に使えない文字は除去される', () => {
    const tweet: TweetData = {
      id: '1234567890',
      text: 'テスト/パス:名前<>"|?*',
      authorUsername: 'testuser',
      authorName: 'Test User',
      url: 'https://x.com/testuser/status/1234567890',
      images: [],
    }
    const fileName = generateFileName(tweet)
    expect(fileName).not.toMatch(/[\/:<>"|?*]/)
    expect(fileName).toBe('テストパス名前.md')
  })

  it('空白文字のみの場合はツイートIDをファイル名にする', () => {
    const tweet: TweetData = {
      id: '1234567890',
      text: '   ',
      authorUsername: 'testuser',
      authorName: 'Test User',
      url: 'https://x.com/testuser/status/1234567890',
      images: [],
    }
    const fileName = generateFileName(tweet)
    expect(fileName).toBe('tweet-1234567890.md')
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
  it('最初のツイートの内容からファイル名を生成する', () => {
    const thread: ThreadData = {
      authorUsername: 'testuser',
      authorName: 'Test User',
      originalUrl: 'https://x.com/testuser/status/123',
      tweets: [
        {
          id: '123',
          text: 'これはテストツイートです',
          authorUsername: 'testuser',
          authorName: 'Test User',
          url: 'https://x.com/testuser/status/123',
          images: [],
        },
      ],
    }
    const fileName = generateThreadFileName(thread)
    expect(fileName).toBe('これはテストツイートです.md')
  })

  it('20文字を超える場合は切り詰める', () => {
    const thread: ThreadData = {
      authorUsername: 'testuser',
      authorName: 'Test User',
      originalUrl: 'https://x.com/testuser/status/123',
      tweets: [
        {
          id: '123',
          text: 'これは非常に長いツイートの内容で20文字を超えています',
          authorUsername: 'testuser',
          authorName: 'Test User',
          url: 'https://x.com/testuser/status/123',
          images: [],
        },
      ],
    }
    const fileName = generateThreadFileName(thread)
    // 「これは非常に長いツイートの内容で20文字」で20文字
    expect(fileName).toBe('これは非常に長いツイートの内容で20文字.md')
    expect(fileName.replace('.md', '').length).toBe(20)
  })
})

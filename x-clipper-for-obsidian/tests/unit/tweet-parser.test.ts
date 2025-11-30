import { describe, it, expect } from 'vitest'
import {
  extractTweetId,
  isValidTweetUrl,
  formatTweetAsMarkdown,
  extractQuotedTweetUrl,
  generateFileName,
} from '../../src/lib/tweet-parser'
import type { TweetData } from '../../src/types'

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
    expect(markdown).toContain('author: "@testuser"')
    expect(markdown).toContain('author_name: "Test User"')
    expect(markdown).toContain('tweet_id: "1234567890"')
    expect(markdown).toContain('これはテストツイートです。')
  })

  it('frontmatterにタグが含まれる', () => {
    const markdown = formatTweetAsMarkdown(mockTweet)
    expect(markdown).toContain('tags: [twitter, saved-tweet]')
  })

  it('画像がある場合はリンクが含まれる', () => {
    const tweetWithImages: TweetData = {
      ...mockTweet,
      images: ['https://pbs.twimg.com/media/xxx.jpg'],
    }
    const markdown = formatTweetAsMarkdown(tweetWithImages)
    expect(markdown).toContain('![[tweet-1234567890-1.jpg]]')
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

/**
 * E2E テスト用ツイート URL 定義
 *
 * 公式アカウントの安定したツイートを使用
 * 各パターンのテストケースを定義
 *
 * 注意: URL は定期的に有効性を確認すること
 */

/** テストケースのカテゴリ */
export type TestCategory =
  | 'text-only'
  | 'single-image'
  | 'multiple-images'
  | 'video'
  | 'gif'
  | 'quote-text-only'
  | 'quote-with-image'
  | 'quote-with-video'
  | 'quote-with-gif'
  | 'quote-deleted'
  | 'thread'
  | 'thread-with-quote'

/** テストケースの優先度 */
export type TestPriority = 'high' | 'medium' | 'low'

/** テストケースの期待値 */
export interface ExpectedResult {
  /** 投稿者ユーザー名（@なし） */
  authorUsername: string
  /** 画像があるか */
  hasImages?: boolean
  /** 画像の枚数 */
  imageCount?: number
  /** 動画があるか */
  hasVideo?: boolean
  /** GIF があるか */
  hasAnimatedGif?: boolean
  /** 引用ツイートがあるか */
  hasQuotedTweet?: boolean
  /** 引用ツイートの期待値 */
  quotedTweet?: {
    authorUsername: string
    hasImages?: boolean
    imageCount?: number
    hasVideo?: boolean
    hasAnimatedGif?: boolean
    /** 削除済み/非公開の可能性 */
    mayBeUnavailable?: boolean
  }
  /** スレッドの場合のツイート数 */
  threadTweetCount?: number
}

/** テストケース定義 */
export interface TestCase {
  /** テストケース ID */
  id: string
  /** テスト名（日本語） */
  name: string
  /** カテゴリ */
  category: TestCategory
  /** 優先度 */
  priority: TestPriority
  /** ツイート URL */
  url: string
  /** 期待される結果 */
  expected: ExpectedResult
  /** 最終確認日 */
  lastVerified: string
  /** 備考 */
  notes?: string
}

/**
 * テストケース一覧
 *
 * 注意: 実際のテストを行う前に、各URLが有効かどうかを確認すること
 * 公式アカウントのツイートを使用しているため、削除リスクは低いが定期確認は必要
 *
 * 収集日: 2024-12-04
 */
export const TEST_CASES: TestCase[] = [
  // ========================================
  // 高優先度: 基本パターン
  // ========================================
  {
    id: 'text-only-1',
    name: '通常のポスト（テキストのみ）',
    category: 'text-only',
    priority: 'high',
    url: 'https://x.com/X/status/1989466513133506962',
    expected: {
      authorUsername: 'X',
      hasImages: false,
      hasVideo: false,
      hasAnimatedGif: false,
    },
    lastVerified: '2024-12-04',
    notes: '@X のテキストのみのポスト（Chat リリースについて）',
  },
  {
    id: 'single-image-1',
    name: '画像1枚付きポスト',
    category: 'single-image',
    priority: 'high',
    url: 'https://x.com/NASA/status/1996334334236631458',
    expected: {
      authorUsername: 'NASA',
      hasImages: true,
      imageCount: 1,
    },
    lastVerified: '2024-12-04',
    notes: 'NASA の Deep Space Network についてのポスト（画像1枚）',
  },
  {
    id: 'single-image-2',
    name: '画像1枚付きポスト（Webb望遠鏡）',
    category: 'single-image',
    priority: 'high',
    url: 'https://x.com/NASA/status/1995912441952137380',
    expected: {
      authorUsername: 'NASA',
      hasImages: true,
      imageCount: 1,
    },
    lastVerified: '2024-12-04',
    notes: 'NASA Webb望遠鏡の Sagittarius B2 画像',
  },
  {
    id: 'multiple-images-1',
    name: '画像2枚付きポスト',
    category: 'multiple-images',
    priority: 'high',
    url: 'https://x.com/SpaceX/status/1995753099340755352',
    expected: {
      authorUsername: 'SpaceX',
      hasImages: true,
      imageCount: 2,
    },
    lastVerified: '2024-12-04',
    notes: 'SpaceX Falcon 9 打ち上げポスト（画像2枚）',
  },

  // ========================================
  // 高優先度: 引用ツイート
  // ========================================
  {
    id: 'quote-with-video-1',
    name: '引用ポスト（引用元に動画あり）',
    category: 'quote-with-video',
    priority: 'high',
    url: 'https://x.com/X/status/1989466510918914495',
    expected: {
      authorUsername: 'X',
      hasQuotedTweet: true,
      quotedTweet: {
        authorUsername: 'Chat',
        hasVideo: true,
      },
    },
    lastVerified: '2024-12-04',
    notes: '@X が @Chat を引用（動画付き）',
  },
  {
    id: 'quote-text-only-1',
    name: '引用ポスト（引用元テキストのみ）',
    category: 'quote-text-only',
    priority: 'high',
    url: '', // TODO: テキストのみ引用を探す
    expected: {
      authorUsername: '',
      hasQuotedTweet: true,
      quotedTweet: {
        authorUsername: '',
        hasImages: false,
      },
    },
    lastVerified: '',
    notes: '引用元がテキストのみ（要収集）',
  },
  {
    id: 'quote-with-image-1',
    name: '引用ポスト（引用元に画像あり）',
    category: 'quote-with-image',
    priority: 'high',
    url: '', // TODO: 画像付き引用を探す
    expected: {
      authorUsername: '',
      hasQuotedTweet: true,
      quotedTweet: {
        authorUsername: '',
        hasImages: true,
        imageCount: 1,
      },
    },
    lastVerified: '',
    notes: '引用元に画像が添付されている（要収集）',
  },

  // ========================================
  // 高優先度: スレッド
  // ========================================
  {
    id: 'thread-1',
    name: 'スレッド（連投リプ）',
    category: 'thread',
    priority: 'high',
    url: '', // TODO: スレッドを探す
    expected: {
      authorUsername: '',
      threadTweetCount: 3,
    },
    lastVerified: '',
    notes: '同一投稿者による3件以上の連続ツイート（要収集）',
  },

  // ========================================
  // 中優先度: 動画/GIF
  // ========================================
  {
    id: 'video-1',
    name: '動画付きポスト',
    category: 'video',
    priority: 'medium',
    url: 'https://x.com/JonnyKimUSA/status/1995806697026101319',
    expected: {
      authorUsername: 'JonnyKimUSA',
      hasVideo: true,
    },
    lastVerified: '2024-12-04',
    notes: 'NASA 宇宙飛行士 Jonny Kim の動画ポスト（オーロラ）',
  },
  {
    id: 'gif-1',
    name: 'GIF付きポスト',
    category: 'gif',
    priority: 'medium',
    url: 'https://x.com/GIPHY/status/1117281960387334147',
    expected: {
      authorUsername: 'GIPHY',
      hasAnimatedGif: true,
    },
    lastVerified: '2024-12-04',
    notes: 'GIPHY 公式アカウントの BTS 関連 GIF',
  },
  {
    id: 'quote-with-gif-1',
    name: '引用ポスト（引用元にGIFあり）',
    category: 'quote-with-gif',
    priority: 'medium',
    url: '', // TODO: GIF付き引用を探す
    expected: {
      authorUsername: '',
      hasQuotedTweet: true,
      quotedTweet: {
        authorUsername: '',
        hasAnimatedGif: true,
      },
    },
    lastVerified: '',
    notes: '引用元にGIFが添付されている（要収集）',
  },

  // ========================================
  // 中優先度: エッジケース
  // ========================================
  {
    id: 'quote-deleted-1',
    name: '引用ポスト（引用元が削除済み）',
    category: 'quote-deleted',
    priority: 'medium',
    url: '', // TODO: 削除済み引用のポストを探す
    expected: {
      authorUsername: '',
      hasQuotedTweet: true,
      quotedTweet: {
        authorUsername: '',
        mayBeUnavailable: true,
      },
    },
    lastVerified: '',
    notes: '引用元が削除されているケース（要収集）',
  },
  {
    id: 'thread-with-quote-1',
    name: 'スレッド＋引用ポスト',
    category: 'thread-with-quote',
    priority: 'medium',
    url: '', // TODO: スレッド+引用を探す
    expected: {
      authorUsername: '',
      threadTweetCount: 2,
      hasQuotedTweet: true,
    },
    lastVerified: '',
    notes: 'スレッド内に引用ツイートが含まれるケース（要収集）',
  },
]

/**
 * カテゴリでテストケースをフィルタリング
 */
export function getTestCasesByCategory(category: TestCategory): TestCase[] {
  return TEST_CASES.filter(tc => tc.category === category)
}

/**
 * 優先度でテストケースをフィルタリング
 */
export function getTestCasesByPriority(priority: TestPriority): TestCase[] {
  return TEST_CASES.filter(tc => tc.priority === priority)
}

/**
 * URL が設定済みのテストケースのみ取得
 */
export function getActiveTestCases(): TestCase[] {
  return TEST_CASES.filter(tc => tc.url !== '')
}

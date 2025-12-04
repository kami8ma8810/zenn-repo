/**
 * Chrome DevTools MCP 型定義とユーティリティ
 *
 * このファイルは E2E テストで使用する型定義とエラーハンドリングを提供する
 * 実際のテスト実行は Claude Code が MCP ツールを直接呼び出す形で行う
 */

/** ツイート抽出結果の型 */
export interface TweetImageData {
  tweetId: string
  imageUrls: string[]
  authorBio?: string
  hasVideo: boolean
  hasAnimatedGif: boolean
  quotedTweet?: QuotedTweetData
}

/** 引用ツイートデータの型 */
export interface QuotedTweetData {
  text: string
  url: string
  authorUsername: string
  images?: string[]
  hasVideo?: boolean
  hasAnimatedGif?: boolean
}

/** スレッドデータの型 */
export interface ThreadData {
  authorUsername: string
  authorName: string
  authorBio?: string
  tweets: TweetData[]
  originalUrl: string
}

/** ツイートデータの型 */
export interface TweetData {
  id: string
  text: string
  authorUsername: string
  authorName: string
  authorBio?: string
  url: string
  createdAt?: string
  images: string[]
  hasVideo?: boolean
  hasAnimatedGif?: boolean
  quotedTweet?: QuotedTweetData
}

/**
 * E2E テストエラーの種類
 */
export enum E2ETestError {
  PAGE_LOAD_TIMEOUT = 'PAGE_LOAD_TIMEOUT',
  TWEET_NOT_FOUND = 'TWEET_NOT_FOUND',
  TWEET_DELETED = 'TWEET_DELETED',
  SELECTOR_CHANGED = 'SELECTOR_CHANGED',
  MCP_CONNECTION_ERROR = 'MCP_CONNECTION_ERROR',
  SCRIPT_EXECUTION_ERROR = 'SCRIPT_EXECUTION_ERROR',
  QUOTED_TWEET_UNAVAILABLE = 'QUOTED_TWEET_UNAVAILABLE',
}

/**
 * MCP ツール名の一覧（参照用）
 */
export const MCP_TOOLS = {
  navigatePage: 'mcp__chrome-devtools__navigate_page',
  waitFor: 'mcp__chrome-devtools__wait_for',
  takeSnapshot: 'mcp__chrome-devtools__take_snapshot',
  takeScreenshot: 'mcp__chrome-devtools__take_screenshot',
  evaluateScript: 'mcp__chrome-devtools__evaluate_script',
  listConsoleMessages: 'mcp__chrome-devtools__list_console_messages',
  newPage: 'mcp__chrome-devtools__new_page',
  closePage: 'mcp__chrome-devtools__close_page',
  listPages: 'mcp__chrome-devtools__list_pages',
  click: 'mcp__chrome-devtools__click',
  hover: 'mcp__chrome-devtools__hover',
} as const

/**
 * E2E テストエラーをハンドリング
 */
export function handleE2EError(
  error: E2ETestError,
  context: { url?: string; selector?: string; message?: string }
): { skip: boolean; reason: string } {
  switch (error) {
    case E2ETestError.TWEET_DELETED:
      console.warn(`[WARN] Tweet deleted or unavailable: ${context.url}`)
      return { skip: true, reason: 'Tweet no longer exists' }

    case E2ETestError.QUOTED_TWEET_UNAVAILABLE:
      console.warn(`[WARN] Quoted tweet unavailable: ${context.url}`)
      return { skip: false, reason: 'Quoted tweet may be deleted or private' }

    case E2ETestError.SELECTOR_CHANGED:
      console.error(`[CRITICAL] Selector may have changed: ${context.selector}`)
      return { skip: false, reason: 'DOM structure may have changed' }

    case E2ETestError.PAGE_LOAD_TIMEOUT:
      console.error(`[ERROR] Page load timeout: ${context.url}`)
      return { skip: true, reason: 'Page load timeout' }

    case E2ETestError.MCP_CONNECTION_ERROR:
      console.error(`[ERROR] MCP connection error: ${context.message}`)
      return { skip: true, reason: 'MCP connection failed' }

    case E2ETestError.SCRIPT_EXECUTION_ERROR:
      console.error(`[ERROR] Script execution error: ${context.message}`)
      return { skip: false, reason: 'Script execution failed' }

    default:
      return { skip: false, reason: 'Unknown error' }
  }
}

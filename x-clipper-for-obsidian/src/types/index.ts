/** 引用ツイートのデータ */
export interface QuotedTweetData {
  /** 引用ツイートの本文 */
  text: string
  /** 引用ツイートのURL */
  url: string
  /** 引用ツイート投稿者のユーザー名（@なし） */
  authorUsername: string
  /** 添付画像のURLリスト */
  images?: string[]
  /** 動画が含まれているか（ダウンロード不可） */
  hasVideo?: boolean
  /** アニメーションGIFが含まれているか（ダウンロード不可） */
  hasAnimatedGif?: boolean
}

/** ツイートデータの型 */
export interface TweetData {
  /** ツイートID */
  id: string
  /** ツイート本文 */
  text: string
  /** 投稿者のユーザー名（@なし） */
  authorUsername: string
  /** 投稿者の表示名 */
  authorName: string
  /** 投稿者のプロフィール（BIO） */
  authorBio?: string
  /** 元のツイートURL */
  url: string
  /** 投稿日時（ISO形式） */
  createdAt?: string
  /** 添付画像のURLリスト */
  images: string[]
  /** 動画が含まれているか（ダウンロード不可） */
  hasVideo?: boolean
  /** アニメーションGIFが含まれているか（ダウンロード不可） */
  hasAnimatedGif?: boolean
  /** 引用ツイート（存在する場合） */
  quotedTweet?: QuotedTweetData
}

/** スレッドデータの型（連投リプをまとめたもの） */
export interface ThreadData {
  /** 大元のツイート作者のユーザー名（@なし） */
  authorUsername: string
  /** 大元のツイート作者の表示名 */
  authorName: string
  /** 大元のツイート作者のプロフィール（BIO） */
  authorBio?: string
  /** スレッド内のツイート配列（時系列順） */
  tweets: TweetData[]
  /** 大元のツイートURL */
  originalUrl: string
}

/** Content Scriptから返されるスレッド抽出結果 */
export interface ThreadExtractionResult {
  /** 成功したか */
  success: boolean
  /** スレッドデータ（成功時） */
  thread?: ThreadData
  /** エラーメッセージ（失敗時） */
  error?: string
}

/** Obsidian保存時のオプション */
export interface SaveOptions {
  /** 保存先フォルダパス */
  folder: string
  /** 画像を保存するか */
  saveImages: boolean
}

/** 拡張機能の設定 */
export interface ExtensionSettings {
  /** Obsidian REST APIのエンドポイント */
  obsidianApiUrl: string
  /** APIキー */
  obsidianApiKey: string
  /** デフォルトの保存先フォルダ */
  defaultFolder: string
  /** 画像保存先フォルダ（Vault内） */
  imageFolder: string
}

/** デフォルト設定 */
export const DEFAULT_SETTINGS: ExtensionSettings = {
  obsidianApiUrl: 'http://127.0.0.1:27123',
  obsidianApiKey: '',
  defaultFolder: 'X Clipper',
  imageFolder: 'X Clipper/images',
}

/** メッセージの型（Background Script ↔ Popup間通信） */
export type MessageType =
  | { type: 'SAVE_TWEET'; data: { url: string; folder: string; tags: string[] } }
  | { type: 'SAVE_THREAD'; data: { url: string; folder: string; tags: string[] } }
  | { type: 'SAVE_TWEET_RESULT'; success: boolean; error?: string; notePath?: string }
  | { type: 'TEST_CONNECTION' }
  | { type: 'TEST_CONNECTION_RESULT'; connected: boolean; error?: string }

/** Obsidian REST APIのレスポンス型 */
export interface ObsidianApiResponse {
  /** 作成されたファイルのパス */
  path?: string
  /** エラーメッセージ */
  error?: string
}

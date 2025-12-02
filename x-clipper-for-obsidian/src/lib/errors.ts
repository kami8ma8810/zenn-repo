/**
 * Obsidian API エラーコード
 */
export const ObsidianErrorCode = {
  /** Obsidianが起動していない、またはプラグインが無効 */
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',
  /** APIキーが無効または未設定 */
  UNAUTHORIZED: 'UNAUTHORIZED',
  /** 接続タイムアウト */
  TIMEOUT: 'TIMEOUT',
  /** ネットワークエラー */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** その他のAPIエラー */
  API_ERROR: 'API_ERROR',
} as const

export type ObsidianErrorCode = typeof ObsidianErrorCode[keyof typeof ObsidianErrorCode]

/**
 * Obsidian API エラー
 */
export class ObsidianApiError extends Error {
  readonly code: ObsidianErrorCode
  readonly statusCode?: number

  constructor(code: ObsidianErrorCode, message: string, statusCode?: number) {
    super(message)
    this.name = 'ObsidianApiError'
    this.code = code
    this.statusCode = statusCode
  }
}

/**
 * エラーコードに対応するユーザー向けメッセージを取得
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ObsidianApiError) {
    switch (error.code) {
      case ObsidianErrorCode.CONNECTION_REFUSED:
        return 'Obsidianに接続できません。以下を確認してください:\n・Obsidianが起動しているか\n・Local REST APIプラグインが有効か\n・HTTPサーバーが有効か（Enable non-encrypted server）'
      case ObsidianErrorCode.UNAUTHORIZED:
        return 'APIキーが無効です。設定でAPIキーを確認してください。'
      case ObsidianErrorCode.TIMEOUT:
        return '接続がタイムアウトしました。Obsidianの状態を確認してください。'
      case ObsidianErrorCode.NETWORK_ERROR:
        return 'ネットワークエラーが発生しました。'
      case ObsidianErrorCode.API_ERROR:
        return `APIエラー: ${error.message}`
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return '不明なエラーが発生しました'
}

/**
 * fetch エラーを ObsidianApiError に変換
 */
export function handleFetchError(error: unknown): never {
  if (error instanceof TypeError) {
    // fetch が TypeError を投げるのは主にネットワークエラー
    const message = error.message.toLowerCase()

    if (message.includes('failed to fetch') || message.includes('network')) {
      throw new ObsidianApiError(
        ObsidianErrorCode.CONNECTION_REFUSED,
        'Obsidianへの接続に失敗しました'
      )
    }
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    throw new ObsidianApiError(
      ObsidianErrorCode.TIMEOUT,
      '接続がタイムアウトしました'
    )
  }

  throw new ObsidianApiError(
    ObsidianErrorCode.NETWORK_ERROR,
    error instanceof Error ? error.message : '不明なエラー'
  )
}

/**
 * HTTP レスポンスを ObsidianApiError に変換
 */
export function handleResponseError(response: Response, responseText?: string): never {
  if (response.status === 401 || response.status === 403) {
    throw new ObsidianApiError(
      ObsidianErrorCode.UNAUTHORIZED,
      'APIキーが無効です',
      response.status
    )
  }

  throw new ObsidianApiError(
    ObsidianErrorCode.API_ERROR,
    responseText ?? `HTTP ${response.status}`,
    response.status
  )
}

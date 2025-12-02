import { describe, it, expect } from 'vitest'
import {
  ObsidianApiError,
  ObsidianErrorCode,
  getErrorMessage,
  handleFetchError,
  handleResponseError,
} from '../../src/lib/errors'

describe('ObsidianApiError', () => {
  it('エラーコードとメッセージを保持する', () => {
    const error = new ObsidianApiError(
      ObsidianErrorCode.CONNECTION_REFUSED,
      'テストメッセージ'
    )

    expect(error.name).toBe('ObsidianApiError')
    expect(error.code).toBe(ObsidianErrorCode.CONNECTION_REFUSED)
    expect(error.message).toBe('テストメッセージ')
    expect(error.statusCode).toBeUndefined()
  })

  it('ステータスコードを保持できる', () => {
    const error = new ObsidianApiError(
      ObsidianErrorCode.UNAUTHORIZED,
      'Unauthorized',
      401
    )

    expect(error.statusCode).toBe(401)
  })
})

describe('getErrorMessage', () => {
  it('CONNECTION_REFUSED のメッセージを返す', () => {
    const error = new ObsidianApiError(
      ObsidianErrorCode.CONNECTION_REFUSED,
      'Connection refused'
    )

    const message = getErrorMessage(error)

    expect(message).toContain('Obsidianに接続できません')
    expect(message).toContain('Obsidianが起動しているか')
    expect(message).toContain('Local REST APIプラグインが有効か')
    expect(message).toContain('HTTPサーバーが有効か')
  })

  it('UNAUTHORIZED のメッセージを返す', () => {
    const error = new ObsidianApiError(
      ObsidianErrorCode.UNAUTHORIZED,
      'Unauthorized',
      401
    )

    const message = getErrorMessage(error)

    expect(message).toContain('APIキーが無効です')
  })

  it('TIMEOUT のメッセージを返す', () => {
    const error = new ObsidianApiError(
      ObsidianErrorCode.TIMEOUT,
      'Timeout'
    )

    const message = getErrorMessage(error)

    expect(message).toContain('タイムアウト')
  })

  it('NETWORK_ERROR のメッセージを返す', () => {
    const error = new ObsidianApiError(
      ObsidianErrorCode.NETWORK_ERROR,
      'Network error'
    )

    const message = getErrorMessage(error)

    expect(message).toContain('ネットワークエラー')
  })

  it('API_ERROR のメッセージを返す', () => {
    const error = new ObsidianApiError(
      ObsidianErrorCode.API_ERROR,
      '500 Internal Server Error',
      500
    )

    const message = getErrorMessage(error)

    expect(message).toContain('APIエラー')
    expect(message).toContain('500 Internal Server Error')
  })

  it('通常のErrorのメッセージを返す', () => {
    const error = new Error('通常のエラー')

    const message = getErrorMessage(error)

    expect(message).toBe('通常のエラー')
  })

  it('不明なエラーの場合はデフォルトメッセージを返す', () => {
    const message = getErrorMessage('文字列エラー')

    expect(message).toBe('不明なエラーが発生しました')
  })
})

describe('handleFetchError', () => {
  it('TypeError (failed to fetch) を CONNECTION_REFUSED に変換する', () => {
    const typeError = new TypeError('Failed to fetch')

    expect(() => handleFetchError(typeError)).toThrow(ObsidianApiError)

    try {
      handleFetchError(typeError)
    } catch (error) {
      expect(error).toBeInstanceOf(ObsidianApiError)
      expect((error as ObsidianApiError).code).toBe(ObsidianErrorCode.CONNECTION_REFUSED)
    }
  })

  it('TypeError (network) を CONNECTION_REFUSED に変換する', () => {
    const typeError = new TypeError('network error')

    expect(() => handleFetchError(typeError)).toThrow(ObsidianApiError)

    try {
      handleFetchError(typeError)
    } catch (error) {
      expect(error).toBeInstanceOf(ObsidianApiError)
      expect((error as ObsidianApiError).code).toBe(ObsidianErrorCode.CONNECTION_REFUSED)
    }
  })

  it('AbortError を TIMEOUT に変換する', () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError')

    expect(() => handleFetchError(abortError)).toThrow(ObsidianApiError)

    try {
      handleFetchError(abortError)
    } catch (error) {
      expect(error).toBeInstanceOf(ObsidianApiError)
      expect((error as ObsidianApiError).code).toBe(ObsidianErrorCode.TIMEOUT)
    }
  })

  it('その他のエラーを NETWORK_ERROR に変換する', () => {
    const error = new Error('Unknown error')

    expect(() => handleFetchError(error)).toThrow(ObsidianApiError)

    try {
      handleFetchError(error)
    } catch (e) {
      expect(e).toBeInstanceOf(ObsidianApiError)
      expect((e as ObsidianApiError).code).toBe(ObsidianErrorCode.NETWORK_ERROR)
    }
  })
})

describe('handleResponseError', () => {
  it('401 を UNAUTHORIZED に変換する', () => {
    const response = { status: 401 } as Response

    expect(() => handleResponseError(response)).toThrow(ObsidianApiError)

    try {
      handleResponseError(response)
    } catch (error) {
      expect(error).toBeInstanceOf(ObsidianApiError)
      expect((error as ObsidianApiError).code).toBe(ObsidianErrorCode.UNAUTHORIZED)
      expect((error as ObsidianApiError).statusCode).toBe(401)
    }
  })

  it('403 を UNAUTHORIZED に変換する', () => {
    const response = { status: 403 } as Response

    expect(() => handleResponseError(response)).toThrow(ObsidianApiError)

    try {
      handleResponseError(response)
    } catch (error) {
      expect(error).toBeInstanceOf(ObsidianApiError)
      expect((error as ObsidianApiError).code).toBe(ObsidianErrorCode.UNAUTHORIZED)
    }
  })

  it('その他のステータスを API_ERROR に変換する', () => {
    const response = { status: 500 } as Response

    expect(() => handleResponseError(response, 'Internal Server Error')).toThrow(ObsidianApiError)

    try {
      handleResponseError(response, 'Internal Server Error')
    } catch (error) {
      expect(error).toBeInstanceOf(ObsidianApiError)
      expect((error as ObsidianApiError).code).toBe(ObsidianErrorCode.API_ERROR)
      expect((error as ObsidianApiError).message).toBe('Internal Server Error')
      expect((error as ObsidianApiError).statusCode).toBe(500)
    }
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getUniqueFilePath, fileExists, testConnection } from '../../src/lib/obsidian-api'
import { ObsidianErrorCode } from '../../src/lib/errors'
import type { ExtensionSettings } from '../../src/types'

// fetch のモック
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const mockSettings: ExtensionSettings = {
  obsidianApiUrl: 'http://127.0.0.1:27123',
  obsidianApiKey: 'test-key',
  defaultFolder: 'X Clipper',
  imageFolder: 'X Clipper/images',
}

describe('fileExists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ファイルが存在する場合はtrueを返す', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })

    const result = await fileExists('test.md', mockSettings)

    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:27123/vault/test.md',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('ファイルが存在しない場合はfalseを返す', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })

    const result = await fileExists('notfound.md', mockSettings)

    expect(result).toBe(false)
  })

  it('エラーが発生した場合はfalseを返す', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await fileExists('error.md', mockSettings)

    expect(result).toBe(false)
  })
})

describe('getUniqueFilePath', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ファイルが存在しない場合はそのままのパスを返す', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })

    const result = await getUniqueFilePath('folder/test.md', mockSettings)

    expect(result).toBe('folder/test.md')
  })

  it('ファイルが存在する場合は(1)を付けたパスを返す', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true })  // test.md 存在する
      .mockResolvedValueOnce({ ok: false }) // test (1).md 存在しない

    const result = await getUniqueFilePath('folder/test.md', mockSettings)

    expect(result).toBe('folder/test (1).md')
  })

  it('(1)も存在する場合は(2)を付けたパスを返す', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true })  // test.md 存在する
      .mockResolvedValueOnce({ ok: true })  // test (1).md 存在する
      .mockResolvedValueOnce({ ok: false }) // test (2).md 存在しない

    const result = await getUniqueFilePath('folder/test.md', mockSettings)

    expect(result).toBe('folder/test (2).md')
  })

  it('日本語ファイル名でも正しく動作する', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true })  // 元ファイル存在
      .mockResolvedValueOnce({ ok: false }) // (1)存在しない

    const result = await getUniqueFilePath('X Clipper/テストツイート.md', mockSettings)

    expect(result).toBe('X Clipper/テストツイート (1).md')
  })
})

describe('testConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('接続成功時は success: true を返す', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })

    const result = await testConnection(mockSettings)

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:27123/vault/',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('401エラー時は UNAUTHORIZED エラーを返す', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })

    const result = await testConnection(mockSettings)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error?.code).toBe(ObsidianErrorCode.UNAUTHORIZED)
  })

  it('403エラー時は UNAUTHORIZED エラーを返す', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 })

    const result = await testConnection(mockSettings)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error?.code).toBe(ObsidianErrorCode.UNAUTHORIZED)
  })

  it('その他のHTTPエラー時は API_ERROR を返す', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const result = await testConnection(mockSettings)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error?.code).toBe(ObsidianErrorCode.API_ERROR)
    expect(result.error?.statusCode).toBe(500)
  })

  it('ネットワークエラー時は CONNECTION_REFUSED を返す', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const result = await testConnection(mockSettings)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error?.code).toBe(ObsidianErrorCode.CONNECTION_REFUSED)
  })
})

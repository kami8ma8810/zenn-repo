import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getSettings, saveSettings, resetSettings } from '../../src/lib/storage'
import { DEFAULT_SETTINGS, type ExtensionSettings } from '../../src/types'

// chrome グローバルの型宣言
declare const chrome: {
  storage: {
    local: {
      get: ReturnType<typeof vi.fn>
      set: ReturnType<typeof vi.fn>
    }
  }
}

describe('DEFAULT_SETTINGS', () => {
  it('デフォルトフォルダが「X Clipper」である', () => {
    expect(DEFAULT_SETTINGS.defaultFolder).toBe('X Clipper')
  })

  it('画像フォルダが「X Clipper/images」である', () => {
    expect(DEFAULT_SETTINGS.imageFolder).toBe('X Clipper/images')
  })
})

// chrome.storage.local のモック
const mockStorage: { settings?: Partial<ExtensionSettings> } = {}

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((key: string) => {
        return Promise.resolve({ [key]: mockStorage[key as keyof typeof mockStorage] })
      }),
      set: vi.fn((data: { settings?: Partial<ExtensionSettings> }) => {
        Object.assign(mockStorage, data)
        return Promise.resolve()
      }),
    },
  },
})

describe('storage', () => {
  beforeEach(() => {
    // ストレージをクリア
    delete mockStorage.settings
    vi.clearAllMocks()
  })

  describe('getSettings', () => {
    it('設定がない場合はデフォルト設定を返す', async () => {
      const settings = await getSettings()
      expect(settings).toEqual(DEFAULT_SETTINGS)
    })

    it('保存された設定とデフォルトをマージして返す', async () => {
      mockStorage.settings = { obsidianApiKey: 'test-key' }
      const settings = await getSettings()

      expect(settings.obsidianApiKey).toBe('test-key')
      expect(settings.obsidianApiUrl).toBe(DEFAULT_SETTINGS.obsidianApiUrl)
    })
  })

  describe('saveSettings', () => {
    it('設定を部分的に更新できる', async () => {
      await saveSettings({ obsidianApiKey: 'new-key' })

      expect(chrome.storage.local.set).toHaveBeenCalled()
      expect(mockStorage.settings).toMatchObject({
        obsidianApiKey: 'new-key',
      })
    })

    it('既存の設定を保持しながら更新できる', async () => {
      mockStorage.settings = {
        ...DEFAULT_SETTINGS,
        obsidianApiKey: 'old-key',
        defaultFolder: 'custom-folder',
      }

      await saveSettings({ obsidianApiKey: 'new-key' })

      expect(mockStorage.settings.obsidianApiKey).toBe('new-key')
      expect(mockStorage.settings.defaultFolder).toBe('custom-folder')
    })
  })

  describe('resetSettings', () => {
    it('設定をデフォルトにリセットできる', async () => {
      mockStorage.settings = { obsidianApiKey: 'custom-key' }

      await resetSettings()

      expect(mockStorage.settings).toEqual(DEFAULT_SETTINGS)
    })
  })
})

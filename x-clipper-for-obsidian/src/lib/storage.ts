import { DEFAULT_SETTINGS, type ExtensionSettings } from '@/types'

/**
 * chrome.storage.local のラッパー
 * 設定の読み書きを型安全に行う
 */

/** 設定を取得 */
export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get('settings')
  const savedSettings = result.settings as Partial<ExtensionSettings> | undefined
  return { ...DEFAULT_SETTINGS, ...savedSettings }
}

/** 設定を保存 */
export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const current = await getSettings()
  await chrome.storage.local.set({
    settings: { ...current, ...settings },
  })
}

/** 設定をリセット */
export async function resetSettings(): Promise<void> {
  await chrome.storage.local.set({ settings: DEFAULT_SETTINGS })
}

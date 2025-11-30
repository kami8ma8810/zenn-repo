import type { ExtensionSettings } from '@/types'

/**
 * Obsidian Local REST API クライアント
 * https://github.com/coddingtonbear/obsidian-local-rest-api
 */

/**
 * Obsidian APIへの接続をテスト
 */
export async function testConnection(settings: ExtensionSettings): Promise<boolean> {
  try {
    const response = await fetch(`${settings.obsidianApiUrl}/`, {
      method: 'GET',
      headers: buildHeaders(settings),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * ファイルが存在するかチェック
 * @param path ファイルパス
 * @param settings 設定
 * @returns 存在する場合true
 */
export async function fileExists(
  path: string,
  settings: ExtensionSettings
): Promise<boolean> {
  const url = `${settings.obsidianApiUrl}/vault/${encodeURIComponent(path)}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(settings),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * 重複しないファイルパスを生成
 * @param basePath 基本のファイルパス（.md拡張子含む）
 * @param settings 設定
 * @returns 重複しないファイルパス
 */
export async function getUniqueFilePath(
  basePath: string,
  settings: ExtensionSettings
): Promise<string> {
  // ファイルが存在しなければそのまま返す
  if (!(await fileExists(basePath, settings))) {
    return basePath
  }

  // 拡張子を分離
  const ext = '.md'
  const pathWithoutExt = basePath.slice(0, -ext.length)

  // (1), (2), ... と試す
  let counter = 1
  while (counter < 100) {
    const newPath = `${pathWithoutExt} (${counter})${ext}`
    if (!(await fileExists(newPath, settings))) {
      return newPath
    }
    counter++
  }

  // 100回試してもダメならタイムスタンプを追加
  return `${pathWithoutExt} (${Date.now()})${ext}`
}

/**
 * Obsidianにノートを作成
 * @param path ファイルパス（.md拡張子含む）
 * @param content Markdownコンテンツ
 * @param settings 設定
 */
export async function createNote(
  path: string,
  content: string,
  settings: ExtensionSettings
): Promise<void> {
  const url = `${settings.obsidianApiUrl}/vault/${encodeURIComponent(path)}`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      ...buildHeaders(settings),
      'Content-Type': 'text/markdown',
    },
    body: content,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create note: ${response.status} ${error}`)
  }
}

/**
 * Obsidianに画像ファイルを保存
 * @param path ファイルパス
 * @param imageBlob 画像のBlob
 * @param settings 設定
 */
export async function saveImage(
  path: string,
  imageBlob: Blob,
  settings: ExtensionSettings
): Promise<void> {
  const url = `${settings.obsidianApiUrl}/vault/${encodeURIComponent(path)}`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      ...buildHeaders(settings),
      'Content-Type': imageBlob.type,
    },
    body: imageBlob,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to save image: ${response.status} ${error}`)
  }
}

/**
 * Vaultのフォルダ一覧を取得
 */
export async function listFolders(settings: ExtensionSettings): Promise<string[]> {
  const url = `${settings.obsidianApiUrl}/vault/`

  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(settings),
  })

  if (!response.ok) {
    throw new Error(`Failed to list folders: ${response.status}`)
  }

  const data = await response.json() as { files: string[] }

  // フォルダのみをフィルタ（/で終わるもの）
  return data.files
    .filter((f: string) => f.endsWith('/'))
    .map((f: string) => f.slice(0, -1))
}

/**
 * APIリクエストのヘッダーを構築
 */
function buildHeaders(settings: ExtensionSettings): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/json',
  }

  if (settings.obsidianApiKey) {
    headers['Authorization'] = `Bearer ${settings.obsidianApiKey}`
  }

  return headers
}

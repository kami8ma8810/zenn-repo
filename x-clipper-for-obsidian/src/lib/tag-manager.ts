/** タグの最大数 */
const MAX_TAGS = 10

/** タグ管理インターフェース */
export interface TagManager {
  /** タグを追加（成功したらtrue） */
  addTag(tag: string): boolean
  /** カンマ区切りで複数タグを追加（追加された数を返す） */
  addTags(input: string): number
  /** タグを削除 */
  removeTag(tag: string): void
  /** 全てのタグを取得 */
  getTags(): string[]
  /** 全てのタグをクリア */
  clear(): void
  /** 追加可能か */
  canAddMore(): boolean
  /** タグ数を取得 */
  getCount(): number
}

/**
 * タグ管理インスタンスを作成
 */
export function createTagManager(): TagManager {
  const tags: string[] = []

  return {
    addTag(tag: string): boolean {
      const trimmed = tag.trim()

      // 空文字は追加しない
      if (!trimmed) {
        return false
      }

      // 最大数チェック
      if (tags.length >= MAX_TAGS) {
        return false
      }

      // 重複チェック
      if (tags.includes(trimmed)) {
        return false
      }

      tags.push(trimmed)
      return true
    },

    addTags(input: string): number {
      // カンマで分割してそれぞれ追加
      const parts = input.split(',')
      let addedCount = 0

      for (const part of parts) {
        if (this.addTag(part)) {
          addedCount++
        }
      }

      return addedCount
    },

    removeTag(tag: string): void {
      const index = tags.indexOf(tag)
      if (index !== -1) {
        tags.splice(index, 1)
      }
    },

    getTags(): string[] {
      return [...tags]
    },

    clear(): void {
      tags.length = 0
    },

    canAddMore(): boolean {
      return tags.length < MAX_TAGS
    },

    getCount(): number {
      return tags.length
    },
  }
}

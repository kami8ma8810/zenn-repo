import { describe, it, expect } from 'vitest'
import { shouldSaveAsThread } from '../../src/lib/thread-utils'

describe('shouldSaveAsThread', () => {
  describe('スレッドとして保存する条件', () => {
    it('スレッドが2件以上かつチェックがONの場合はtrueを返す', () => {
      expect(shouldSaveAsThread(2, true)).toBe(true)
      expect(shouldSaveAsThread(3, true)).toBe(true)
      expect(shouldSaveAsThread(10, true)).toBe(true)
    })
  })

  describe('単一ツイートとして保存する条件', () => {
    it('スレッドが1件以下の場合はfalseを返す（チェックに関係なく）', () => {
      expect(shouldSaveAsThread(0, true)).toBe(false)
      expect(shouldSaveAsThread(1, true)).toBe(false)
      expect(shouldSaveAsThread(0, false)).toBe(false)
      expect(shouldSaveAsThread(1, false)).toBe(false)
    })

    it('チェックがOFFの場合はfalseを返す（スレッド数に関係なく）', () => {
      expect(shouldSaveAsThread(2, false)).toBe(false)
      expect(shouldSaveAsThread(3, false)).toBe(false)
      expect(shouldSaveAsThread(10, false)).toBe(false)
    })
  })

  describe('エッジケース', () => {
    it('負の値の場合はfalseを返す', () => {
      expect(shouldSaveAsThread(-1, true)).toBe(false)
      expect(shouldSaveAsThread(-100, true)).toBe(false)
    })

    it('境界値（2）で正しく判定する', () => {
      // 2件未満 = false
      expect(shouldSaveAsThread(1, true)).toBe(false)
      // 2件以上 = true（チェックONの場合）
      expect(shouldSaveAsThread(2, true)).toBe(true)
    })
  })
})

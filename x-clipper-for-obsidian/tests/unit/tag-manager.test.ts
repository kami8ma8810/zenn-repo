import { describe, it, expect } from 'vitest'
import { createTagManager } from '../../src/lib/tag-manager'

describe('TagManager', () => {
  describe('addTag', () => {
    it('タグを追加できる', () => {
      const manager = createTagManager()
      const result = manager.addTag('test')
      expect(result).toBe(true)
      expect(manager.getTags()).toEqual(['test'])
    })

    it('空文字のタグは追加できない', () => {
      const manager = createTagManager()
      const result = manager.addTag('')
      expect(result).toBe(false)
      expect(manager.getTags()).toEqual([])
    })

    it('空白のみのタグは追加できない', () => {
      const manager = createTagManager()
      const result = manager.addTag('   ')
      expect(result).toBe(false)
      expect(manager.getTags()).toEqual([])
    })

    it('前後の空白はトリムされる', () => {
      const manager = createTagManager()
      manager.addTag('  hello  ')
      expect(manager.getTags()).toEqual(['hello'])
    })

    it('重複するタグは追加できない', () => {
      const manager = createTagManager()
      manager.addTag('test')
      const result = manager.addTag('test')
      expect(result).toBe(false)
      expect(manager.getTags()).toEqual(['test'])
    })

    it('最大10個まで追加できる', () => {
      const manager = createTagManager()
      for (let i = 1; i <= 10; i++) {
        const result = manager.addTag(`tag${i}`)
        expect(result).toBe(true)
      }
      expect(manager.getTags().length).toBe(10)
    })

    it('11個目は追加できない', () => {
      const manager = createTagManager()
      for (let i = 1; i <= 10; i++) {
        manager.addTag(`tag${i}`)
      }
      const result = manager.addTag('tag11')
      expect(result).toBe(false)
      expect(manager.getTags().length).toBe(10)
    })
  })

  describe('addTags（カンマ区切り）', () => {
    it('カンマ区切りで複数タグを追加できる', () => {
      const manager = createTagManager()
      const count = manager.addTags('post1,post2')
      expect(count).toBe(2)
      expect(manager.getTags()).toEqual(['post1', 'post2'])
    })

    it('カンマ+スペース区切りでも複数タグを追加できる', () => {
      const manager = createTagManager()
      const count = manager.addTags('post1, post2')
      expect(count).toBe(2)
      expect(manager.getTags()).toEqual(['post1', 'post2'])
    })

    it('前後にスペースがあってもトリムされる', () => {
      const manager = createTagManager()
      const count = manager.addTags('  tag1  ,  tag2  ')
      expect(count).toBe(2)
      expect(manager.getTags()).toEqual(['tag1', 'tag2'])
    })

    it('空文字のタグは無視される', () => {
      const manager = createTagManager()
      const count = manager.addTags('tag1,,tag2,')
      expect(count).toBe(2)
      expect(manager.getTags()).toEqual(['tag1', 'tag2'])
    })

    it('重複するタグは追加されない', () => {
      const manager = createTagManager()
      const count = manager.addTags('tag1,tag1,tag2')
      expect(count).toBe(2)
      expect(manager.getTags()).toEqual(['tag1', 'tag2'])
    })

    it('既存のタグと重複するものは追加されない', () => {
      const manager = createTagManager()
      manager.addTag('existing')
      const count = manager.addTags('existing,new')
      expect(count).toBe(1)
      expect(manager.getTags()).toEqual(['existing', 'new'])
    })

    it('上限を超える分は追加されない', () => {
      const manager = createTagManager()
      for (let i = 1; i <= 8; i++) {
        manager.addTag(`tag${i}`)
      }
      // 残り2枠に3つ追加しようとする
      const count = manager.addTags('new1,new2,new3')
      expect(count).toBe(2)
      expect(manager.getTags().length).toBe(10)
    })

    it('単一タグの場合も動作する', () => {
      const manager = createTagManager()
      const count = manager.addTags('single')
      expect(count).toBe(1)
      expect(manager.getTags()).toEqual(['single'])
    })

    it('タグ内のスペースはトリムされる', () => {
      const manager = createTagManager()
      const count = manager.addTags('  tag with spaces  ')
      expect(count).toBe(1)
      expect(manager.getTags()).toEqual(['tag with spaces'])
    })

    it('カンマ区切りの各タグのスペースがトリムされる', () => {
      const manager = createTagManager()
      const count = manager.addTags('  first  ,  second  ,  third  ')
      expect(count).toBe(3)
      expect(manager.getTags()).toEqual(['first', 'second', 'third'])
    })
  })

  describe('removeTag', () => {
    it('タグを削除できる', () => {
      const manager = createTagManager()
      manager.addTag('test')
      manager.removeTag('test')
      expect(manager.getTags()).toEqual([])
    })

    it('存在しないタグを削除しても問題ない', () => {
      const manager = createTagManager()
      manager.addTag('test')
      manager.removeTag('nonexistent')
      expect(manager.getTags()).toEqual(['test'])
    })
  })

  describe('clear', () => {
    it('全てのタグをクリアできる', () => {
      const manager = createTagManager()
      manager.addTag('tag1')
      manager.addTag('tag2')
      manager.clear()
      expect(manager.getTags()).toEqual([])
    })
  })

  describe('canAddMore', () => {
    it('10個未満ならtrueを返す', () => {
      const manager = createTagManager()
      expect(manager.canAddMore()).toBe(true)
    })

    it('10個ならfalseを返す', () => {
      const manager = createTagManager()
      for (let i = 1; i <= 10; i++) {
        manager.addTag(`tag${i}`)
      }
      expect(manager.canAddMore()).toBe(false)
    })
  })

  describe('getCount', () => {
    it('タグの数を返す', () => {
      const manager = createTagManager()
      expect(manager.getCount()).toBe(0)
      manager.addTag('tag1')
      expect(manager.getCount()).toBe(1)
      manager.addTag('tag2')
      expect(manager.getCount()).toBe(2)
    })
  })
})

import { describe, it, expect } from 'vitest'
import {
  hexToRgb,
  getLuminance,
  getContrastRatio,
  meetsWCAG_AA,
  COLOR_PALETTE,
} from '../../src/lib/color-contrast'

describe('hexToRgb', () => {
  it('6桁の16進数をRGBに変換できる', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('#7c3aed')).toEqual({ r: 124, g: 58, b: 237 })
  })

  it('大文字小文字を区別しない', () => {
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb('#7C3AED')).toEqual({ r: 124, g: 58, b: 237 })
  })

  it('#なしでも動作する', () => {
    expect(hexToRgb('ffffff')).toEqual({ r: 255, g: 255, b: 255 })
  })
})

describe('getLuminance', () => {
  it('白の相対輝度は1', () => {
    expect(getLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5)
  })

  it('黒の相対輝度は0', () => {
    expect(getLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5)
  })
})

describe('getContrastRatio', () => {
  it('白と黒のコントラスト比は21:1', () => {
    expect(getContrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1)
  })

  it('同じ色のコントラスト比は1:1', () => {
    expect(getContrastRatio('#7c3aed', '#7c3aed')).toBeCloseTo(1, 1)
  })
})

describe('meetsWCAG_AA', () => {
  it('4.5:1以上で通常テキストはAA適合', () => {
    // 白と黒は21:1なので適合
    expect(meetsWCAG_AA('#ffffff', '#000000', 'normal')).toBe(true)
  })

  it('3:1以上で大きいテキスト/UIコンポーネントはAA適合', () => {
    expect(meetsWCAG_AA('#ffffff', '#000000', 'large')).toBe(true)
    expect(meetsWCAG_AA('#ffffff', '#000000', 'ui')).toBe(true)
  })
})

describe('カラーパレットのWCAG 2.2 AA適合チェック', () => {
  // 通常テキスト（4.5:1以上必要）
  describe('通常テキスト（4.5:1以上）', () => {
    it('color-text on color-bg: メインテキスト', () => {
      const ratio = getContrastRatio(COLOR_PALETTE.text, COLOR_PALETTE.bg)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
      expect(meetsWCAG_AA(COLOR_PALETTE.text, COLOR_PALETTE.bg, 'normal')).toBe(true)
    })

    it('color-text-secondary on color-bg: セカンダリテキスト', () => {
      const ratio = getContrastRatio(COLOR_PALETTE.textSecondary, COLOR_PALETTE.bg)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
      expect(meetsWCAG_AA(COLOR_PALETTE.textSecondary, COLOR_PALETTE.bg, 'normal')).toBe(true)
    })

    it('color-text-secondary on color-bg-secondary: ステータスバー内テキスト', () => {
      const ratio = getContrastRatio(COLOR_PALETTE.textSecondary, COLOR_PALETTE.bgSecondary)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
      expect(meetsWCAG_AA(COLOR_PALETTE.textSecondary, COLOR_PALETTE.bgSecondary, 'normal')).toBe(true)
    })

    it('color-success on color-bg: 成功メッセージ', () => {
      const ratio = getContrastRatio(COLOR_PALETTE.success, COLOR_PALETTE.bg)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
      expect(meetsWCAG_AA(COLOR_PALETTE.success, COLOR_PALETTE.bg, 'normal')).toBe(true)
    })

    it('color-error on color-bg: エラーメッセージ', () => {
      const ratio = getContrastRatio(COLOR_PALETTE.error, COLOR_PALETTE.bg)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
      expect(meetsWCAG_AA(COLOR_PALETTE.error, COLOR_PALETTE.bg, 'normal')).toBe(true)
    })

    it('white on color-primary: プライマリボタンテキスト', () => {
      const ratio = getContrastRatio('#ffffff', COLOR_PALETTE.primary)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
      expect(meetsWCAG_AA('#ffffff', COLOR_PALETTE.primary, 'normal')).toBe(true)
    })

    it('color-bg on color-text: btn-smallテキスト', () => {
      const ratio = getContrastRatio(COLOR_PALETTE.bg, COLOR_PALETTE.text)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
      expect(meetsWCAG_AA(COLOR_PALETTE.bg, COLOR_PALETTE.text, 'normal')).toBe(true)
    })

    it('white on color-primary: タグテキスト', () => {
      const ratio = getContrastRatio('#ffffff', COLOR_PALETTE.primary)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
      expect(meetsWCAG_AA('#ffffff', COLOR_PALETTE.primary, 'normal')).toBe(true)
    })
  })

  // UIコンポーネント（3:1以上必要）
  describe('UIコンポーネント（3:1以上）', () => {
    it('color-border on color-bg: 入力フィールド境界線', () => {
      const ratio = getContrastRatio(COLOR_PALETTE.border, COLOR_PALETTE.bg)
      expect(ratio).toBeGreaterThanOrEqual(3)
      expect(meetsWCAG_AA(COLOR_PALETTE.border, COLOR_PALETTE.bg, 'ui')).toBe(true)
    })

    it('color-primary on color-bg: フォーカスリング', () => {
      const ratio = getContrastRatio(COLOR_PALETTE.primary, COLOR_PALETTE.bg)
      expect(ratio).toBeGreaterThanOrEqual(3)
      expect(meetsWCAG_AA(COLOR_PALETTE.primary, COLOR_PALETTE.bg, 'ui')).toBe(true)
    })

    it('color-success on color-bg: 接続ステータスドット', () => {
      const ratio = getContrastRatio(COLOR_PALETTE.success, COLOR_PALETTE.bg)
      expect(ratio).toBeGreaterThanOrEqual(3)
      expect(meetsWCAG_AA(COLOR_PALETTE.success, COLOR_PALETTE.bg, 'ui')).toBe(true)
    })

    it('color-error on color-bg: エラーステータスドット', () => {
      const ratio = getContrastRatio(COLOR_PALETTE.error, COLOR_PALETTE.bg)
      expect(ratio).toBeGreaterThanOrEqual(3)
      expect(meetsWCAG_AA(COLOR_PALETTE.error, COLOR_PALETTE.bg, 'ui')).toBe(true)
    })

    it('color-warning on color-bg: 警告ステータスドット', () => {
      const ratio = getContrastRatio(COLOR_PALETTE.warning, COLOR_PALETTE.bg)
      expect(ratio).toBeGreaterThanOrEqual(3)
      expect(meetsWCAG_AA(COLOR_PALETTE.warning, COLOR_PALETTE.bg, 'ui')).toBe(true)
    })

    it('color-tagRemoveText on color-tagRemoveBg: タグ削除ボタン', () => {
      const ratio = getContrastRatio(COLOR_PALETTE.tagRemoveText, COLOR_PALETTE.tagRemoveBg)
      expect(ratio).toBeGreaterThanOrEqual(3)
      expect(meetsWCAG_AA(COLOR_PALETTE.tagRemoveText, COLOR_PALETTE.tagRemoveBg, 'ui')).toBe(true)
    })
  })
})

/**
 * WCAG 2.2 コントラスト比計算ユーティリティ
 * 参考: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
 */

/** RGB値 */
export interface RGB {
  r: number
  g: number
  b: number
}

/**
 * カラーパレット定義
 * popup.css の :root 変数と同期
 *
 * WCAG 2.2 AA 基準:
 * - 通常テキスト: 4.5:1以上
 * - 大きいテキスト/UI: 3:1以上
 */
export const COLOR_PALETTE = {
  primary: '#7c3aed',
  primaryHover: '#6d28d9',
  success: '#047857',       // 調整: #10b981 → #047857 (4.56:1)
  error: '#dc2626',
  warning: '#b45309',       // 調整: #d97706 → #b45309 (4.51:1, テキストにも使えるように)
  bg: '#ffffff',
  bgSecondary: '#f3f4f6',
  text: '#1f2937',
  textHover: '#29394f',
  textSecondary: '#595f69', // 調整: #6b7280 → #595f69 (5.09:1 on bg, 4.51:1 on bgSecondary)
  border: '#6b7280',        // 調整: #e5e7eb → #6b7280 (4.64:1)
  tagRemoveBg: '#ffffff',   // タグ削除ボタン背景: 白
  tagRemoveText: '#1f2937', // タグ削除ボタンテキスト: text色
} as const

/**
 * 16進数カラーコードをRGBに変換
 */
export function hexToRgb(hex: string): RGB {
  const cleanHex = hex.replace('#', '')
  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16),
  }
}

/**
 * sRGB値を線形RGB値に変換
 * WCAG 2.x の相対輝度計算に使用
 */
function sRGBtoLinear(value: number): number {
  const normalized = value / 255
  return normalized <= 0.04045
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4)
}

/**
 * 相対輝度を計算
 * 参考: https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getLuminance(rgb: RGB): number {
  const r = sRGBtoLinear(rgb.r)
  const g = sRGBtoLinear(rgb.g)
  const b = sRGBtoLinear(rgb.b)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * コントラスト比を計算
 * 参考: https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(hexToRgb(color1))
  const lum2 = getLuminance(hexToRgb(color2))
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  return (lighter + 0.05) / (darker + 0.05)
}

/** テキストサイズタイプ */
export type TextSize = 'normal' | 'large' | 'ui'

/**
 * WCAG 2.2 AA基準を満たすかチェック
 * - normal: 通常テキスト → 4.5:1以上
 * - large: 大きいテキスト（18px以上、または14px太字以上） → 3:1以上
 * - ui: UIコンポーネント/グラフィック → 3:1以上
 */
export function meetsWCAG_AA(
  foreground: string,
  background: string,
  textSize: TextSize
): boolean {
  const ratio = getContrastRatio(foreground, background)
  const minRatio = textSize === 'normal' ? 4.5 : 3
  return ratio >= minRatio
}

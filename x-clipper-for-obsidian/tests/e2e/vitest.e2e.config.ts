import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

/**
 * E2E テスト仕様ファイル用の Vitest 設定
 *
 * 注意: このプロジェクトの E2E テストは Chrome DevTools MCP を使用するため、
 * Claude Code から直接実行する形式を採用している。
 * この設定ファイルは型チェックと将来的な自動化のために残している。
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.e2e.ts'],
    testTimeout: 60000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../src'),
    },
  },
})

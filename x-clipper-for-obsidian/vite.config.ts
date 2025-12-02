import { defineConfig } from 'vite'
import { crx, type ManifestV3Export } from '@crxjs/vite-plugin'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import manifest from './src/manifest.json'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    crx({ manifest: manifest as ManifestV3Export }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        onboarding: resolve(__dirname, 'src/onboarding/onboarding.html'),
      },
    },
  },
})

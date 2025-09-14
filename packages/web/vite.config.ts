import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, '../domain/src'),
      '@application': path.resolve(__dirname, '../application/src'),
      '@infrastructure': path.resolve(__dirname, '../infrastructure/src'),
    },
  },
  server: {
    port: 3000,
  },
})

// File: frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // === 这里是新增的关键配置 ===
    proxy: {
      // 告诉 Vite：所有发往 /register 的请求，实际转发给 localhost:8000
      '/register': 'http://127.0.0.1:8000',
      '/token': 'http://127.0.0.1:8000',
      '/init': 'http://127.0.0.1:8000',
      '/chat': 'http://127.0.0.1:8000',
      '/puzzles': 'http://127.0.0.1:8000',
      '/upload_puzzle': 'http://127.0.0.1:8000',
      '/users': 'http://127.0.0.1:8000',
    }
    // ==========================
  }
})
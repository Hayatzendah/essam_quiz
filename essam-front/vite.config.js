import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: './', // مسارات نسبية عشان الـ assets تتحمّل صح على Hostinger
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    // لا يوجد proxy - نستخدم الدومين الكامل مباشرة من api.js
    // baseURL في api.js: https://api.deutsch-tests.com
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
})

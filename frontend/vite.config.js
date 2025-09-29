import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1', // 强制用 IPv4，而不是 ::1
    port: 30033,         // 你也可以改成别的端口
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:30022',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

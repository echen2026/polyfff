import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  server: {
    host: true,
    allowedHosts: [
      'deac4ed5-09b6-4c45-8b26-298065410e1b-00-1d77xeuxhc4vt.janeway.replit.dev'
    ],
    proxy: {
      // Proxy the Socket.IO endpoint including websocket connections.
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      },
      // Proxy API calls to our backend
      '/api': {
        target: 'http://localhost:3000'
      }
    }
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  }
}) 
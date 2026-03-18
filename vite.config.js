import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Development server configuration
    host: 'localhost',
    port: 5173,
    // Proxy API calls to Django backend
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path,
        secure: false,
      },
      '/auth': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path,
        secure: false,
      },
    },
  },
  define: {
    // Expose environment variables to client
    __APP_ENV__: JSON.stringify(process.env.VITE_API_URL || 'http://localhost:8000'),
  },
})

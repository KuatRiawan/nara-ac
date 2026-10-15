import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Strip console.log/info/debug di production build (AUD-021)
      // console.warn dan console.error tetap aktif untuk debugging
      {
        name: 'strip-console',
        transform(code, id) {
          if (mode === 'production' && !id.includes('node_modules')) {
            return {
              code: code.replace(/console\.(log|info|debug)\(/g, 'void('),
              map: null,
            }
          }
          return null
        },
      },
    ],
    // Nonaktifkan source map di production (AUD-012)
    build: {
      sourcemap: false,
    },
    server: {
      port: 5173,
      // Batasi host yang diizinkan — cegah DNS rebinding (AUD-018)
      allowedHosts: ['localhost', '127.0.0.1'],
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true
        }
      }
    }
  }
})

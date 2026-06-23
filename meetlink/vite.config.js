import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// The backend's CORS rejects unknown origins with a 500. These are server-side
// proxied requests (the browser talks to Vite same-origin), so CORS doesn't apply —
// strip the Origin header so the backend treats them as same-origin.
const stripOrigin = (proxy) => {
  proxy.on('proxyReq', (proxyReq) => {
    proxyReq.removeHeader('origin')
  })
  proxy.on('proxyReqWs', (proxyReq) => {
    try {
      proxyReq.removeHeader('origin')
    } catch {
      /* header may already be gone */
    }
  })
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    // Honour the port assigned by the preview/launch tool (PORT env); fall back to 5180.
    port: process.env.PORT ? Number(process.env.PORT) : 5180,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        // No rewrite: the backend now serves its routes under /api (global prefix),
        // matching production where NestJS serves both the API and the SPA.
        configure: stripOrigin,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:4000',
        ws: true,
        changeOrigin: true,
        configure: stripOrigin,
      },
    },
  },
})

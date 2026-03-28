import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // manifest.json is already in /public — let VitePWA handle SW only
      registerType: 'prompt',
      injectRegister: 'auto',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@tg/core/ai':        resolve(__dirname, '../../packages/core/src/ai.js'),
      '@tg/core/constants': resolve(__dirname, '../../packages/core/src/constants.js'),
      '@tg/core/crypto':    resolve(__dirname, '../../packages/core/src/crypto.js'),
      '@tg/core/plugins':   resolve(__dirname, '../../packages/core/src/plugins.js'),
      '@tg/core':           resolve(__dirname, '../../packages/core/index.js'),
    },
  },
})

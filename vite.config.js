import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "generateSW" yerine "injectManifest": kendi servis çalışanımızı
      // (src/sw.js) yazıyoruz çünkü hem offline önbellekleme hem push
      // bildirim arka plan işleyicisi (Firebase Messaging) AYNI dosyada
      // olmak zorunda — iki ayrı servis çalışanı aynı kapsamda (scope)
      // çakışır, sadece biri "kazanır".
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Seyirdefteri',
        short_name: 'Seyirdefteri',
        description: 'Kültür ve sanat günlüğü — film, dizi, kitap, sanat ve topluluk.',
        theme_color: '#1F2421',
        background_color: '#F5EFE1',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'tr',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})

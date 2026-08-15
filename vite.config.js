import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "injectManifest" değil "generateSW" stratejisi kullanıyoruz — kendi
      // servis çalışanı kodumuzu elle yazmak yerine, statik dosya önbellekleme
      // (offline'da açılabilme) kısmını eklenti otomatik hallediyor. Push
      // bildirimi mantığı ayrı bir adımda, bu dosyanın üstüne eklenecek
      // (bkz. src/firebase-messaging-sw.js — bir sonraki iterasyon).
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Seyirdefteri',
        short_name: 'Seyirdefteri',
        description: 'Kültür ve sanat günlüğü — film, dizi, kitap, sanat ve topluluk.',
        // Sitenin kağıt/mürekkep paletiyle birebir aynı — bkz. tailwind.config.js
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
      workbox: {
        // Firebase/TMDB/Google Books gibi dış API çağrılarını önbelleğe almıyoruz
        // (güncel veri şart) — sadece kendi statik dosyalarımız (JS/CSS/font/görsel)
        // offline'da da açılabilsin diye önbelleğe alınıyor.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
})

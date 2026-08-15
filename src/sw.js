import { precacheAndRoute } from 'workbox-precaching'
import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'

// Yeni bir servis çalışanı sürümü yüklenir yüklenmez hemen devreye girsin
// (self.skipWaiting) ve açık olan tüm sekmelerin kontrolünü hemen alsın
// (clients.claim) — bunlar olmadan, yeni deploy sunucuda hazır olsa bile
// tarayıcı TÜM sekmeler kapatılıp yeniden açılana kadar eski önbellekteki
// sürümü göstermeye devam ediyordu (bu yüzden bazı değişiklikler görünüp
// bazıları görünmüyordu — kafa karıştırıcı, kısmi bir önbellek durumuydu).
self.skipWaiting()
self.addEventListener('activate', () => self.clients.claim())

// vite-plugin-pwa (injectManifest stratejisi) build sırasında bu satırı
// gerçek dosya listesiyle değiştiriyor — offline'da açılabilme burada.
precacheAndRoute(self.__WB_MANIFEST)

// Servis çalışanı içinde import.meta.env değerleri Vite tarafından build
// zamanında gerçek değerlerle değiştiriliyor (injectManifest de normal bir
// Vite/Rollup adımından geçiyor) — ayrı bir yapılandırma dosyasına gerek yok.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const messaging = getMessaging(app)

// Sayfa/sekme KAPALIYKEN veya arka plandayken gelen push bildirimlerini
// işler — telefon/masaüstü bildirim merkezinde göstermek buradan oluyor.
// Sayfa açıkken gelen bildirimler bunun yerine src/utils/bildirim.js'teki
// onMessage() ile (uygulama içi) ele alınıyor.
onBackgroundMessage(messaging, (payload) => {
  const baslik = payload.notification?.title || 'Seyirdefteri'
  const secenekler = {
    body: payload.notification?.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: payload.data?.url || '/' },
  }
  self.registration.showNotification(baslik, secenekler)
})

// Bildirime tıklanınca ilgili sayfayı aç (zaten açık bir sekme varsa ona odaklan).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})

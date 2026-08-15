import { getMessaging, getToken, deleteToken, onMessage, isSupported } from 'firebase/messaging'
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { app, db } from '../firebase.js'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

let _messaging = null
async function messagingGetir() {
  if (!(await isSupported())) return null
  if (!_messaging) _messaging = getMessaging(app)
  return _messaging
}

// Tarayıcının push bildirimi destekleyip desteklemediği + kullanıcının daha
// önce izin verip vermediği (ya da reddettiği) durumu. Notification.permission
// üç değer alabilir: 'default' (hiç sorulmamış), 'granted', 'denied'.
export async function bildirimDurumu() {
  const destekleniyor = (await isSupported()) && 'Notification' in window
  return {
    destekleniyor,
    izin: destekleniyor ? Notification.permission : 'unsupported',
  }
}

// Firebase Messaging SDK'sı varsayılan olarak KENDİ /firebase-messaging-sw.js
// dosyasını otomatik kaydetmeye çalışıyor — biz onun yerine tek, birleşik bir
// servis çalışanı (src/sw.js -> /sw.js, hem offline önbellek hem push burada)
// kullandığımızdan, o dosya hiç yok ve kayıt sessizce başarısız oluyordu
// ("unsupported MIME type" hatası — Vercel'in SPA yönlendirmesi index.html
// döndürüyor). Çözüm: zaten kayıtlı olan servis çalışanını (vite-plugin-pwa
// sayfa yüklenirken otomatik kaydediyor) Firebase'e elle veriyoruz.
async function kayitliServisCalisaniniGetir() {
  if (!('serviceWorker' in navigator)) return undefined
  const kayit = await navigator.serviceWorker.ready
  return kayit
}

// İzin isteyip, verilirse cihaz token'ını alıp Firestore'a kaydeder. Birden
// fazla cihazdan (telefon + bilgisayar) bildirim açılabilsin diye token'lar
// bir dizi değil, kendi belge ID'si token olan bir alt koleksiyon.
export async function bildirimleriEtkinlestir(kullanici) {
  if (!VAPID_KEY) throw new Error("VITE_FIREBASE_VAPID_KEY tanımlı değil — Firebase Console > Cloud Messaging > Web Push sertifikaları.")
  const messaging = await messagingGetir()
  if (!messaging) throw new Error('Bu tarayıcı push bildirimini desteklemiyor.')

  const izin = await Notification.requestPermission()
  if (izin !== 'granted') throw new Error('Bildirim izni verilmedi.')

  const kayit = await kayitliServisCalisaniniGetir()
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: kayit })
  if (!token) throw new Error("Cihaz token'ı alınamadı.")

  await setDoc(doc(db, 'kullanicilar', kullanici.uid, 'bildirimTokenlari', token), {
    olusturmaTarihi: serverTimestamp(),
    tarayici: navigator.userAgent,
  })
  return token
}

// Sadece bu cihazdaki bildirimleri kapatır (token'ı hem tarayıcıdan hem
// Firestore'dan siler) — diğer cihazlarda açık kalmaya devam eder.
export async function bildirimleriKapat(kullanici) {
  const messaging = await messagingGetir()
  if (!messaging) return
  const kayit = await kayitliServisCalisaniniGetir()
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: kayit }).catch(() => null)
  if (token) {
    await deleteToken(messaging).catch(() => {})
    await deleteDoc(doc(db, 'kullanicilar', kullanici.uid, 'bildirimTokenlari', token)).catch(() => {})
  }
}

// Sekme AÇIKKEN gelen bildirimler tarayıcı bildirim merkezine düşmez (bu,
// tarayıcıların standart davranışı) — bu yüzden ayrıca dinleyip küçük bir
// uygulama-içi uyarı göstermek isteyen bileşenler bunu kullanabilir.
// Şimdilik sadece konsola yazıyoruz; ileride bir "toast" bileşenine bağlanabilir.
export async function onPlanBildirimDinle(geriCagirma) {
  const messaging = await messagingGetir()
  if (!messaging) return () => {}
  return onMessage(messaging, geriCagirma)
}

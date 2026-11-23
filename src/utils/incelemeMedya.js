import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { db, storage } from '../firebase.js'

// İnceleme Defteri "Medya Kutusu": bir film etkinliğine eklenen kareler, kesit videoları,
// müzik ve sosyal medya bağlantıları. Hepsi tek koleksiyonda:
//   gelecekEtkinlikler/{etkinlikId}/medya/{id}
//   { tur: 'kare'|'video'|'muzik'|'sosyal', url, kaynak: 'tmdb'|'yukleme'|'link', baslik, ekleyenId, ekleyenAd, tarih }
// Okuma: topluluk üyeleri. Düzenleme/silme: sadece ekleyen (bkz. firestore.rules).

export const MEDYA_TURLERI = ['kare', 'video', 'muzik', 'sosyal']
export const VIDEO_MAKS_MB = 60

const zamanMs = (k) => k.tarih?.toMillis?.() ?? Date.now()
const sirala = (liste) => liste.sort((a, b) => zamanMs(a) - zamanMs(b))

export function medyaDinle(etkinlikId, cb, hataCb) {
  return onSnapshot(
    collection(db, 'gelecekEtkinlikler', etkinlikId, 'medya'),
    (snap) => cb(sirala(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
    hataCb
  )
}

export async function medyaGetir(etkinlikId) {
  const snap = await getDocs(collection(db, 'gelecekEtkinlikler', etkinlikId, 'medya'))
  return sirala(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
}

export async function medyaEkle(etkinlikId, kullanici, ad, { tur, url, kaynak, baslik }) {
  await addDoc(collection(db, 'gelecekEtkinlikler', etkinlikId, 'medya'), {
    tur,
    url,
    kaynak,
    baslik: (baslik || '').slice(0, 300),
    ekleyenId: kullanici.uid,
    ekleyenAd: ad || '',
    tarih: serverTimestamp(),
  })
}

export async function medyaBaslikGuncelle(etkinlikId, kayit, baslik) {
  await updateDoc(doc(db, 'gelecekEtkinlikler', etkinlikId, 'medya', kayit.id), { baslik: (baslik || '').slice(0, 300) })
}

export async function medyaSil(etkinlikId, kayit) {
  await deleteDoc(doc(db, 'gelecekEtkinlikler', etkinlikId, 'medya', kayit.id))
  // Bizim yüklediğimiz dosyaysa Storage'dan da kaldır (başarısız olursa sessizce geç).
  if (kayit.kaynak === 'yukleme') {
    try {
      await deleteObject(ref(storage, kayit.url))
    } catch {
      /* dosya zaten yoksa/yetki yoksa kayıt silinmiş olması yeterli */
    }
  }
}

// --- Link çözümleme -------------------------------------------------------

function zamanSaniye(s) {
  if (!s) return 0
  if (/^\d+s?$/.test(s)) return parseInt(s, 10)
  const m = s.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0
}

// Yapıştırılan linkin ne olduğunu anlar: youtube | spotify | vimeo | sosyal (Instagram/X/TikTok) | diger
export function linkCoz(url) {
  const u = (url || '').trim()
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)
  if (m) {
    const t = u.match(/[?&#](?:t|start)=([0-9hms]+)/)
    return { tip: 'youtube', id: m[1], baslangic: zamanSaniye(t?.[1]) }
  }
  m = u.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/)
  if (m) return { tip: 'spotify', tur: m[1], id: m[2] }
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (m) return { tip: 'vimeo', id: m[1] }
  if (/(instagram\.com|twitter\.com|x\.com|tiktok\.com)\//.test(u)) return { tip: 'sosyal' }
  return { tip: 'diger' }
}

// Hangi sekmede hangi link türü kabul edilir? Hata mesajı döner (geçerliyse '').
export function linkHatasi(tur, url) {
  if (!/^https:\/\//i.test((url || '').trim())) return 'Bağlantı https:// ile başlamalı.'
  const c = linkCoz(url)
  if (tur === 'video' && !['youtube', 'vimeo'].includes(c.tip)) return 'Kesit için YouTube ya da Vimeo bağlantısı yapıştır (ya da video yükle).'
  if (tur === 'muzik' && !['spotify', 'youtube'].includes(c.tip)) return 'Müzik için Spotify ya da YouTube bağlantısı yapıştır.'
  if (tur === 'sosyal' && !['sosyal', 'youtube'].includes(c.tip)) return 'Instagram, X (Twitter), TikTok ya da YouTube paylaşım bağlantısı yapıştır.'
  return ''
}

// Gömülebilir video: link ise iframe adresi, yüklenmiş dosya ise doğrudan dosya.
export function videoGomuGetir(kayit) {
  if (kayit.kaynak === 'yukleme') return { tip: 'dosya', src: kayit.url }
  const c = linkCoz(kayit.url)
  if (c.tip === 'youtube') return { tip: 'iframe', src: `https://www.youtube-nocookie.com/embed/${c.id}?rel=0&start=${c.baslangic || 0}` }
  if (c.tip === 'vimeo') return { tip: 'iframe', src: `https://player.vimeo.com/video/${c.id}` }
  return null
}

// --- Video yükleme (Firebase Storage, 'inceleme-videolari' klasörü — bkz. storage.rules) ---

export function videoYukle(dosya, { uid, onIlerleme }) {
  return new Promise((resolve, reject) => {
    if (!dosya.type.startsWith('video/')) return reject(new Error('Sadece video dosyası yükleyebilirsin (mp4, webm, mov).'))
    if (dosya.size > VIDEO_MAKS_MB * 1024 * 1024) return reject(new Error(`Video çok büyük (en fazla ${VIDEO_MAKS_MB} MB). Kısa bir kesit yükle ya da YouTube bağlantısı ekle.`))
    const uzanti = (dosya.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'mp4'
    const depoRef = ref(storage, `inceleme-videolari/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${uzanti}`)
    const gorev = uploadBytesResumable(depoRef, dosya, { contentType: dosya.type })
    gorev.on(
      'state_changed',
      (s) => onIlerleme?.(Math.round((100 * s.bytesTransferred) / s.totalBytes)),
      reject,
      async () => {
        try {
          resolve(await getDownloadURL(gorev.snapshot.ref))
        } catch (err) {
          reject(err)
        }
      }
    )
  })
}

// --- TMDB: resmi kareler ve fragmanlar -------------------------------------

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const onbellek = new Map()

async function tmdb(yol) {
  const anahtar = yol
  if (onbellek.has(anahtar)) return onbellek.get(anahtar)
  const res = await fetch(`https://api.themoviedb.org/3${yol}${yol.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}`)
  if (!res.ok) throw new Error('TMDB yanıt vermedi')
  const veri = await res.json()
  onbellek.set(anahtar, veri)
  return veri
}

// Filmin resmi kareleri (arka plan görselleri). Önce yazısız olanlar, yoksa hepsi.
export async function tmdbKareleriGetir(tmdbId) {
  if (!TMDB_API_KEY || !tmdbId) return []
  let veri = await tmdb(`/movie/${tmdbId}/images?include_image_language=null`)
  let liste = veri.backdrops || []
  if (liste.length === 0) {
    veri = await tmdb(`/movie/${tmdbId}/images`)
    liste = veri.backdrops || []
  }
  return liste.slice(0, 40).map((b) => ({
    kucuk: `https://image.tmdb.org/t/p/w300${b.file_path}`,
    buyuk: `https://image.tmdb.org/t/p/w1280${b.file_path}`,
  }))
}

// Fragman ve kesitler (YouTube). Türkçe yoksa İngilizce'ye düşer.
export async function tmdbVideolariGetir(tmdbId) {
  if (!TMDB_API_KEY || !tmdbId) return []
  const turler = ['Trailer', 'Teaser', 'Clip', 'Featurette', 'Behind the Scenes']
  const filtre = (v) => (v.results || []).filter((x) => x.site === 'YouTube' && turler.includes(x.type))
  let liste = filtre(await tmdb(`/movie/${tmdbId}/videos?language=tr-TR`))
  if (liste.length === 0) liste = filtre(await tmdb(`/movie/${tmdbId}/videos?language=en-US`))
  const sira = (t) => turler.indexOf(t)
  return liste
    .sort((a, b) => sira(a.type) - sira(b.type))
    .slice(0, 12)
    .map((v) => ({ id: v.key, ad: v.name, tur: v.type }))
}

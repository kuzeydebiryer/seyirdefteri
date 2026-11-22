import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import { gelecekEtkinlikOlustur } from './gelecekEtkinlik.js'
import { oneriSil } from './etkinlikOnerisi.js'

// 🎬 Sinema Odası — Faz 2.5
//   oda/ekran                       → "Ekrana Yansıt" (her üye; son yansıtan ekranı değiştirir)
//   etkinlikOnerileri (topluluk)     → kalıcı aday havuzu (topluluk sayfasındaki "Etkinlik Önerileri")
//   gelecekEtkinlikler/{id}/adayOylari/{uid} → gelecek film oylaması (tek oy)

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const POSTER = 'https://image.tmdb.org/t/p/w342'
const ekranRef = (eid) => doc(db, 'gelecekEtkinlikler', eid, 'oda', 'ekran')

export const BOS_EKRAN = { tur: 'yok' }

export function ekranDinle(eid, cb, hataCb) {
  return onSnapshot(ekranRef(eid), (s) => cb(s.exists() ? s.data() : BOS_EKRAN), hataCb)
}

// veri: { tur: 'eser', eser } | { tur: 'liste', liste, vurgu } | { tur: 'aday' } | { tur: 'yok' }
export function ekranaYansit(eid, uid, ad, veri) {
  return setDoc(ekranRef(eid), { ...veri, yansitanId: uid, yansitanAd: String(ad || 'Üye').slice(0, 60), zaman: serverTimestamp() })
}
export const ekraniKapat = (eid, uid, ad) => ekranaYansit(eid, uid, ad, { tur: 'yok' })

// --- TMDB: yapım ara + yansıtılacak kısa künye ---
export async function yapimAra(sorgu) {
  if (!TMDB_API_KEY || sorgu.trim().length < 2) return []
  const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&language=tr-TR&include_adult=false&query=${encodeURIComponent(sorgu.trim())}`)
  const d = await res.json()
  return (d.results || [])
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .slice(0, 12)
    .map((r) => ({
      eserTur: r.media_type === 'movie' ? 'sinema' : 'dizi',
      eserTmdbId: r.id,
      eserBaslik: r.title || r.name || '',
      eserYil: (r.release_date || r.first_air_date || '').slice(0, 4),
      eserPosterUrl: r.poster_path ? `${POSTER}${r.poster_path}` : '',
    }))
}

// Yansıtma anında künye çekilir ve ekran belgesine yazılır — izleyenler ayrıca TMDB'ye gitmez.
export async function yansitilacakEser(eser) {
  const temel = {
    tur: eser.eserTur || 'sinema',
    disId: Number(eser.eserTmdbId) || null,
    baslik: eser.eserBaslik || '',
    yil: String(eser.eserYil || ''),
    posterUrl: eser.eserPosterUrl || '',
    ozet: '',
    kunye: '',
    backdropUrl: '',
  }
  if (!TMDB_API_KEY || !temel.disId || !['sinema', 'dizi'].includes(temel.tur)) return temel
  try {
    const tip = temel.tur === 'sinema' ? 'movie' : 'tv'
    const res = await fetch(`https://api.themoviedb.org/3/${tip}/${temel.disId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=credits`)
    const d = await res.json()
    const yonetmen =
      tip === 'movie'
        ? (d.credits?.crew || []).filter((k) => k.job === 'Director').map((k) => k.name)
        : (d.created_by || []).map((k) => k.name)
    const sure = tip === 'movie' ? d.runtime && `${d.runtime} dk` : d.number_of_seasons && `${d.number_of_seasons} sezon`
    return {
      ...temel,
      posterUrl: temel.posterUrl || (d.poster_path ? `${POSTER}${d.poster_path}` : ''),
      backdropUrl: d.backdrop_path ? `https://image.tmdb.org/t/p/w780${d.backdrop_path}` : '',
      ozet: (d.overview || '').slice(0, 700),
      kunye: [
        yonetmen.length ? `${tip === 'movie' ? 'Yönetmen' : 'Yaratıcı'}: ${yonetmen.slice(0, 2).join(', ')}` : '',
        sure,
        (d.genres || []).map((g) => g.name).slice(0, 3).join(', '),
        (d.production_countries || d.origin_country || []).map((c) => c.name || c).slice(0, 2).join(', '),
      ]
        .filter(Boolean)
        .join(' · '),
      oyuncular: (d.credits?.cast || []).slice(0, 5).map((k) => k.name).join(', '),
    }
  } catch {
    return temel
  }
}

export const eserSayfaYolu = (e) => (e?.tur === 'dizi' ? `/dizi/${e.disId}` : e?.tur === 'sinema' ? `/film/${e.disId}` : null)

// --- Aday havuzu (topluluğun Etkinlik Önerileri) ---
export function adaylariDinle(topluluklId, cb, hataCb) {
  return onSnapshot(
    query(collection(db, 'etkinlikOnerileri'), where('topluluklId', '==', topluluklId), orderBy('oneriTarihi', 'desc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((o) => o.eserTur !== 'kitap')),
    hataCb
  )
}

// --- Gelecek film oylaması (tek oy) ---
export function adayOylariniDinle(eid, cb, hataCb) {
  return onSnapshot(
    collection(db, 'gelecekEtkinlikler', eid, 'adayOylari'),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))),
    hataCb
  )
}
export const adayaOyVer = (eid, uid, ad, oneriId) =>
  setDoc(doc(db, 'gelecekEtkinlikler', eid, 'adayOylari', uid), { oneriId, ad: String(ad || 'Üye').slice(0, 60), zaman: serverTimestamp() })
export const adayOyumuGeriCek = (eid, uid) => deleteDoc(doc(db, 'gelecekEtkinlikler', eid, 'adayOylari', uid))

export function adaySayimi(adaylar, oylar) {
  const sayac = new Map()
  oylar.forEach((o) => sayac.set(o.oneriId, (sayac.get(o.oneriId) || 0) + 1))
  return adaylar
    .map((a) => ({ ...a, oy: sayac.get(a.id) || 0, oyVerenler: oylar.filter((o) => o.oneriId === a.id).map((o) => o.ad) }))
    .sort((a, b) => b.oy - a.oy || (b.begenenler || []).length - (a.begenenler || []).length)
}

// Kazananı gelecek etkinlik yapar. Öneri silinmeye çalışılır (yetki yoksa öneri havuzda kalır).
export async function kazananiEtkinlikYap(oneri, tarih, topluluk, kullanici, oySayisi) {
  const eser = {
    eserTur: oneri.eserTur,
    eserTmdbId: oneri.eserTmdbId,
    eserBaslik: oneri.eserBaslik,
    eserYil: oneri.eserYil || '',
    eserPosterUrl: oneri.eserPosterUrl || '',
    ...(oneri.yonetmen ? { yonetmen: oneri.yonetmen } : {}),
  }
  await gelecekEtkinlikOlustur(topluluk.id, {
    baslik: `${eser.eserBaslik} — Film İnceleme`,
    aciklama: `Sinema Odası oylamasıyla seçildi (${oySayisi} oy) — öneren: ${oneri.onerenAdi || 'üye'}`,
    tarih,
    eser,
    topluluk,
    kullanici,
  })
  await oneriSil(oneri.id).catch(() => {})
}

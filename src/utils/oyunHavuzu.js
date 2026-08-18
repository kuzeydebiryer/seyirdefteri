import { collection, doc, getDoc, getDocs, limit as fbLimit, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
export const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'
export const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w780'
export const TMDB_PROFIL = 'https://image.tmdb.org/t/p/w300'

// Sinema Oyunları'nın soru havuzu — TMDB'nin geniş kataloğundan rastgele
// çekmek yerine, TOPLULUĞUNUZUN gerçekten puanladığı filmleri kullanıyoruz
// (eserIstatistikleri, puanSayisi'na göre en çok puanlanan). Böylece sorular
// tanıdık çıkıyor, tamamen yabancı/belirsiz bir filmle karşılaşma ihtimali
// düşük oluyor — küçük bir topluluk için doğru kalibrasyon bu.
export async function populerFilmHavuzuGetir(limitSayisi = 60) {
  const q = query(collection(db, 'eserIstatistikleri'), where('tur', '==', 'sinema'), orderBy('puanSayisi', 'desc'), fbLimit(limitSayisi))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...d.data(), disId: d.data().disId }))
}

// Bir filmin tam TMDB detayını (afiş, arka plan görselleri, kadro, slogan,
// bütçe/hasılat) getirir — oyun sorularının ham malzemesi burada.
export async function filmDetayGetir(tmdbId) {
  if (!TMDB_API_KEY) return null
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=credits,images&include_image_language=null,tr,en`
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Fisher-Yates karıştırma.
export function karistir(dizi) {
  const kopya = [...dizi]
  for (let i = kopya.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[kopya[i], kopya[j]] = [kopya[j], kopya[i]]
  }
  return kopya
}

export function rastgeleSec(dizi, n) {
  return karistir(dizi).slice(0, n)
}

// Bir dizide TEKİLLEŞTİRME için basit yardımcı — havuzdan çekilen filmlerde
// disId tekrarını önlemek için.
export function tekillestir(dizi, anahtarFn) {
  const gorulen = new Set()
  return dizi.filter((o) => {
    const k = anahtarFn(o)
    if (gorulen.has(k)) return false
    gorulen.add(k)
    return true
  })
}

// Müzik Tahmin oyunu için iTunes önizleme sonuçlarını önbellekler —
// aksi halde her oturumda aynı ~50'lik havuzu baştan taramak hem yavaş hem
// de (bulunan/bulunmayan hep aynı çıktığından) seçenekleri neredeyse hiç
// değiştirmiyordu. Önbellek "bulunamadı" sonucunu da saklar (null) ki aynı
// filmi tekrar tekrar aramayalım — zamanla havuz büyür, oturumlar hızlanır.
export async function oyunMuzikOnizlemesiGetir(tmdbId, filmAdi) {
  const ref = doc(db, 'muzikOyunuOnizlemeleri', String(tmdbId))
  const mevcut = await getDoc(ref)
  if (mevcut.exists()) return mevcut.data().onizlemeUrl

  let onizlemeUrl = null
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(filmAdi + ' soundtrack')}&media=music&entity=song&limit=5`)
    if (res.ok) {
      const veri = await res.json()
      onizlemeUrl = (veri.results || []).find((r) => r.previewUrl)?.previewUrl || null
    }
  } catch {
    // sessizce null kalır, önbelleğe "bulunamadı" olarak yazılır
  }

  await setDoc(ref, { onizlemeUrl, guncellemeTarihi: serverTimestamp() })
  return onizlemeUrl
}

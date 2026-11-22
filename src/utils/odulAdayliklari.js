import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// 🏆 Bir filmin ödül adaylıkları (Oscar, BAFTA, Golden Globe, Emmy — sitenin Ödül Yolculuğu verisi):
// oscarAdaylari (tmdbId) → kategoriler → her kategorideki RAKİP adaylar + kulübün tahmin sayıları.
// Sinema Odası'nda ortak ekrana yansıtılır ve künye panelinde gösterilir.

export const TOREN_ADLARI = { oscar: 'Oscar', bafta: 'BAFTA', 'golden-globe': 'Golden Globe', emmy: 'Emmy' }

export async function filmOdulAdayliklariGetir(tmdbId) {
  if (!tmdbId) return { toplam: 0, sezonlar: [] }
  // tmdbId bazı kayıtlarda sayı, bazılarında metin olabilir — ikisini de sor.
  const [a, b] = await Promise.all([
    getDocs(query(collection(db, 'oscarAdaylari'), where('tmdbId', '==', Number(tmdbId)))),
    getDocs(query(collection(db, 'oscarAdaylari'), where('tmdbId', '==', String(tmdbId)))),
  ])
  const filmAdaylari = [...a.docs, ...b.docs].map((d) => ({ id: d.id, ...d.data() })).filter((x) => (x.tur || 'film') === 'film')
  if (filmAdaylari.length === 0) return { toplam: 0, sezonlar: [] }

  const kategoriIdleri = [...new Set(filmAdaylari.map((x) => x.kategoriId).filter(Boolean))]
  const sezonIdleri = [...new Set(filmAdaylari.map((x) => x.sezonId).filter(Boolean))]

  const [kategoriler, sezonlar] = await Promise.all([
    Promise.all(
      kategoriIdleri.map(async (kid) => {
        const [kSnap, adaySnap, tahminSnap] = await Promise.all([
          getDoc(doc(db, 'oscarKategorileri', kid)),
          getDocs(query(collection(db, 'oscarAdaylari'), where('kategoriId', '==', kid))),
          getDocs(query(collection(db, 'oscarTahminleri'), where('kategoriId', '==', kid))).catch(() => ({ docs: [] })),
        ])
        if (!kSnap.exists()) return null
        const k = kSnap.data()
        const tahmin = new Map()
        tahminSnap.docs.forEach((t) => tahmin.set(t.data().adayId, (tahmin.get(t.data().adayId) || 0) + 1))
        const adaylar = adaySnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((x, y) => (x.sira ?? 0) - (y.sira ?? 0))
          .map((x) => ({
            id: x.id,
            filmBasligi: x.filmBasligi || '',
            filmYili: String(x.filmYili || ''),
            posterUrl: x.posterUrl || '',
            kisiAdi: x.kisiAdi || '',
            kisiFotoUrl: x.kisiFotoUrl || '',
            buFilm: String(x.tmdbId) === String(tmdbId),
            tahmin: tahmin.get(x.id) || 0,
          }))
        return { id: kid, sezonId: k.sezonId, ad: k.ad || 'Kategori', sira: k.sira ?? 0, kazananAdayId: k.kazananAdayId || '', adaylar }
      })
    ),
    Promise.all(
      sezonIdleri.map(async (sid) => {
        const s = await getDoc(doc(db, 'oscarSezonlari', sid))
        return s.exists() ? { id: sid, ...s.data() } : null
      })
    ),
  ])

  const sonuc = sezonlar
    .filter(Boolean)
    .map((s) => ({
      sezonId: s.id,
      sezonAd: s.ad || TOREN_ADLARI[s.torenTuru || 'oscar'] || 'Ödül',
      torenTuru: s.torenTuru || 'oscar',
      torenTarihi: s.torenTarihi || '',
      kategoriler: kategoriler.filter((k) => k && k.sezonId === s.id).sort((x, y) => x.sira - y.sira),
    }))
    .filter((s) => s.kategoriler.length > 0)
    // Oscar önce, sonra diğerleri
    .sort((x, y) => (x.torenTuru === 'oscar' ? -1 : 0) - (y.torenTuru === 'oscar' ? -1 : 0))

  return { toplam: sonuc.reduce((t, s) => t + s.kategoriler.length, 0), sezonlar: sonuc }
}

// Ekran belgesine yazılacak kadar sade hâli (resim adresleri + adlar).
export function odulYansitmaVerisi(filmBaslik, adayliklar) {
  return {
    filmBaslik,
    toplam: adayliklar.toplam,
    sezonlar: adayliklar.sezonlar.map((s) => ({
      sezonAd: s.sezonAd,
      torenTuru: s.torenTuru,
      kategoriler: s.kategoriler.map((k) => ({ id: k.id, ad: k.ad, kazananAdayId: k.kazananAdayId, adaylar: k.adaylar })),
    })),
  }
}

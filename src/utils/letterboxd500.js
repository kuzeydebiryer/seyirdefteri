import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'

// Letterboxd'un kendi RESMİ "listeyi CSV olarak dışa aktar" özelliğinden
// gelen bir liste — kazıma değil, meşru bir dışa aktarma. Letterboxd'un API
// erişimi "kişisel/topluluk projeleri" için kapalı olduğu için, bu tek
// seferlik içe aktarma (bkz. Letterboxd500IceAktar.jsx) sonrası artık
// Letterboxd'a hiç bağımlı değiliz — kendi Firestore koleksiyonumuzdan
// besleniyoruz. Doküman ID'si TMDB film ID'si (string) — hem hızlı tekil
// sorgu (bir filmin listede olup olmadığı) hem doğal tekillik sağlıyor.

export async function letterboxd500ListesiGetir() {
  const snap = await getDocs(query(collection(db, 'letterboxd500'), orderBy('siraNo', 'asc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Film sayfasındaki rozet için — tek bir filmin listede olup olmadığına
// (ve kaçıncı sırada olduğuna) bakıyor. Doküman ID'si zaten TMDB ID'si
// olduğu için tek bir getDoc yeterli, sorgu gerekmiyor.
export async function letterboxd500SiraNoGetir(tmdbId) {
  const snap = await getDoc(doc(db, 'letterboxd500', String(tmdbId)))
  return snap.exists() ? snap.data().siraNo : null
}

// kayitlar: [{ tmdbId, siraNo, baslik, yil, posterUrl }]
export async function letterboxd500TopluKaydet(kullanici, kayitlar) {
  for (let i = 0; i < kayitlar.length; i += 400) {
    const parca = kayitlar.slice(i, i + 400)
    const batch = writeBatch(db)
    parca.forEach((k) => {
      batch.set(doc(db, 'letterboxd500', String(k.tmdbId)), {
        siraNo: k.siraNo,
        baslik: k.baslik,
        yil: k.yil,
        posterUrl: k.posterUrl || '',
        ekleyenId: kullanici.uid,
        tarih: serverTimestamp(),
      })
    })
    await batch.commit()
  }
}

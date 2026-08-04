// Yazı Arama — Kitap/Film'deki gibi harici bir veri tabanı yok, kendi
// gönderiler koleksiyonumuzda arıyoruz. Firestore'da tam metin arama
// olmadığı için EN FAZLA 300 son yazıyı (sınırlı/bounded — Oscar'da
// yaşadığımız "tüm koleksiyonu tara" hatasını tekrarlamamak için) çekip
// istemci tarafında filtreliyoruz. Küçük bir topluluk için bu, tüm
// yazıları kapsamaya yetecek kadar geniş.

import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

const MAKS_TARANACAK = 300

export async function yaziAra({ metin, altTur } = {}) {
  const q = query(collection(db, 'gonderiler'), where('tur', '==', 'yazi'), orderBy('tarih', 'desc'), limit(MAKS_TARANACAK))
  const snap = await getDocs(q)
  let sonuclar = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

  if (altTur) sonuclar = sonuclar.filter((g) => g.altTur === altTur)

  if (metin?.trim()) {
    const arananMetin = metin.trim().toLocaleLowerCase('tr-TR')
    sonuclar = sonuclar.filter((g) =>
      [g.baslik, g.gunce, g.yazarAdi, g.ilgiliBaslik].some((alan) => alan?.toLocaleLowerCase('tr-TR').includes(arananMetin))
    )
  }

  return sonuclar
}

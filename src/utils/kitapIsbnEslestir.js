import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// "Aynı kitaptan iki farklı sayfa" sorununun çözümü: kitap ister statik
// 67 bin veri setinden (kendi ID şeması: tr_{isbn}) ister Google Books'tan
// (Google'ın kendi volume ID'si) kaydedilsin, ikisi de "isbn13"/"isbn10"
// alanını aynı isimle taşıyor. Yeni bir kayıt oluşturmadan önce, aynı
// ISBN'e sahip BAŞKA bir kayıt (farklı ID şemasından) var mı diye bakılıyor
// — varsa onu kullanıyoruz, kopya oluşturmuyoruz. utils/kitapKatalog.js ve
// utils/turkceKitapVeriTabani.js arasında dairesel bağımlılık olmasın diye
// bu KENDİ ayrı dosyasında.
export async function isbnIleMevcutKitabiBul(isbn) {
  if (!isbn) return null
  for (const alan of ['isbn13', 'isbn10']) {
    const snap = await getDocs(query(collection(db, 'kitaplar'), where(alan, '==', isbn), limit(1)))
    if (!snap.empty) {
      const d = snap.docs[0]
      return { id: d.id, ...d.data() }
    }
  }
  return null
}

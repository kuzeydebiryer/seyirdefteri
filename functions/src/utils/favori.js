import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

// Favoriler üst seviye bir koleksiyonda tutuluyor, doküman ID'si öngörülebilir
// (`${uid}_${tur}_${disId}`) — bu sayede "zaten favorimde mi" kontrolü ve
// ekleme/kaldırma tek bir doküman referansıyla yapılabiliyor, ayrı bir sorguya
// gerek kalmıyor.
function favoriDokId(uid, tur, disId) {
  return `${uid}_${tur}_${disId}`
}

export async function favoriEkle(kullanici, { tur, disId, baslik, alt, posterUrl }) {
  const id = favoriDokId(kullanici.uid, tur, disId)
  await setDoc(doc(db, 'favoriler', id), {
    kullaniciId: kullanici.uid,
    tur, // 'sinema' | 'dizi' | 'kitap' | 'kisi'
    disId,
    baslik,
    alt: alt || '', // kitap: yazar, kişi: bilinen alan (örn. "Yönetmen")
    posterUrl: posterUrl || '',
    eklemeTarihi: serverTimestamp(),
  })
}

export async function favoriKaldir(uid, tur, disId) {
  await deleteDoc(doc(db, 'favoriler', favoriDokId(uid, tur, disId)))
}

export function favoriDokIdOlustur(uid, tur, disId) {
  return favoriDokId(uid, tur, disId)
}

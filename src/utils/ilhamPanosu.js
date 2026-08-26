import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export const ILHAM_KATEGORILERI = ['Film', 'Dizi', 'Kitap', 'Oyuncu', 'Gezi', 'Etkinlik', 'Sanat']

export async function ilhamEkle(kullanici, profil, { url, kategori, not: notMetni, iliskiliTur, iliskiliDisId, iliskiliBaslik, iliskiliPosterUrl }) {
  await addDoc(collection(db, 'ilhamPanosu'), {
    url,
    kategori: kategori || 'Film',
    not: notMetni || '',
    iliskiliTur: iliskiliTur || null,
    iliskiliDisId: iliskiliDisId ?? null,
    iliskiliBaslik: iliskiliBaslik || '',
    iliskiliPosterUrl: iliskiliPosterUrl || '',
    paylasanId: kullanici.uid,
    paylasanAdi: profil?.adSoyad || kullanici.displayName || 'İsimsiz',
    eklemeTarihi: serverTimestamp(),
  })
}

// Belirli bir eser/kişi sayfasına (film/dizi/kitap/oyuncu) BAĞLANMIŞ
// paylaşımlar — genel kategori akışından farklı olarak, "bu spesifik filme
// dair" gösterim için.
export async function ilhamlariEserIcinGetir(tur, disId) {
  const q = query(collection(db, 'ilhamPanosu'), where('iliskiliTur', '==', tur), where('iliskiliDisId', '==', disId))
  const snap = await getDocs(q)
  const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  liste.sort((a, b) => (b.eklemeTarihi?.toMillis?.() || 0) - (a.eklemeTarihi?.toMillis?.() || 0))
  return liste
}

export async function ilhamlariGetir(kategori, limitSayisi) {
  const q = kategori
    ? query(collection(db, 'ilhamPanosu'), where('kategori', '==', kategori))
    : query(collection(db, 'ilhamPanosu'))
  const snap = await getDocs(q)
  const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  liste.sort((a, b) => (b.eklemeTarihi?.toMillis?.() || 0) - (a.eklemeTarihi?.toMillis?.() || 0))
  return limitSayisi ? liste.slice(0, limitSayisi) : liste
}

export async function ilhamSil(id) {
  await deleteDoc(doc(db, 'ilhamPanosu', id))
}

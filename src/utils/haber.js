import { addDoc, collection, deleteDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function haberEkle({
  kategori,
  baslik,
  icerik,
  gorselUrl,
  ilgiliTur,
  ilgiliDisId,
  ilgiliBaslik,
  ilgiliPosterUrl,
  fragmanId,
  kullanici,
}) {
  await addDoc(collection(db, 'haberler'), {
    kategori, // 'sinema' | 'dizi' | 'kisi'
    baslik,
    icerik,
    gorselUrl: gorselUrl || '',
    ilgiliTur: ilgiliTur || null,
    ilgiliDisId: ilgiliDisId || null,
    ilgiliBaslik: ilgiliBaslik || '',
    ilgiliPosterUrl: ilgiliPosterUrl || '',
    fragmanId: fragmanId || '',
    ekleyenId: kullanici.uid,
    ekleyenAdi: kullanici.displayName || 'İsimsiz',
    tarih: serverTimestamp(),
  })
}

export async function haberSil(haberId) {
  await deleteDoc(doc(db, 'haberler', haberId))
}

export async function haberGetir(haberId) {
  const snap = await getDoc(doc(db, 'haberler', haberId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

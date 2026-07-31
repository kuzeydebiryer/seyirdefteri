import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function haberEkle({ kategori, baslik, icerik, kullanici }) {
  await addDoc(collection(db, 'haberler'), {
    kategori, // 'sinema' | 'dizi' | 'kisi'
    baslik,
    icerik,
    ekleyenId: kullanici.uid,
    ekleyenAdi: kullanici.displayName || 'İsimsiz',
    tarih: serverTimestamp(),
  })
}

export async function haberSil(haberId) {
  await deleteDoc(doc(db, 'haberler', haberId))
}

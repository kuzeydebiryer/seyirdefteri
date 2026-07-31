import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function tavsiyeEkle({ tur, disId, baslik, posterUrl, not: notMetni, kullanici }) {
  await addDoc(collection(db, 'tavsiyeler'), {
    tur, // 'sinema' | 'dizi'
    disId: Number(disId),
    baslik,
    posterUrl: posterUrl || '',
    not: notMetni || '',
    ekleyenId: kullanici.uid,
    ekleyenAdi: kullanici.displayName || 'İsimsiz',
    tarih: serverTimestamp(),
  })
}

export async function tavsiyeSil(tavsiyeId) {
  await deleteDoc(doc(db, 'tavsiyeler', tavsiyeId))
}

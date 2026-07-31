import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function tavsiyeEkle({ tur, disId, baslik, alt, posterUrl, not: notMetni, kullanici }) {
  await addDoc(collection(db, 'tavsiyeler'), {
    tur, // 'sinema' | 'dizi' | 'kitap'
    disId: tur === 'kitap' ? disId : Number(disId),
    baslik,
    alt: alt || '',
    posterUrl: posterUrl || '',
    not: notMetni || '',
    ekleyenId: kullanici.uid,
    ekleyenAdi: kullanici.displayName || 'İsimsiz',
    tarih: serverTimestamp(),
  })
}

export async function tavsiyeGuncelle(tavsiyeId, { posterUrl }) {
  await updateDoc(doc(db, 'tavsiyeler', tavsiyeId), { posterUrl })
}

export async function tavsiyeSil(tavsiyeId) {
  await deleteDoc(doc(db, 'tavsiyeler', tavsiyeId))
}

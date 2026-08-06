import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function tavsiyeEkle({ tur, disId, baslik, alt, posterUrl, not: notMetni, kullanici, koleksiyon = 'tavsiyeler' }) {
  await addDoc(collection(db, koleksiyon), {
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

export async function tavsiyeGuncelle(tavsiyeId, { posterUrl }, koleksiyon = 'tavsiyeler') {
  await updateDoc(doc(db, koleksiyon, tavsiyeId), { posterUrl })
}

export async function tavsiyeSil(tavsiyeId, koleksiyon = 'tavsiyeler') {
  await deleteDoc(doc(db, koleksiyon, tavsiyeId))
}

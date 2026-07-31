import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

function izlenecekDokId(uid, tur, disId) {
  return `${uid}_${tur}_${disId}`
}

export async function izlenecekEkle(kullanici, { tur, disId, baslik, alt, posterUrl }) {
  const id = izlenecekDokId(kullanici.uid, tur, disId)
  await setDoc(doc(db, 'izlenecekler', id), {
    kullaniciId: kullanici.uid,
    tur, // 'sinema' | 'dizi' | 'kitap'
    disId,
    baslik,
    alt: alt || '',
    posterUrl: posterUrl || '',
    eklemeTarihi: serverTimestamp(),
  })
}

export async function izlenecekKaldir(uid, tur, disId) {
  await deleteDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, tur, disId)))
}

export function izlenecekDokIdOlustur(uid, tur, disId) {
  return izlenecekDokId(uid, tur, disId)
}

export async function izlenecekMi(uid, tur, disId) {
  if (!uid) return false
  const snap = await getDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, tur, disId)))
  return snap.exists()
}

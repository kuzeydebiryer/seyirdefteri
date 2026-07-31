import { addDoc, collection, deleteDoc, doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function rafOlustur(kullanici, baslik, aciklama) {
  const ref = await addDoc(collection(db, 'raflar'), {
    kullaniciId: kullanici.uid,
    baslik,
    aciklama: aciklama || '',
    olusturmaTarihi: serverTimestamp(),
    ogeSayisi: 0,
  })
  return ref.id
}

export async function rafSil(rafId) {
  await deleteDoc(doc(db, 'raflar', rafId))
}

export async function rafOgeEkle(rafId, kullanici, { tur, disId, baslik, alt, posterUrl }) {
  await addDoc(collection(db, 'rafOgeleri'), {
    rafId,
    kullaniciId: kullanici.uid,
    tur,
    disId,
    baslik,
    alt: alt || '',
    posterUrl: posterUrl || '',
    eklemeTarihi: serverTimestamp(),
  })
  await updateDoc(doc(db, 'raflar', rafId), { ogeSayisi: increment(1) })
}

export async function rafOgeGuncelle(ogeId, { posterUrl }) {
  await updateDoc(doc(db, 'rafOgeleri', ogeId), { posterUrl })
}

export async function rafOgeSil(rafId, ogeId) {
  await deleteDoc(doc(db, 'rafOgeleri', ogeId))
  await updateDoc(doc(db, 'raflar', rafId), { ogeSayisi: increment(-1) })
}

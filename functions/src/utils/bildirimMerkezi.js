import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'

// Son 30 bildirimi getirir — daha fazlası için sınır yok, sadece pratik bir
// üst sınır (bir bildirim merkezi zaten bundan fazlasını taze tutmaz).
export async function bildirimleriGetir(uid) {
  const q = query(collection(db, 'bildirimler'), where('kullaniciId', '==', uid), orderBy('olusturmaTarihi', 'desc'), limit(30))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function bildirimiOkunduIsaretle(id) {
  await updateDoc(doc(db, 'bildirimler', id), { okunduMu: true })
}

export async function tumBildirimleriOkunduIsaretle(idler) {
  if (idler.length === 0) return
  const batch = writeBatch(db)
  idler.forEach((id) => batch.update(doc(db, 'bildirimler', id), { okunduMu: true }))
  await batch.commit()
}

export async function bildirimiSil(id) {
  await deleteDoc(doc(db, 'bildirimler', id))
}

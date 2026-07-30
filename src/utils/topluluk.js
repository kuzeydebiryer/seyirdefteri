import { deleteDoc, doc, increment, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function topluluğaKatil(topluluklId, uid) {
  const batch = writeBatch(db)
  batch.set(doc(db, 'topluluklar', topluluklId, 'uyeler', uid), { katilmaTarihi: serverTimestamp() })
  batch.update(doc(db, 'topluluklar', topluluklId), { uyeSayisi: increment(1) })
  await batch.commit()
}

export async function topluluktanAyril(topluluklId, uid) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'topluluklar', topluluklId, 'uyeler', uid))
  batch.update(doc(db, 'topluluklar', topluluklId), { uyeSayisi: increment(-1) })
  await batch.commit()
}

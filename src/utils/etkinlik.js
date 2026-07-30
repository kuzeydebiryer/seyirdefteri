import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function etkinligeKatil(etkinlikId, uid) {
  await updateDoc(doc(db, 'tartismaEtkinlikleri', etkinlikId), { katilimcilar: arrayUnion(uid) })
}

export async function etkinliktenAyril(etkinlikId, uid) {
  await updateDoc(doc(db, 'tartismaEtkinlikleri', etkinlikId), { katilimcilar: arrayRemove(uid) })
}

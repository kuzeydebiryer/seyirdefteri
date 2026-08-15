import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function begeniDegistir(gonderiId, uid, suAnBegeniyorMu) {
  const ref = doc(db, 'gonderiler', gonderiId)
  await updateDoc(ref, {
    begenenler: suAnBegeniyorMu ? arrayRemove(uid) : arrayUnion(uid),
  })
}

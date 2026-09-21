import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore'
import { db } from '../firebase.js'

// "sonGorulme" alanı AuthContext.jsx'te throttle'lı olarak (15 dakikada bir)
// güncelleniyor. Tek bir aralık sorgusu (composite index gerektirmiyor).
export async function bugunAktifOlanlariGetir() {
  const gunBaslangici = new Date()
  gunBaslangici.setHours(0, 0, 0, 0)
  const q = query(collection(db, 'kullanicilar'), where('sonGorulme', '>=', Timestamp.fromDate(gunBaslangici)))
  const snap = await getDocs(q)
  const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  liste.sort((a, b) => (b.sonGorulme?.toMillis?.() || 0) - (a.sonGorulme?.toMillis?.() || 0))
  return liste
}

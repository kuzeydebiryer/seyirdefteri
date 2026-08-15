import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export function useRaflar(uid) {
  const [raflar, setRaflar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    if (!uid) {
      setYukleniyor(false)
      return
    }
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const q = query(collection(db, 'raflar'), where('kullaniciId', '==', uid))
      const snap = await getDocs(q)
      if (iptal) return
      const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      liste.sort((a, b) => (b.olusturmaTarihi?.toMillis?.() || 0) - (a.olusturmaTarihi?.toMillis?.() || 0))
      setRaflar(liste)
      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [uid, yenile])

  return { raflar, yukleniyor, yenidenYukle: () => setYenile((n) => n + 1) }
}

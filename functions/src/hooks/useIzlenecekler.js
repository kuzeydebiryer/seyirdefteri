import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export function useIzlenecekler(uid) {
  const [izlenecekler, setIzlenecekler] = useState([])
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
      const q = query(collection(db, 'izlenecekler'), where('kullaniciId', '==', uid))
      const snap = await getDocs(q)
      if (iptal) return
      const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      liste.sort((a, b) => (b.eklemeTarihi?.toMillis?.() || 0) - (a.eklemeTarihi?.toMillis?.() || 0))
      setIzlenecekler(liste)
      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [uid, yenile])

  return { izlenecekler, yukleniyor, yenidenYukle: () => setYenile((n) => n + 1) }
}

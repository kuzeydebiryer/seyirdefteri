import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export function useRafOgeleri(rafId) {
  const [ogeler, setOgeler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    if (!rafId) {
      setYukleniyor(false)
      return
    }
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const q = query(collection(db, 'rafOgeleri'), where('rafId', '==', rafId))
      const snap = await getDocs(q)
      if (iptal) return
      const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      liste.sort((a, b) => (b.eklemeTarihi?.toMillis?.() || 0) - (a.eklemeTarihi?.toMillis?.() || 0))
      setOgeler(liste)
      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [rafId, yenile])

  return { ogeler, yukleniyor, yenidenYukle: () => setYenile((n) => n + 1) }
}

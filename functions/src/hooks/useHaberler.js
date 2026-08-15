import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export function useHaberler(kategori) {
  const [haberler, setHaberler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const q = query(collection(db, 'haberler'), where('kategori', '==', kategori))
      const snap = await getDocs(q)
      if (iptal) return
      const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      liste.sort((a, b) => (b.tarih?.toMillis?.() || 0) - (a.tarih?.toMillis?.() || 0))
      setHaberler(liste)
      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [kategori, yenile])

  return { haberler, yukleniyor, yenidenYukle: () => setYenile((n) => n + 1) }
}

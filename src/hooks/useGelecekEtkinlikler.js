import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase.js'

export function useGelecekEtkinlikler(topluluklId) {
  const [etkinlikler, setEtkinlikler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const q = query(collection(db, 'topluluklar', topluluklId, 'gelecekEtkinlikler'), orderBy('tarih', 'asc'))
      const snap = await getDocs(q)
      if (iptal) return
      setEtkinlikler(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [topluluklId, yenile])

  return { etkinlikler, yukleniyor, yenidenYukle: () => setYenile((n) => n + 1) }
}

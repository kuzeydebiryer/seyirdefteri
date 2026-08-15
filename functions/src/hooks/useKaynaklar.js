import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase.js'

export function useKaynaklar(etkinlikId) {
  const [kaynaklar, setKaynaklar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const q = query(collection(db, 'gelecekEtkinlikler', etkinlikId, 'kaynaklar'), orderBy('eklemeTarihi', 'desc'))
      const snap = await getDocs(q)
      if (iptal) return
      setKaynaklar(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [etkinlikId, yenile])

  return { kaynaklar, yukleniyor, yenidenYukle: () => setYenile((n) => n + 1) }
}

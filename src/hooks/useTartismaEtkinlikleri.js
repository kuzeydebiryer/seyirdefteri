import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// gonderiId verilirse: belirli bir film/kitap güncesine bağlı etkinlikler
// verilmezse: tüm yaklaşan tartışma etkinlikleri (keşfet amaçlı)
export function useTartismaEtkinlikleri({ gonderiId } = {}) {
  const [etkinlikler, setEtkinlikler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const kisitlar = [orderBy('tarih', 'asc')]
      if (gonderiId) kisitlar.unshift(where('gonderiId', '==', gonderiId))
      const q = query(collection(db, 'tartismaEtkinlikleri'), ...kisitlar)
      const snap = await getDocs(q)
      if (iptal) return
      setEtkinlikler(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [gonderiId, yenile])

  return { etkinlikler, yukleniyor, yenidenYukle: () => setYenile((n) => n + 1) }
}

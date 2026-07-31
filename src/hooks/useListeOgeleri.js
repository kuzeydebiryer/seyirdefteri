import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export function useListeOgeleri(topluluklId, listeId) {
  const [ogeler, setOgeler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const q = query(
        collection(db, 'listeOgeleri'),
        where('topluluklId', '==', topluluklId),
        where('listeId', '==', listeId),
        orderBy('etkinlikTarihi', 'desc')
      )
      const snap = await getDocs(q)
      if (iptal) return
      setOgeler(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [topluluklId, listeId, yenile])

  return { ogeler, yukleniyor, yenidenYukle: () => setYenile((n) => n + 1) }
}

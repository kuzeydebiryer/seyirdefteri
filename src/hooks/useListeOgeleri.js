import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export function useListeOgeleri(topluluklId, listeId) {
  const [ogeler, setOgeler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      setHata('')
      try {
        const q = query(
          collection(db, 'listeOgeleri'),
          where('topluluklId', '==', topluluklId),
          where('listeId', '==', listeId),
          orderBy('etkinlikTarihi', 'desc')
        )
        const snap = await getDocs(q)
        if (iptal) return
        setOgeler(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } catch (e) {
        console.error('useListeOgeleri hata:', e.code, e.message, e)
        if (!iptal) setHata(`${e.code || ''} ${e.message}`)
      } finally {
        if (!iptal) setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [topluluklId, listeId, yenile])

  return { ogeler, yukleniyor, hata, yenidenYukle: () => setYenile((n) => n + 1) }
}

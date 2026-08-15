import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export function useEtkinlikOnerileri(topluluklId) {
  const [oneriler, setOneriler] = useState([])
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
          collection(db, 'etkinlikOnerileri'),
          where('topluluklId', '==', topluluklId),
          orderBy('oneriTarihi', 'desc')
        )
        const snap = await getDocs(q)
        if (iptal) return
        const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        // En çok beğenilen en üstte — eşitlikte en yeni öneri önce.
        liste.sort((a, b) => (b.begenenler || []).length - (a.begenenler || []).length)
        setOneriler(liste)
      } catch (e) {
        console.error('useEtkinlikOnerileri hata:', e.code, e.message, e)
        if (!iptal) setHata(`${e.code || ''} ${e.message}`)
      } finally {
        if (!iptal) setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [topluluklId, yenile])

  return { oneriler, yukleniyor, hata, yenidenYukle: () => setYenile((n) => n + 1) }
}

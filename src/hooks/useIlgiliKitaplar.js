import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase.js'

export function useIlgiliKitaplar(yonetmenTmdbId) {
  const [kitaplar, setKitaplar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    if (!yonetmenTmdbId) {
      setYukleniyor(false)
      return
    }
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const q = query(collection(db, 'yonetmenler', String(yonetmenTmdbId), 'ilgiliKitaplar'), orderBy('eklemeTarihi', 'desc'))
      const snap = await getDocs(q)
      if (iptal) return
      setKitaplar(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [yonetmenTmdbId, yenile])

  return { kitaplar, yukleniyor, yenidenYukle: () => setYenile((n) => n + 1) }
}

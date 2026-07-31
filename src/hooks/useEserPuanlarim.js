import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// Kullanıcının günce yazmadan doğrudan eser sayfasından verdiği tüm puanları getirir.
export function useEserPuanlarim(uid) {
  const [puanlar, setPuanlar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    if (!uid) {
      setYukleniyor(false)
      return
    }
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const q = query(collection(db, 'eserPuanlari'), where('kullaniciId', '==', uid))
      const snap = await getDocs(q)
      if (iptal) return
      setPuanlar(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [uid])

  return { puanlar, yukleniyor }
}

import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// Kullanıcının başka güncelere bıraktığı tüm yorumları getirir.
export function useYorumlarim(uid) {
  const [yorumlar, setYorumlar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    if (!uid) {
      setYukleniyor(false)
      return
    }
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const q = query(collection(db, 'yorumlar'), where('yazarId', '==', uid))
      const snap = await getDocs(q)
      if (iptal) return
      const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      liste.sort((a, b) => (b.tarih?.toMillis?.() || 0) - (a.tarih?.toMillis?.() || 0))
      setYorumlar(liste)
      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [uid])

  return { yorumlar, yukleniyor }
}

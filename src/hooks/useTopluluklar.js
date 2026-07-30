import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase.js'

export function useTopluluklar() {
  const [topluluklar, setTopluluklar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const q = query(collection(db, 'topluluklar'), orderBy('kurulmaTarihi', 'desc'))
      const snap = await getDocs(q)
      if (iptal) return
      setTopluluklar(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [yenile])

  return { topluluklar, yukleniyor, yenidenYukle: () => setYenile((n) => n + 1) }
}

export async function uyeMi(topluluklId, uid) {
  if (!uid) return false
  const snap = await getDoc(doc(db, 'topluluklar', topluluklId, 'uyeler', uid))
  return snap.exists()
}

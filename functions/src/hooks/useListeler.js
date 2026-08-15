import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase.js'

export function useListeler(topluluklId) {
  const [listeler, setListeler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const q = query(collection(db, 'topluluklar', topluluklId, 'listeler'), orderBy('olusturmaTarihi', 'desc'))
      const snap = await getDocs(q)
      if (iptal) return
      setListeler(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [topluluklId, yenile])

  return { listeler, yukleniyor, yenidenYukle: () => setYenile((n) => n + 1) }
}

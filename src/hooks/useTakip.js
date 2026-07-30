import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase.js'

// Bir hedef kullanıcı için takip durumu + takipçi/takip edilen sayıları
export function useTakip(hedefUid, benUid) {
  const [takipEdiyorMu, setTakipEdiyorMu] = useState(false)
  const [takipciSayisi, setTakipciSayisi] = useState(0)
  const [takipEdilenSayisi, setTakipEdilenSayisi] = useState(0)
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    let iptal = false
    async function getir() {
      if (!hedefUid) return
      setYukleniyor(true)
      const [takipciSnap, takipEdilenSnap] = await Promise.all([
        getDocs(collection(db, 'kullanicilar', hedefUid, 'takipciler')),
        getDocs(collection(db, 'kullanicilar', hedefUid, 'takipEdilenler')),
      ])
      if (iptal) return
      setTakipciSayisi(takipciSnap.size)
      setTakipEdilenSayisi(takipEdilenSnap.size)

      if (benUid) {
        const benSnap = await getDoc(doc(db, 'kullanicilar', hedefUid, 'takipciler', benUid))
        if (!iptal) setTakipEdiyorMu(benSnap.exists())
      }
      if (!iptal) setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [hedefUid, benUid])

  return { takipEdiyorMu, setTakipEdiyorMu, takipciSayisi, takipEdilenSayisi, yukleniyor }
}

// Bir kullanıcının takip ettiği kişilerin uid listesi (kişiselleştirilmiş akış için)
export async function takipEdilenUidleriGetir(uid) {
  const snap = await getDocs(collection(db, 'kullanicilar', uid, 'takipEdilenler'))
  return snap.docs.map((d) => d.id)
}

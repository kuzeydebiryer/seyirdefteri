import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import { favoriDokIdOlustur } from '../utils/favori.js'

// Bir kullanıcının tüm favorilerini getirir (tur filtresi opsiyonel).
// Tek eşitlik filtresi kullanıldığı için özel bir indeks gerekmiyor;
// sıralama (en yeni eklenen üstte) istemci tarafında yapılıyor.
export function useFavoriler(uid, tur) {
  const [favoriler, setFavoriler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    if (!uid) {
      setYukleniyor(false)
      return
    }
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const kisitlar = [where('kullaniciId', '==', uid)]
      if (tur) kisitlar.push(where('tur', '==', tur))
      const q = query(collection(db, 'favoriler'), ...kisitlar)
      const snap = await getDocs(q)
      if (iptal) return
      const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      liste.sort((a, b) => (b.eklemeTarihi?.toMillis?.() || 0) - (a.eklemeTarihi?.toMillis?.() || 0))
      setFavoriler(liste)
      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [uid, tur, yenile])

  return { favoriler, yukleniyor, yenidenYukle: () => setYenile((n) => n + 1) }
}

// Belirli bir eserin/kişinin favorilerde olup olmadığını kontrol eder.
export async function favoriMi(uid, tur, disId) {
  if (!uid) return false
  const snap = await getDoc(doc(db, 'favoriler', favoriDokIdOlustur(uid, tur, disId)))
  return snap.exists()
}

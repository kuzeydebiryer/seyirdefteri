import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase.js'

// Tüm topluluklardaki gelecek etkinlikleri getirir (küresel Etkinlikler sayfasında
// Film/Kitap Kulübü altında göstermek için). Artık üst seviye bir koleksiyon
// olduğu için basit bir sorgu — özel bir indeks gerekmiyor.
export function useTumGelecekEtkinlikler() {
  const [etkinlikler, setEtkinlikler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')

  useEffect(() => {
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      try {
        const q = query(collection(db, 'gelecekEtkinlikler'), orderBy('tarih', 'asc'))
        const snap = await getDocs(q)
        if (iptal) return
        setEtkinlikler(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } catch (e) {
        console.error('useTumGelecekEtkinlikler hata:', e.code, e.message, e)
        if (!iptal) setHata(`${e.code || ''} ${e.message}`)
      } finally {
        if (!iptal) setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [])

  return { etkinlikler, yukleniyor, hata }
}

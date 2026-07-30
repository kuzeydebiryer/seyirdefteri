import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// tur: 'sinema' | 'kitap' | undefined (hepsi)
// yazarId: tek bir kullanıcının gönderileri (profil sayfası)
// yazarIdListesi: birden fazla kullanıcının gönderileri (kişiselleştirilmiş akış).
//   Firestore'un "in" operatörü en fazla 30 değer kabul eder; 30'dan büyük
//   takip listelerinde sorguyu 30'luk gruplara bölüp sonuçları birleştiriyoruz.
export function useGonderiler({ tur, yazarId, yazarIdListesi } = {}) {
  const [gonderiler, setGonderiler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')

  const yazarIdListesiAnahtar = yazarIdListesi ? yazarIdListesi.join(',') : ''

  useEffect(() => {
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      try {
        if (yazarIdListesi) {
          if (yazarIdListesi.length === 0) {
            if (!iptal) {
              setGonderiler([])
              setYukleniyor(false)
            }
            return
          }
          const gruplar = []
          for (let i = 0; i < yazarIdListesi.length; i += 30) {
            gruplar.push(yazarIdListesi.slice(i, i + 30))
          }
          const sonuclar = await Promise.all(
            gruplar.map((grup) => {
              const kisitlar = [where('yazarId', 'in', grup)]
              if (tur) kisitlar.push(where('tur', '==', tur))
              return getDocs(query(collection(db, 'gonderiler'), ...kisitlar))
            })
          )
          if (iptal) return
          const hepsi = sonuclar.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })))
          hepsi.sort((a, b) => (b.tarih?.toMillis?.() || 0) - (a.tarih?.toMillis?.() || 0))
          setGonderiler(hepsi)
        } else {
          const kisitlar = [orderBy('tarih', 'desc')]
          if (tur) kisitlar.unshift(where('tur', '==', tur))
          if (yazarId) kisitlar.unshift(where('yazarId', '==', yazarId))
          const q = query(collection(db, 'gonderiler'), ...kisitlar)
          const snap = await getDocs(q)
          if (iptal) return
          setGonderiler(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        }
      } catch (e) {
        if (!iptal) setHata(e.message)
      } finally {
        if (!iptal) setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [tur, yazarId, yazarIdListesiAnahtar])

  return { gonderiler, yukleniyor, hata }
}

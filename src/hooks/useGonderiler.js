import { useEffect, useState } from 'react'
import { collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore'
import { db } from '../firebase.js'

const SAYFA_BOYUTU = 20

// tur: 'sinema' | 'kitap' | undefined (hepsi)
// yazarId: tek bir kullanıcının gönderileri (profil sayfası)
// yazarIdListesi: birden fazla kullanıcının gönderileri (kişiselleştirilmiş akış).
//   Firestore'un "in" operatörü en fazla 30 değer kabul eder; 30'dan büyük
//   takip listelerinde sorguyu 30'luk gruplara bölüp sonuçları birleştiriyoruz.
//
// SAYFALAMA: eskiden bu hook sınır olmadan (limit'siz) sorgu atıyordu — küçük
// bir toplulukta sorun çıkarmasa da, her günce eklendikçe her sayfa açılışında
// TÜM koleksiyonun (ya da "Herkes" sekmesinde tüm günceler) yeniden okunması
// anlamına geliyordu. Artık varsayılan olarak 20 günce çekiliyor, "Daha Fazla
// Göster" ile devamı isteniyor.
export function useGonderiler({ tur, altTur, yazarId, yazarIdListesi, sayfaBoyutu = SAYFA_BOYUTU } = {}) {
  const [gonderiler, setGonderiler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')
  const [sonBelge, setSonBelge] = useState(null)
  const [dahaFazlaVarMi, setDahaFazlaVarMi] = useState(false)
  const [grupSayfaBoyutu, setGrupSayfaBoyutu] = useState(sayfaBoyutu)

  const yazarIdListesiAnahtar = yazarIdListesi ? yazarIdListesi.join(',') : ''

  async function ilkSayfayiYukle() {
    setYukleniyor(true)
    setHata('')
    try {
      if (yazarIdListesi) {
        if (yazarIdListesi.length === 0) {
          setGonderiler([])
          setDahaFazlaVarMi(false)
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
            if (altTur) kisitlar.push(where('altTur', '==', altTur))
            kisitlar.push(orderBy('tarih', 'desc'), limit(grupSayfaBoyutu))
            return getDocs(query(collection(db, 'gonderiler'), ...kisitlar))
          })
        )
        const hepsi = sonuclar.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        hepsi.sort((a, b) => (b.tarih?.toMillis?.() || 0) - (a.tarih?.toMillis?.() || 0))
        setGonderiler(hepsi)
        // Gruplardan biri tam sayfa döndürdüyse muhtemelen daha fazlası var
        setDahaFazlaVarMi(sonuclar.some((snap) => snap.size === grupSayfaBoyutu))
      } else {
        const kisitlar = [orderBy('tarih', 'desc')]
        if (tur) kisitlar.unshift(where('tur', '==', tur))
        if (altTur) kisitlar.unshift(where('altTur', '==', altTur))
        if (yazarId) kisitlar.unshift(where('yazarId', '==', yazarId))
        kisitlar.push(limit(sayfaBoyutu))
        const q = query(collection(db, 'gonderiler'), ...kisitlar)
        const snap = await getDocs(q)
        setGonderiler(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setSonBelge(snap.docs[snap.docs.length - 1] || null)
        setDahaFazlaVarMi(snap.size === sayfaBoyutu)
      }
    } catch (e) {
      setHata(e.message)
    } finally {
      setYukleniyor(false)
    }
  }

  useEffect(() => {
    setGrupSayfaBoyutu(sayfaBoyutu)
    ilkSayfayiYukle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tur, altTur, yazarId, yazarIdListesiAnahtar])

  async function dahaFazlaYukle() {
    if (yazarIdListesi) {
      // Gruplar arası birleştirilmiş sonuçlarda gerçek "cursor" (startAfter)
      // tutmak karmaşık olduğu için, burada sayfa boyutunu büyütüp gruplar
      // yeniden sorgulanıyor — daha basit, hâlâ sınırlı (limit'li) bir yaklaşım.
      setGrupSayfaBoyutu((s) => s + sayfaBoyutu)
      return
    }
    if (!sonBelge) return
    setYukleniyor(true)
    try {
      const kisitlar = [orderBy('tarih', 'desc')]
      if (tur) kisitlar.unshift(where('tur', '==', tur))
      if (altTur) kisitlar.unshift(where('altTur', '==', altTur))
      if (yazarId) kisitlar.unshift(where('yazarId', '==', yazarId))
      kisitlar.push(startAfter(sonBelge), limit(sayfaBoyutu))
      const q = query(collection(db, 'gonderiler'), ...kisitlar)
      const snap = await getDocs(q)
      setGonderiler((onceki) => [...onceki, ...snap.docs.map((d) => ({ id: d.id, ...d.data() }))])
      setSonBelge(snap.docs[snap.docs.length - 1] || null)
      setDahaFazlaVarMi(snap.size === sayfaBoyutu)
    } finally {
      setYukleniyor(false)
    }
  }

  // yazarIdListesi modunda grupSayfaBoyutu değişince yeniden yükle
  useEffect(() => {
    if (yazarIdListesi && grupSayfaBoyutu !== sayfaBoyutu) {
      ilkSayfayiYukle()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupSayfaBoyutu])

  return { gonderiler, yukleniyor, hata, dahaFazlaVarMi, dahaFazlaYukle }
}

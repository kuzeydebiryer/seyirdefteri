import { useEffect, useState } from 'react'
import { collection, collectionGroup, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'

// Bir esere (tmdbId veya googleBooksId ile tanımlanan film/dizi/kitap) ait
// TÜM topluluk üyelerinin paylaştığı güncelerini VE topluluk listelerinde
// verilen puanları birlikte getirir — eser sayfasında "topluluk ortalaması",
// "senin puanın" ve "kimler ne demiş" listesini oluşturmak için kullanılır.
export function useEserGonderileri(tur, disId) {
  const { kullanici } = useAuth()
  const [gonderiler, setGonderiler] = useState([])
  const [listePuanlari, setListePuanlari] = useState([]) // [{uid, puan}]
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    if (!disId) {
      setYukleniyor(false)
      return
    }
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const alan = tur === 'kitap' ? 'googleBooksId' : 'tmdbId'
      const deger = tur === 'kitap' ? disId : Number(disId)

      const gonderilerQ = query(collection(db, 'gonderiler'), where('tur', '==', tur), where(alan, '==', deger))
      const gonderilerSnap = await getDocs(gonderilerQ)
      if (iptal) return
      setGonderiler(gonderilerSnap.docs.map((d) => ({ id: d.id, ...d.data() })))

      // Topluluk listelerindeki (Geçmiş Etkinlikler) puanları da dahil et.
      // collectionGroup sorgusu ilk çalıştırıldığında Firestore konsolundan
      // bir indeks oluşturman istenebilir — tarayıcı konsolundaki linke tıklaman yeterli.
      try {
        const ogelerQ = query(collectionGroup(db, 'ogeler'), where('tur', '==', tur), where(alan, '==', deger))
        const ogelerSnap = await getDocs(ogelerQ)
        if (iptal) return
        const hepsi = []
        ogelerSnap.docs.forEach((d) => {
          const puanlar = d.data().puanlar || {}
          Object.entries(puanlar).forEach(([uid, puan]) => hepsi.push({ uid, puan }))
        })
        setListePuanlari(hepsi)
      } catch (e) {
        console.error('useEserGonderileri (topluluk liste puanları) hata:', e.code, e.message, e)
      }

      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [tur, disId])

  // Aynı kişi hem kişisel günce hem liste üzerinden puan vermiş olabilir —
  // kullanıcı başına TEK puan sayılsın diye bir map üzerinden birleştiriyoruz.
  const puanMap = new Map()
  gonderiler.forEach((g) => {
    if (g.kullaniciPuani != null) puanMap.set(g.yazarId, g.kullaniciPuani)
  })
  listePuanlari.forEach(({ uid, puan }) => {
    if (puan != null) puanMap.set(uid, puan)
  })

  const puanlar = Array.from(puanMap.values())
  const ortalamaPuan = puanlar.length ? puanlar.reduce((a, b) => a + b, 0) / puanlar.length : null
  const kullanicininPuani = kullanici ? puanMap.get(kullanici.uid) ?? null : null

  return { gonderiler, yukleniyor, ortalamaPuan, puanSayisi: puanlar.length, kullanicininPuani }
}

// Bir kategori için topluluğun en çok işlediği / en yüksek puanlı eserlerini
// (tmdbId veya googleBooksId'ye göre gruplanmış) hesaplar — kategori hub sayfasında kullanılır.
export async function topluluktaPopulerEserler(tur, enFazla = 12) {
  const alan = tur === 'kitap' ? 'googleBooksId' : 'tmdbId'
  const q = query(collection(db, 'gonderiler'), where('tur', '==', tur))
  const snap = await getDocs(q)
  const gruplar = new Map()
  snap.docs.forEach((d) => {
    const veri = d.data()
    const id = veri[alan]
    if (!id) return
    if (!gruplar.has(id)) {
      gruplar.set(id, {
        id,
        baslik: veri.baslik,
        yil: veri.yil,
        posterUrl: veri.posterUrl,
        yazar: veri.yazar,
        puanlar: [],
      })
    }
    if (veri.kullaniciPuani != null) gruplar.get(id).puanlar.push(veri.kullaniciPuani)
  })
  const liste = Array.from(gruplar.values()).map((e) => ({
    ...e,
    ortalamaPuan: e.puanlar.length ? e.puanlar.reduce((a, b) => a + b, 0) / e.puanlar.length : null,
    puanSayisi: e.puanlar.length,
  }))
  liste.sort((a, b) => b.puanSayisi - a.puanSayisi || (b.ortalamaPuan || 0) - (a.ortalamaPuan || 0))
  return liste.slice(0, enFazla)
}

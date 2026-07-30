import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// Bir esere (tmdbId veya googleBooksId ile tanımlanan film/dizi/kitap) ait
// TÜM topluluk üyelerinin paylaştığı güncelerini getirir — eser sayfasında
// "topluluk ortalaması" ve "kimler ne demiş" listesini oluşturmak için kullanılır.
export function useEserGonderileri(tur, disId) {
  const [gonderiler, setGonderiler] = useState([])
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
      const q = query(collection(db, 'gonderiler'), where('tur', '==', tur), where(alan, '==', deger))
      const snap = await getDocs(q)
      if (iptal) return
      setGonderiler(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [tur, disId])

  const puanlar = gonderiler.map((g) => g.kullaniciPuani).filter((p) => p != null)
  const ortalamaPuan = puanlar.length ? puanlar.reduce((a, b) => a + b, 0) / puanlar.length : null

  return { gonderiler, yukleniyor, ortalamaPuan, puanSayisi: puanlar.length }
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

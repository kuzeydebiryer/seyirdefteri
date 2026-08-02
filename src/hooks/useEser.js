import { useEffect, useState } from 'react'
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
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
  const [dogrudanPuanlar, setDogrudanPuanlar] = useState([]) // [{uid, puan}] - eserPuanlari koleksiyonundan
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yenile, setYenile] = useState(0)

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
      // "listeOgeleri" üst seviye bir koleksiyon olduğu için bu basit bir
      // where() sorgusu, özel bir indeks gerektirmiyor.
      try {
        const ogelerQ = query(collection(db, 'listeOgeleri'), where('tur', '==', tur), where(alan, '==', deger))
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

      // Günce yazmadan doğrudan eser sayfasından verilen puanlar
      try {
        const dpQ = query(collection(db, 'eserPuanlari'), where('tur', '==', tur), where('disId', '==', deger))
        const dpSnap = await getDocs(dpQ)
        if (iptal) return
        setDogrudanPuanlar(dpSnap.docs.map((d) => ({ uid: d.data().kullaniciId, puan: d.data().puan })))
      } catch (e) {
        console.error('useEserGonderileri (doğrudan eser puanları) hata:', e.code, e.message, e)
      }

      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [tur, disId, yenile])

  // Aynı kişi hem kişisel günce hem liste hem doğrudan puanlama üzerinden puan
  // vermiş olabilir — kullanıcı başına TEK puan sayılsın diye bir map üzerinden
  // birleştiriyoruz (öncelik: günce > liste > doğrudan puan, ama pratikte nadiren çakışır).
  const puanMap = new Map()
  dogrudanPuanlar.forEach(({ uid, puan }) => {
    if (puan != null) puanMap.set(uid, puan)
  })
  listePuanlari.forEach(({ uid, puan }) => {
    if (puan != null) puanMap.set(uid, puan)
  })
  gonderiler.forEach((g) => {
    if (g.kullaniciPuani != null) puanMap.set(g.yazarId, g.kullaniciPuani)
  })

  const puanlar = Array.from(puanMap.values())
  const ortalamaPuan = puanlar.length ? puanlar.reduce((a, b) => a + b, 0) / puanlar.length : null
  const kullanicininPuani = kullanici ? puanMap.get(kullanici.uid) ?? null : null

  return {
    gonderiler,
    yukleniyor,
    ortalamaPuan,
    puanSayisi: puanlar.length,
    kullanicininPuani,
    yenidenYukle: () => setYenile((n) => n + 1),
  }
}

// Bir kategori için topluluğun en çok puanladığı eserleri getirir — kategori
// hub sayfasında ("Bizim Aramızda Popüler") kullanılır.
//
// Eskiden bu, TÜM `gonderiler` koleksiyonunu tarayıp tarayıcıda gruplardı —
// koleksiyon büyüdükçe her sayfa açılışında binlerce kaydı okumak anlamına
// geliyordu. Artık `eserIstatistikleri` özet koleksiyonunu okuyor — bu kayıt,
// bir esere her puan verildiğinde (bkz. eserIstatistik.js) güncelleniyor,
// dolayısıyla burada sadece küçük, önceden hesaplanmış bir liste sorgulanıyor.
export async function topluluktaPopulerEserler(tur, enFazla = 12) {
  const q = query(collection(db, 'eserIstatistikleri'), where('tur', '==', tur), orderBy('puanSayisi', 'desc'), limit(enFazla))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const veri = d.data()
    return {
      id: veri.disId,
      baslik: veri.baslik,
      yil: veri.yil,
      posterUrl: veri.posterUrl,
      yazar: veri.alt,
      puanSayisi: veri.puanSayisi || 0,
      ortalamaPuan: veri.puanSayisi ? veri.puanToplam / veri.puanSayisi : null,
    }
  })
}

// Bir kitap hakkında yazılmış "Kitap İncelemesi" türündeki Yazı'ları getirir.
// Bunlar normal "kitap" güncelerinden AYRI bir koleksiyon sorgusu: incelemeler
// tur:'yazi', altTur:'kitap-incelemesi' olarak kaydediliyor ve hangi kitaba ait
// olduğunu `ilgiliDisId` alanı belirliyor (bkz. GonderiEkle.jsx).
export function useKitapIncelemeleri(disId) {
  const [incelemeler, setIncelemeler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    if (!disId) {
      setYukleniyor(false)
      return
    }
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const q = query(
        collection(db, 'gonderiler'),
        where('tur', '==', 'yazi'),
        where('altTur', '==', 'kitap-incelemesi'),
        where('ilgiliDisId', '==', disId)
      )
      const snap = await getDocs(q)
      if (iptal) return
      setIncelemeler(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [disId])

  return { incelemeler, yukleniyor }
}

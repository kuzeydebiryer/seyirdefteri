import { useEffect, useState } from 'react'
import { haberSayfasiGetir } from '../utils/haber.js'

// Önceden bir kategorinin TÜM haberlerini (koleksiyonun tamamını) tek
// seferde çekip sadece görünümde (HaberBolumu'nun "Daha Fazla Göster"
// butonuyla) kısım kısım gösteriyordu — haber sayısı arttıkça her sayfa
// ziyaretinin Firestore okuma maliyeti de büyüyecekti. Artık /haberler hub
// sayfasındaki gibi gerçek sayfalama kullanıyor (haberSayfasiGetir, 20'şer
// 20'şer) — "Daha Fazla Yükle" gerçekten yeni bir sorgu yapıyor.
export function useHaberler(kategori) {
  const [haberler, setHaberler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [sonBelge, setSonBelge] = useState(null)
  const [hepsiYuklendiMi, setHepsiYuklendiMi] = useState(false)
  const [dahaFazlaYukleniyor, setDahaFazlaYukleniyor] = useState(false)
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    let iptal = false
    setYukleniyor(true)
    haberSayfasiGetir(kategori).then((sonuc) => {
      if (iptal) return
      setHaberler(sonuc.liste)
      setSonBelge(sonuc.sonBelge)
      setHepsiYuklendiMi(sonuc.hepsiYuklendiMi)
      setYukleniyor(false)
    })
    return () => {
      iptal = true
    }
  }, [kategori, yenile])

  async function dahaFazlaYukle() {
    if (hepsiYuklendiMi) return
    setDahaFazlaYukleniyor(true)
    try {
      const sonuc = await haberSayfasiGetir(kategori, sonBelge)
      setHaberler((onceki) => [...onceki, ...sonuc.liste])
      setSonBelge(sonuc.sonBelge)
      setHepsiYuklendiMi(sonuc.hepsiYuklendiMi)
    } finally {
      setDahaFazlaYukleniyor(false)
    }
  }

  return { haberler, yukleniyor, hepsiYuklendiMi, dahaFazlaYukleniyor, dahaFazlaYukle, yenidenYukle: () => setYenile((n) => n + 1) }
}

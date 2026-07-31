import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { kisiDegerlendirmeleriGetir } from '../utils/kisiDegerlendirme.js'

export function useKisiDegerlendirmeleri(kisiTmdbId) {
  const { kullanici } = useAuth()
  const [degerlendirmeler, setDegerlendirmeler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    if (!kisiTmdbId) {
      setYukleniyor(false)
      return
    }
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const liste = await kisiDegerlendirmeleriGetir(kisiTmdbId)
      if (iptal) return
      setDegerlendirmeler(liste)
      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [kisiTmdbId, yenile])

  const puanlar = degerlendirmeler.map((d) => d.puan).filter((p) => p != null)
  const ortalamaPuan = puanlar.length ? puanlar.reduce((a, b) => a + b, 0) / puanlar.length : null
  const kullanicininDegerlendirmesi = kullanici ? degerlendirmeler.find((d) => d.kullaniciId === kullanici.uid) || null : null

  return {
    degerlendirmeler,
    yukleniyor,
    ortalamaPuan,
    puanSayisi: puanlar.length,
    kullanicininDegerlendirmesi,
    yenidenYukle: () => setYenile((n) => n + 1),
  }
}

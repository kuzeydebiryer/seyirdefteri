import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import YakindaGelecekler from '../components/YakindaGelecekler.jsx'
import YakindaGelecekFormu from '../components/YakindaGelecekFormu.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY

const TANIDIK_PLATFORMLAR = [
  'Netflix',
  'Amazon Prime Video',
  'Disney Plus',
  'Max',
  'HBO Max',
  'BluTV',
  'Gain',
  'MUBI',
  'TOD',
  'Apple TV',
  'Apple TV+',
]

// Platformlar sayfasındaki "Yakında Geliyor"un "Tümünü Gör" linkinin gittiği
// bağımsız sayfa — aynı bileşenler (liste + ekleme formu), sadece kendi
// başına, diğer bölümler (Dijitalde Yeni Çıkanlar, platform ızgarası) olmadan.
export default function YakindaGeliyorSayfasi() {
  const [platformlar, setPlatformlar] = useState(null)
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    if (!TMDB_API_KEY) return
    Promise.all([
      fetch(`https://api.themoviedb.org/3/watch/providers/movie?api_key=${TMDB_API_KEY}&watch_region=TR`).then((r) => r.json()),
      fetch(`https://api.themoviedb.org/3/watch/providers/tv?api_key=${TMDB_API_KEY}&watch_region=TR`).then((r) => r.json()),
    ]).then(([filmVeri, diziVeri]) => {
      const hepsi = [...(filmVeri.results || []), ...(diziVeri.results || [])]
      const benzersiz = new Map()
      hepsi.forEach((p) => {
        if (TANIDIK_PLATFORMLAR.some((ad) => p.provider_name.toLowerCase().includes(ad.toLowerCase()))) {
          if (!benzersiz.has(p.provider_id)) benzersiz.set(p.provider_id, p)
        }
      })
      setPlatformlar([...benzersiz.values()])
    })
  }, [])

  return (
    <div>
      <Link to="/platformlar" className="text-xs text-kraft hover:text-deniz">
        ← Platformlar
      </Link>
      <h1 className="mt-1 mb-6 font-baslik text-2xl text-murekkep">📅 Yakında Geliyor</h1>

      <YakindaGelecekler yenilemeTetik={yenile} izgara baslikGoster={false} />
      {platformlar && <YakindaGelecekFormu platformlar={platformlar} onEklendi={() => setYenile((n) => n + 1)} />}
    </div>
  )
}

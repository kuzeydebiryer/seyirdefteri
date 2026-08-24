import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_LOGO = 'https://image.tmdb.org/t/p/w200'

// TMDB, Türkiye'de aktif OLAN her sağlayıcıyı döndürüyor — bunların çoğu
// (küçük yerel VOD servisleri, TV kanalı uygulamaları vb.) kullanıcıların
// aradığı "büyük" platformlar değil. Listeyi bilinen, tanıdık platformlarla
// sınırlıyoruz — 40-50 satırlık bir kalabalık yerine, gerçekten arananlar.
const TANIDIK_PLATFORMLAR = [
  'Netflix',
  'Amazon Prime Video',
  'Disney Plus',
  'Max',
  'HBO Max',
  'BluTV',
  'Exxen',
  'Gain',
  'MUBI',
  'TOD',
  'Apple TV',
  'Apple TV+',
  'Google Play Movies',
  'YouTube',
]

export default function Platformlar() {
  const [platformlar, setPlatformlar] = useState(null)

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
      const liste = [...benzersiz.values()].sort(
        (a, b) => (a.display_priorities?.TR ?? 999) - (b.display_priorities?.TR ?? 999)
      )
      setPlatformlar(liste)
    })
  }, [])

  return (
    <div>
      <h1 className="mb-1 font-baslik text-2xl text-murekkep">📡 Platformlar</h1>
      <p className="mb-6 text-sm text-kraft">Bir platform seç, o an abonelikle izlenebilen film ve dizileri keşfet.</p>

      {platformlar === null && <p className="text-sm text-kraft">Yükleniyor...</p>}

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
        {platformlar?.map((p) => (
          <Link
            key={p.provider_id}
            to={`/platform/${p.provider_id}?ad=${encodeURIComponent(p.provider_name)}`}
            className="flex flex-col items-center gap-2 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi transition hover:ring-deniz/50"
          >
            {p.logo_path ? (
              <img src={`${TMDB_LOGO}${p.logo_path}`} alt={p.provider_name} className="h-14 w-14 rounded-sm object-cover" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-sm bg-kagit text-2xl">📡</span>
            )}
            <p className="text-center text-xs text-murekkep">{p.provider_name}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sonBegenilenMuzikleriGetir } from '../utils/filmMuzigiBegeni.js'

// Anasayfada "Beğenilen Film Müzikleri" şeridi — Film Tavsiyeleri'yle aynı
// sade (Letterboxd tarzı) başlık kalıbını kullanıyor.
export default function BegenilenMuziklerBolumu() {
  const [muzikler, setMuzikler] = useState([])

  useEffect(() => {
    sonBegenilenMuzikleriGetir(15).then(setMuzikler)
  }, [])

  if (muzikler.length === 0) return null

  return (
    <div className="mb-10">
      <h2 className="mb-3 font-baslik text-lg text-murekkep">🎵 Beğenilen Film Müzikleri</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {muzikler.map((m) => (
          <Link key={m.id} to={`/film/${m.tmdbId}`} className="shrink-0" style={{ width: 104 }}>
            <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
              {m.posterUrl ? (
                <img src={m.posterUrl} alt={m.filmBaslik} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">🎵</div>
              )}
            </div>
            <p className="mt-1 truncate text-[11px] text-murekkep">{m.filmBaslik}</p>
            <p className="truncate text-[10px] text-kraft">{m.kullaniciAdi} beğendi</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

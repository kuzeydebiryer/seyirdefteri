import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import OscarHeykelIkon from './ikonlar/OscarHeykelIkon.jsx'
import { aktifSezonuGetir } from '../utils/oscar.js'

const ODUL_TORENLERI = [
  { yol: '/odul-toreni/oscar', torenTuru: 'oscar', ad: 'Oscar' },
  { yol: '/odul-toreni/bafta', torenTuru: 'bafta', ad: 'BAFTA' },
  { yol: '/odul-toreni/golden-globe', torenTuru: 'golden-globe', ad: 'Golden Globe' },
  { yol: '/odul-toreni/emmy', torenTuru: 'emmy', ad: 'Emmy' },
  { yol: '/odul-toreni/sag', torenTuru: 'sag', ad: 'SAG Ödülleri' },
  { yol: '/odul-toreni/critics-choice', torenTuru: 'critics-choice', ad: "Critics' Choice" },
]

function gunSayisi(torenTarihi) {
  if (!torenTarihi) return null
  const fark = new Date(torenTarihi) - new Date()
  return Math.ceil(fark / (1000 * 60 * 60 * 24))
}

// Anasayfada Film/Kitap Tavsiyeleri ile aynı sırada — en yakın 3 ödül
// törenini gösteren kompakt bir vitrin. Henüz hiçbir sezonu olmayan veya
// tarihi geçmiş törenler burada gösterilmiyor (Ödüller ana sayfasının
// aksine — orası hepsini gösteriyor, burası sadece "yaklaşan" olanı).
export default function OdullerVitrini() {
  const [oduller, setOduller] = useState(null)

  useEffect(() => {
    Promise.all(
      ODUL_TORENLERI.map(async (o) => {
        const sezon = await aktifSezonuGetir(o.torenTuru)
        if (!sezon?.torenTarihi) return null
        const gun = gunSayisi(sezon.torenTarihi)
        if (gun == null || gun < 0) return null
        return { ...o, torenTarihi: sezon.torenTarihi, gun }
      })
    ).then((sonuclar) =>
      setOduller(
        sonuclar
          .filter(Boolean)
          .sort((a, b) => a.gun - b.gun)
          .slice(0, 3)
      )
    )
  }, [])

  if (oduller !== null && oduller.length === 0) return null

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">🏆 Yaklaşan Ödül Törenleri</h2>
        <Link to="/odul-toreni" className="shrink-0 whitespace-nowrap text-sm text-kraft hover:text-deniz">
          Tümünü Gör ›
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {oduller?.map((o) => (
          <Link
            key={o.yol}
            to={o.yol}
            className="flex shrink-0 flex-col items-center gap-1.5 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi transition hover:ring-deniz/50"
            style={{ width: 110 }}
          >
            <OscarHeykelIkon boyut={24} />
            <p className="text-center text-xs font-medium text-murekkep">{o.ad}</p>
            <p className="text-center text-[11px] text-gise">{o.gun === 0 ? 'Bugün! 🎬' : `${o.gun} gün kaldı`}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import OscarHeykelIkon from '../components/ikonlar/OscarHeykelIkon.jsx'
import { aktifSezonuGetir, kategorilerGetir } from '../utils/oscar.js'

const ODUL_TORENLERI = [
  { yol: '/odul-toreni/oscar', torenTuru: 'oscar', ad: 'Oscar', aciklama: 'Akademi Ödülleri' },
  { yol: '/odul-toreni/bafta', torenTuru: 'bafta', ad: 'BAFTA', aciklama: 'İngiliz Film ve Televizyon Sanatları Akademisi' },
  { yol: '/odul-toreni/golden-globe', torenTuru: 'golden-globe', ad: 'Golden Globe', aciklama: 'Altın Küre Ödülleri' },
  { yol: '/odul-toreni/emmy', torenTuru: 'emmy', ad: 'Emmy', aciklama: 'Televizyon Akademisi Ödülleri' },
  { yol: '/odul-toreni/sag', torenTuru: 'sag', ad: 'SAG Ödülleri', aciklama: "Screen Actors Guild — Oscar'ın en güvenilir öncüsü" },
  { yol: '/odul-toreni/critics-choice', torenTuru: 'critics-choice', ad: "Critics' Choice", aciklama: 'Eleştirmenler Birliği Ödülleri' },
]

function gunSayisi(torenTarihi) {
  if (!torenTarihi) return null
  const fark = new Date(torenTarihi) - new Date()
  return Math.ceil(fark / (1000 * 60 * 60 * 24))
}

export default function OdulSecimi() {
  const [ozetler, setOzetler] = useState(null) // { [torenTuru]: { torenTarihi, kategoriSayisi } | null }

  useEffect(() => {
    Promise.all(
      ODUL_TORENLERI.map(async (o) => {
        const sezon = await aktifSezonuGetir(o.torenTuru)
        if (!sezon) return [o.torenTuru, null]
        const kategoriler = await kategorilerGetir(sezon.id)
        return [o.torenTuru, { torenTarihi: sezon.torenTarihi, kategoriSayisi: kategoriler.length }]
      })
    ).then((sonuclar) => setOzetler(Object.fromEntries(sonuclar)))
  }, [])

  // En yakın törene göre sıralı — henüz sezonu olmayanlar (ya da tarihi
  // geçmiş olanlar) en sona düşüyor, sabit sırada kalmıyor.
  const siraliOduller = ozetler
    ? [...ODUL_TORENLERI].sort((a, b) => {
        const gunA = gunSayisi(ozetler[a.torenTuru]?.torenTarihi)
        const gunB = gunSayisi(ozetler[b.torenTuru]?.torenTarihi)
        if (gunA == null && gunB == null) return 0
        if (gunA == null) return 1
        if (gunB == null) return -1
        if (gunA < 0 && gunB >= 0) return 1
        if (gunB < 0 && gunA >= 0) return -1
        return gunA - gunB
      })
    : ODUL_TORENLERI

  return (
    <div>
      <h1 className="mb-1 font-baslik text-2xl text-murekkep">🏆 Ödüller</h1>
      <p className="mb-6 text-sm text-kraft">
        Kategoriler, adaylar, tahminler ve Kahin — hangi ödül törenine bakmak istersin?
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {siraliOduller.map((o) => {
          const ozet = ozetler?.[o.torenTuru]
          const gun = ozet ? gunSayisi(ozet.torenTarihi) : null
          return (
            <Link
              key={o.yol}
              to={o.yol}
              className="flex flex-col items-center gap-2 rounded-sm bg-kagitKoyu p-4 text-center ring-1 ring-cizgi transition hover:ring-deniz/50"
            >
              <OscarHeykelIkon boyut={28} />
              <p className="font-baslik text-base text-murekkep">{o.ad}</p>
              <p className="text-[11px] text-kraft">{o.aciklama}</p>
              {ozetler && (
                <div className="mt-1 border-t border-cizgi pt-2 text-[11px]">
                  {ozet ? (
                    <>
                      <p className={gun != null && gun < 0 ? 'text-kraft' : 'text-gise'}>
                        {gun == null ? '' : gun > 0 ? `${gun} gün kaldı` : gun === 0 ? 'Bugün! 🎬' : 'Tören geçti'}
                      </p>
                      <p className="text-kraft">{ozet.kategoriSayisi} kategori</p>
                    </>
                  ) : (
                    <p className="text-kraft">Henüz sezon yok</p>
                  )}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

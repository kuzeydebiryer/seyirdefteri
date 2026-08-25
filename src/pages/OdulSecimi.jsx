import { Link } from 'react-router-dom'
import OscarHeykelIkon from '../components/ikonlar/OscarHeykelIkon.jsx'

const ODUL_TORENLERI = [
  { yol: '/odul-toreni/oscar', ad: 'Oscar', aciklama: 'Akademi Ödülleri' },
  { yol: '/odul-toreni/bafta', ad: 'BAFTA', aciklama: 'İngiliz Film ve Televizyon Sanatları Akademisi' },
  { yol: '/odul-toreni/golden-globe', ad: 'Golden Globe', aciklama: 'Altın Küre Ödülleri' },
  { yol: '/odul-toreni/emmy', ad: 'Emmy', aciklama: 'Televizyon Akademisi Ödülleri' },
]

export default function OdulSecimi() {
  return (
    <div>
      <h1 className="mb-1 font-baslik text-2xl text-murekkep">🏆 Ödüller</h1>
      <p className="mb-6 text-sm text-kraft">
        Kategoriler, adaylar, tahminler ve Kahin — hangi ödül törenine bakmak istersin?
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ODUL_TORENLERI.map((o) => (
          <Link
            key={o.yol}
            to={o.yol}
            className="flex flex-col items-center gap-2 rounded-sm bg-kagitKoyu p-4 text-center ring-1 ring-cizgi transition hover:ring-deniz/50"
          >
            <OscarHeykelIkon boyut={28} />
            <p className="font-baslik text-base text-murekkep">{o.ad}</p>
            <p className="text-[11px] text-kraft">{o.aciklama}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { iliskiliLink } from '../utils/ilhamPanosu.js'

const TUR_ETIKETI = { sinema: '🎬 Film', dizi: '📺 Dizi', kitap: '📖 Kitap', kisi: '🎭 Oyuncu' }

// İlham Panosu paylaşımının bağlı olduğu film/dizi/kitap/oyuncu sayfasına
// giden küçük, tıklanabilir kart — poster (varsa), başlık + yıl (film/dizi/
// kitap) veya isim (oyuncu). iliskiliTur/iliskiliDisId yoksa hiçbir şey
// göstermiyor (eski, ilişkilendirilmemiş paylaşımlar için sessizce atlanır).
export default function IliskiliEserRozeti({ ilham }) {
  const link = iliskiliLink(ilham.iliskiliTur, ilham.iliskiliDisId)
  if (!link || !ilham.iliskiliBaslik) return null

  return (
    <Link
      to={link}
      className="mb-2 flex items-center gap-2 rounded-sm bg-kagit p-1.5 ring-1 ring-cizgi transition hover:ring-deniz/50"
    >
      {ilham.iliskiliPosterUrl ? (
        <img src={ilham.iliskiliPosterUrl} alt={ilham.iliskiliBaslik} className="h-10 w-7 shrink-0 rounded-sm object-cover" />
      ) : (
        <span className="flex h-10 w-7 shrink-0 items-center justify-center rounded-sm bg-kagitKoyu text-xs">
          {TUR_ETIKETI[ilham.iliskiliTur]?.charAt(0) || '🔗'}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[10px] text-kraft">{TUR_ETIKETI[ilham.iliskiliTur] || 'İlgili'}</p>
        <p className="truncate text-xs font-medium text-murekkep">
          {ilham.iliskiliBaslik}
          {ilham.iliskiliYil && <span className="text-kraft"> ({ilham.iliskiliYil})</span>}
        </p>
        {ilham.iliskiliAlt && <p className="truncate text-[11px] text-kraft">{ilham.iliskiliAlt}</p>}
      </div>
    </Link>
  )
}

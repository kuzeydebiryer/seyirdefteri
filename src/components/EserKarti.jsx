import { Link } from 'react-router-dom'

function tarihKisaGoster(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

// Filmler.jsx / Diziler.jsx'teki keşif ızgaralarında ve EserSayfasi.jsx'teki
// "Benzer Filmler/Diziler" şeridinde tekrar eden kart — önceden sadece
// poster+isimdi, artık TMDB'den zaten gelen puan/tarih bilgisini de gösteriyor.
export default function EserKarti({ id, tur, baslik, posterUrl, yil, puan, vizyonTarihi, boyut = 'normal' }) {
  const kucukMu = boyut === 'kucuk'
  return (
    <Link to={`/${tur === 'dizi' ? 'dizi' : 'film'}/${id}`} className={kucukMu ? 'block w-20 shrink-0' : 'block'}>
      <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
        {posterUrl && <img src={posterUrl} alt={baslik} loading="lazy" className="h-full w-full object-cover" />}
      </div>
      <p className="mt-1 truncate text-xs text-murekkep">{baslik}</p>
      <p className="truncate text-[10px] text-kraft">
        {vizyonTarihi ? (
          <span className="text-gise">📅 {tarihKisaGoster(vizyonTarihi)}</span>
        ) : (
          <>
            {yil}
            {yil && puan != null && ' · '}
            {puan != null && <span className="text-gise">★ {puan.toFixed(1)}</span>}
          </>
        )}
      </p>
    </Link>
  )
}

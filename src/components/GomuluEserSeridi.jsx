import { Link } from 'react-router-dom'

const TUR_ROTA = { sinema: 'film', dizi: 'dizi', kitap: 'kitap', kisi: 'kisi' }
const TUR_ETIKET = { sinema: 'Film', dizi: 'Dizi', kitap: 'Kitap', kisi: 'Oyuncu' }

// Gönderi metnine gömülmüş film/dizi/kitap/oyuncu referanslarının görünümü
// (bkz. icerikAyristir.js — GonderiEkle.jsx'teki "🎬📚 Eser Ekle" akışı bu
// blokları dolduruyor). Üç görünüm modu var:
//  - kompakt: akış kartındaki (GonderiKarti) önizleme — sadece küçük poster
//    şeridi, başlıksız, en fazla 5 öğe + "+N" rozeti.
//  - tekli kart: tam sayfada TEK bir referans varsa geniş, bilgili bir kart.
//  - yatay şerit / dikey liste: 2+ referans varsa, yazarın composer'da
//    seçtiği düzene (ilk öğenin `duzen` alanı) göre ikisinden biri.
export default function GomuluEserSeridi({ ogeler, kompakt = false }) {
  const gecerliler = (ogeler || []).filter((oge) => oge && TUR_ROTA[oge.tur] && oge.disId)
  if (gecerliler.length === 0) return null

  if (kompakt) {
    const gosterilen = gecerliler.slice(0, 5)
    const fazlaSayi = gecerliler.length - gosterilen.length
    return (
      <div className="flex items-center gap-1.5">
        {gosterilen.map((oge, i) => (
          <div key={i} className="h-10 w-7 shrink-0 overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
            {oge.posterUrl && <img src={oge.posterUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
          </div>
        ))}
        {fazlaSayi > 0 && <span className="text-[10px] text-kraft">+{fazlaSayi}</span>}
      </div>
    )
  }

  if (gecerliler.length === 1) {
    const oge = gecerliler[0]
    return (
      <Link
        to={`/${TUR_ROTA[oge.tur]}/${oge.disId}`}
        className="flex items-center gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi transition hover:ring-deniz"
      >
        <div className="h-24 w-16 shrink-0 overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
          {oge.posterUrl && <img src={oge.posterUrl} alt={oge.baslik} loading="lazy" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-kraft">{TUR_ETIKET[oge.tur]}</p>
          <p className="truncate font-baslik text-base text-murekkep">{oge.baslik}</p>
          {(oge.yil || oge.altBaslik) && (
            <p className="truncate text-xs text-kraft">
              {oge.yil}
              {oge.yil && oge.altBaslik ? ' · ' : ''}
              {oge.altBaslik}
            </p>
          )}
        </div>
      </Link>
    )
  }

  const dikeyMi = gecerliler[0]?.duzen === 'dikey'

  if (dikeyMi) {
    return (
      <ol className="space-y-2">
        {gecerliler.map((oge, i) => (
          <li key={i}>
            <Link
              to={`/${TUR_ROTA[oge.tur]}/${oge.disId}`}
              className="group flex items-center gap-3 rounded-sm bg-kagitKoyu p-2 ring-1 ring-cizgi transition hover:ring-deniz"
            >
              <span className="w-5 shrink-0 text-center font-baslik text-sm text-gise">{i + 1}</span>
              <div className="h-16 w-11 shrink-0 overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                {oge.posterUrl && (
                  <img src={oge.posterUrl} alt={oge.baslik} loading="lazy" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-murekkep group-hover:text-deniz">{oge.baslik}</p>
                {(oge.yil || oge.altBaslik) && (
                  <p className="truncate text-[11px] text-kraft">
                    {oge.yil}
                    {oge.yil && oge.altBaslik ? ' · ' : ''}
                    {oge.altBaslik}
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    )
  }

  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
      {gecerliler.map((oge, i) => (
        <Link key={i} to={`/${TUR_ROTA[oge.tur]}/${oge.disId}`} className="group block w-24 shrink-0">
          <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
            {oge.posterUrl && (
              <img src={oge.posterUrl} alt={oge.baslik} loading="lazy" className="h-full w-full object-cover" />
            )}
            <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-murekkep/80 text-[11px] font-semibold text-kagit">
              {i + 1}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-murekkep group-hover:text-deniz">{oge.baslik}</p>
          {oge.yil && <p className="truncate text-[10px] text-kraft">{oge.yil}</p>}
        </Link>
      ))}
    </div>
  )
}

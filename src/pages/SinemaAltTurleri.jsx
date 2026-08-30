import { Link } from 'react-router-dom'
import { SINEMA_ALT_TURLERI } from '../data/sinemaAltTurleri.js'

// Platformlar.jsx ile aynı desen — hub sayfası, her ana tür kendi kartına
// tıklanınca detay sayfasına gidiyor (bkz. SinemaAnaTuruDetay.jsx). Üst
// menüye eklenmedi (kasıtlı) — Filmler sayfasındaki küçük kart grubundan
// erişiliyor.
export default function SinemaAltTurleri() {
  return (
    <div>
      <Link to="/filmler" className="text-xs text-kraft hover:text-deniz">
        ← Filmler
      </Link>
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">🎭 Sinemasal Alt Türler</h1>
      <p className="mb-6 text-sm text-kraft">
        Ana türlerin altındaki incelikli akımlar — Folk Horror'dan Giallo'ya, film ve dizi dünyasının alt kültürleri.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Object.entries(SINEMA_ALT_TURLERI).map(([anaTurId, anaTur]) => (
          <Link
            key={anaTurId}
            to={`/sinema-turu/${anaTurId}`}
            className="flex flex-col items-center gap-2 rounded-sm bg-kagitKoyu p-4 text-center ring-1 ring-cizgi transition hover:ring-deniz/50"
          >
            <span className="text-2xl">{anaTur.ikon}</span>
            <p className="font-baslik text-base text-murekkep">{anaTur.ad}</p>
            <p className="text-[11px] text-kraft">{anaTur.altTurler.length} alt tür</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

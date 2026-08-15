import { Link } from 'react-router-dom'

const DEPARTMAN_ROZETI = {
  Directing: '🎬 Yönetmen',
  Acting: '🎭 Oyuncu',
  Writing: '✍️ Senarist',
  Production: '🎬 Yapımcı',
  Camera: '🎥 Görüntü Yönetmeni',
  Sound: '🎵 Müzik',
  Editing: '✂️ Kurgu',
  'Costume & Make-Up': '👗 Kostüm',
}

// Oyuncular.jsx'teki üç bölümde (Yönetmenler / Bizim Aramızda Popüler / TMDB'de
// Popüler) tekrar eden kart görünümü — önceden sadece foto+isimdi, artık zaten
// elde olan veriyi (meslek, topluluk puanı, en bilinen eserler) de gösteriyor.
export default function KisiKarti({ id, ad, fotoUrl, departman, ortalamaPuan, puanSayisi, enBilinenler, rozet }) {
  return (
    <Link to={`/kisi/${id}`} className="block text-center">
      <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
        {fotoUrl && <img src={fotoUrl} alt={ad} className="h-full w-full object-cover" />}
        {rozet && (
          <span className="absolute left-1 top-1 rounded-sm bg-murekkep/80 px-1 py-0.5 text-[9px] text-kagit">{rozet}</span>
        )}
      </div>
      <p className="mt-1 truncate text-xs text-murekkep">{ad}</p>
      {departman && DEPARTMAN_ROZETI[departman] && (
        <p className="truncate text-[10px] text-kraft">{DEPARTMAN_ROZETI[departman]}</p>
      )}
      {ortalamaPuan != null && (
        <p className="truncate text-[10px] text-gise">
          ★ {ortalamaPuan.toFixed(1)} <span className="text-kraft">({puanSayisi})</span>
        </p>
      )}
      {enBilinenler?.length > 0 && <p className="truncate text-[10px] text-kraft">{enBilinenler.join(', ')}</p>}
    </Link>
  )
}

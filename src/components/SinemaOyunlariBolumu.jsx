import { Link } from 'react-router-dom'

const SINEMA_OYUNLARI = [
  { yol: '/oyunlar/omubumu', ikon: '🆚', baslik: 'O mu Bu mu' },
  { yol: '/oyunlar/sinemadle', ikon: '🎯', baslik: 'Sinemadle' },
  { yol: '/oyunlar/slogan', ikon: '💬', baslik: 'Slogan Tahmin' },
  { yol: '/oyunlar/sahne', ikon: '🎬', baslik: 'Sahne Tahmin' },
  { yol: '/oyunlar/oyuncu', ikon: '🎭', baslik: 'Hangi Oyuncu Yok?' },
  { yol: '/oyunlar/poster', ikon: '🔍', baslik: 'Afişten Bil' },
  { yol: '/oyunlar/kopru', ikon: '🔗', baslik: 'Film Köprüsü' },
  { yol: '/oyunlar/muzik', ikon: '🎵', baslik: 'Müzik Tahmin' },
]

// Üst menüden kaldırılan "Oyunlar" sekmesinin film/dizi oyunları kısmı —
// artık Film sayfasının içinde, kompakt bir keşif şeridi olarak.
export default function SinemaOyunlariBolumu() {
  return (
    <div className="mb-10">
      <h2 className="mb-3 font-baslik text-lg text-murekkep">🎲 Sinema Oyunları</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {SINEMA_OYUNLARI.map((o) => (
          <Link
            key={o.yol}
            to={o.yol}
            className="flex shrink-0 flex-col items-center gap-1 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi transition hover:ring-deniz/50"
            style={{ width: 92 }}
          >
            <span className="text-2xl">{o.ikon}</span>
            <span className="text-center text-[11px] text-murekkep">{o.baslik}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'

// Üst menüden kaldırılan "Oyunlar" sekmesinin kitap oyunu — Alıntı
// Duvarı'ndaki gerçek paylaşımlardan üretiliyor, bu yüzden Kitap sayfasında
// yaşaması daha doğal.
export default function AlintiOyunuKarti() {
  return (
    <Link
      to="/oyunlar/alinti"
      className="mb-10 flex items-center gap-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi transition hover:ring-deniz/50"
    >
      <span className="text-2xl">📖</span>
      <div>
        <p className="font-baslik text-base text-murekkep">Bu Alıntı Hangi Kitaptan?</p>
        <p className="text-xs text-kraft">Alıntı Duvarı'ndan gerçek paylaşımlar — tamamen sizin.</p>
      </div>
    </Link>
  )
}

import { Link } from 'react-router-dom'

// Gezi kategorisindeki İlham Panosu paylaşımlarında ülke/mekan/kampanya
// bilgisini gösteren, her biri kendi filtresine tıklanabilen küçük rozetler.
export default function GeziRozeti({ ilham }) {
  if (!ilham.geziUlkeAdi && !ilham.geziKonum && !ilham.geziKampanya) return null

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {ilham.geziUlkeAdi && (
        <Link
          to={`/seyir-panosu?kategori=Gezi&ulke=${ilham.geziUlkeKodu}`}
          className="rounded-full bg-kagit px-2 py-0.5 text-[11px] text-murekkep ring-1 ring-cizgi hover:ring-deniz/50"
        >
          🌍 {ilham.geziUlkeAdi}
        </Link>
      )}
      {ilham.geziKonum && (
        <Link
          to={`/seyir-panosu?kategori=Gezi&mekan=${encodeURIComponent(ilham.geziKonum)}`}
          className="rounded-full bg-kagit px-2 py-0.5 text-[11px] text-murekkep ring-1 ring-cizgi hover:ring-deniz/50"
        >
          📍 {ilham.geziKonum}
        </Link>
      )}
      {ilham.geziKampanya && (
        <Link
          to={`/seyir-panosu?kategori=Gezi&kampanya=${encodeURIComponent(ilham.geziKampanya)}`}
          className="rounded-full bg-kagit px-2 py-0.5 text-[11px] text-murekkep ring-1 ring-cizgi hover:ring-deniz/50"
        >
          🏷️ {ilham.geziKampanya}
        </Link>
      )}
    </div>
  )
}

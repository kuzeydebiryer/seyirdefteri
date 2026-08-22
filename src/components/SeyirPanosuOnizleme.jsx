import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ilhamlariGetir } from '../utils/ilhamPanosu.js'

const KATEGORI_IKONU = { Film: '🎬', Dizi: '📺', Kitap: '📖', Oyuncu: '🎭', Gezi: '🧳', Etkinlik: '🎟️', Sanat: '🎨' }

// Anasayfada "Bugün Aktif Olanlar"ın hemen altında — Seyir Panosu'na (eski
// adıyla İlham Panosu) dikkat çekmek için kompakt bir teaser. Bilinçli
// olarak Instagram gömmesi İÇERMİYOR (o zaten kendi başına ağır) — sadece en
// son eklenen paylaşımın kategori + başlık/mekan bilgisini stilize, tek
// satırlık bir önizleme olarak gösterip tamamı için Seyir Panosu'na
// yönlendiriyor.
export default function SeyirPanosuOnizleme() {
  const [sonPaylasim, setSonPaylasim] = useState(undefined) // undefined: yükleniyor, null: hiç yok

  useEffect(() => {
    ilhamlariGetir(undefined, 1).then((liste) => setSonPaylasim(liste[0] || null))
  }, [])

  if (sonPaylasim === undefined) return null

  const teaserMetni =
    sonPaylasim &&
    (sonPaylasim.iliskiliBaslik ||
      sonPaylasim.geziKonum ||
      sonPaylasim.geziUlkeAdi ||
      (sonPaylasim.not ? (sonPaylasim.not.length > 70 ? sonPaylasim.not.slice(0, 70) + '…' : sonPaylasim.not) : 'Yeni bir paylaşım'))

  return (
    <Link
      to="/seyir-panosu"
      className="mb-10 block rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi transition hover:ring-deniz/50"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">📌 Seyir Panosu</h2>
        <span className="shrink-0 whitespace-nowrap text-sm text-kraft">Tümünü Gör ›</span>
      </div>

      {sonPaylasim ? (
        <div className="mt-2 flex items-center gap-2">
          {sonPaylasim.iliskiliPosterUrl ? (
            <img src={sonPaylasim.iliskiliPosterUrl} alt="" className="h-10 w-7 shrink-0 rounded-sm object-cover ring-1 ring-cizgi" />
          ) : (
            <span className="flex h-10 w-7 shrink-0 items-center justify-center rounded-sm bg-kagit text-base ring-1 ring-cizgi">
              {KATEGORI_IKONU[sonPaylasim.kategori] || '📌'}
            </span>
          )}
          <p className="min-w-0 truncate text-sm text-kraft">
            <span className="text-murekkep">{KATEGORI_IKONU[sonPaylasim.kategori]} {sonPaylasim.kategori}</span>
            {' — '}
            {teaserMetni}
            {sonPaylasim.paylasanAdi && <span className="text-kraft"> · {sonPaylasim.paylasanAdi} paylaştı</span>}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-kraft">
          Sinema, kitap, gezi ve kültür üzerine sosyal medyada gördüklerinizi buraya bırakın — ilkini sen ekle.
        </p>
      )}
    </Link>
  )
}

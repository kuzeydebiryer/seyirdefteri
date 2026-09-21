import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import OyunIskeleti from '../../components/OyunIskeleti.jsx'
import { populerFilmHavuzuGetir, filmDetayGetir, karistir, rastgeleSec, TMDB_POSTER } from '../../utils/oyunHavuzu.js'

const SORU_SAYISI = 8

async function sorulariUret() {
  const havuz = await populerFilmHavuzuGetir(50)
  const adaylar = rastgeleSec(havuz, 25)
  const detaylar = (await Promise.all(adaylar.map((f) => filmDetayGetir(f.disId)))).filter(
    (d) => (d?.credits?.cast?.length || 0) >= 3
  )

  if (detaylar.length < 2) return []

  const sorular = rastgeleSec(detaylar, Math.min(SORU_SAYISI, detaylar.length)).map((dogru) => {
    const gercekOyuncular = rastgeleSec(dogru.credits.cast, 3).map((o) => o.name)
    // Sahte oyuncu — başka rastgele bir filmin kadrosundan, bu filmde
    // OLMADIĞINDAN emin olmak için isim çakışmalarını eliyoruz.
    const digerFilmler = detaylar.filter((d) => d.id !== dogru.id)
    let sahteOyuncu = null
    for (const d of karistir(digerFilmler)) {
      const aday = karistir(d.credits.cast)[0]
      if (aday && !dogru.credits.cast.some((o) => o.name === aday.name)) {
        sahteOyuncu = aday.name
        break
      }
    }
    if (!sahteOyuncu) return null

    const secenekler = karistir([
      ...gercekOyuncular.map((ad) => ({ etiket: ad, dogruMu: false })),
      { etiket: sahteOyuncu, dogruMu: true },
    ])
    return {
      gorsel: dogru.poster_path ? `${TMDB_POSTER}${dogru.poster_path}` : null,
      gorselStil: { maxHeight: 280, objectFit: 'contain', margin: '0 auto' },
      baslik: dogru.title,
      altYazi: 'Bu oyunculardan hangisi bu filmde OYNAMADI?',
      secenekler,
    }
  })
  return sorular.filter(Boolean)
}

export default function OyuncuTahmin() {
  const [sorular, setSorular] = useState(null)
  const [oynatmaSayaci, setOynatmaSayaci] = useState(0)

  useEffect(() => {
    setSorular(null)
    sorulariUret().then(setSorular)
  }, [oynatmaSayaci])

  return (
    <div className="max-w-lg">
      <Link to="/oyunlar" className="text-xs text-kraft hover:text-deniz">
        ← Sinema Oyunları
      </Link>
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">Hangi Oyuncu Oynamadı?</h1>
      <p className="mb-4 text-sm text-kraft">Dördünden biri bu filmde hiç yoktu, bulabilecek misin?</p>

      {sorular === null && <p className="text-sm text-kraft">Sorular hazırlanıyor...</p>}
      {sorular !== null && <OyunIskeleti sorular={sorular} tekrarOyna={() => setOynatmaSayaci((n) => n + 1)} />}
    </div>
  )
}

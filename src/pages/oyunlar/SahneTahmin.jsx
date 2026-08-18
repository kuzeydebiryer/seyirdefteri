import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import OyunIskeleti from '../../components/OyunIskeleti.jsx'
import { populerFilmHavuzuGetir, filmDetayGetir, karistir, rastgeleSec, TMDB_BACKDROP } from '../../utils/oyunHavuzu.js'

const SORU_SAYISI = 8

async function sorulariUret() {
  const havuz = await populerFilmHavuzuGetir(50)
  const adaylar = rastgeleSec(havuz, 25)
  const detaylar = (await Promise.all(adaylar.map((f) => filmDetayGetir(f.disId)))).filter(
    (d) => d?.images?.backdrops?.length > 0
  )

  if (detaylar.length < 4) return []

  const sorular = rastgeleSec(detaylar, Math.min(SORU_SAYISI, detaylar.length)).map((dogru) => {
    const backdrop = karistir(dogru.images.backdrops)[0]
    const digerFilmler = detaylar.filter((d) => d.id !== dogru.id)
    const yanlislar = rastgeleSec(digerFilmler, Math.min(3, digerFilmler.length))
    const secenekler = karistir([
      { etiket: dogru.title, dogruMu: true },
      ...yanlislar.map((y) => ({ etiket: y.title, dogruMu: false })),
    ])
    return { gorsel: `${TMDB_BACKDROP}${backdrop.file_path}`, secenekler }
  })
  return sorular
}

export default function SahneTahmin() {
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
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">Bu Sahne Hangi Filmden?</h1>
      <p className="mb-4 text-sm text-kraft">Bir kare gösteriyoruz, filmi bulabilecek misin?</p>

      {sorular === null && <p className="text-sm text-kraft">Sorular hazırlanıyor...</p>}
      {sorular !== null && <OyunIskeleti sorular={sorular} tekrarOyna={() => setOynatmaSayaci((n) => n + 1)} />}
    </div>
  )
}

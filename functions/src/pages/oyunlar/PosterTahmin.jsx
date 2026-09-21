import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import OyunIskeleti from '../../components/OyunIskeleti.jsx'
import { populerFilmHavuzuGetir, filmDetayGetir, karistir, rastgeleSec, TMDB_POSTER } from '../../utils/oyunHavuzu.js'

const SORU_SAYISI = 8

async function sorulariUret() {
  const havuz = await populerFilmHavuzuGetir(50)
  const adaylar = rastgeleSec(havuz, 25)
  const detaylar = (await Promise.all(adaylar.map((f) => filmDetayGetir(f.disId)))).filter((d) => d?.poster_path)

  if (detaylar.length < 4) return []

  const sorular = rastgeleSec(detaylar, Math.min(SORU_SAYISI, detaylar.length)).map((dogru) => {
    const digerFilmler = detaylar.filter((d) => d.id !== dogru.id)
    const yanlislar = rastgeleSec(digerFilmler, Math.min(3, digerFilmler.length))
    const secenekler = karistir([
      { etiket: dogru.title, dogruMu: true },
      ...yanlislar.map((y) => ({ etiket: y.title, dogruMu: false })),
    ])
    // Afişi 3 kata kadar yakınlaştırıp rastgele bir odak noktası seçiyoruz —
    // her seferinde farklı bir kesit çıksın diye.
    const odakX = 20 + Math.random() * 60
    const odakY = 20 + Math.random() * 60
    return {
      gorsel: `${TMDB_POSTER}${dogru.poster_path}`,
      gorselStil: { transform: 'scale(3)', transformOrigin: `${odakX}% ${odakY}%`, height: 220, width: '100%', objectFit: 'cover' },
      secenekler,
    }
  })
  return sorular
}

export default function PosterTahmin() {
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
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">Afişten Filmi Bil</h1>
      <p className="mb-4 text-sm text-kraft">Yakınlaştırılmış bir kesit — tüm afişi görmeden tanıyabilecek misin?</p>

      {sorular === null && <p className="text-sm text-kraft">Sorular hazırlanıyor...</p>}
      {sorular !== null && <OyunIskeleti sorular={sorular} tekrarOyna={() => setOynatmaSayaci((n) => n + 1)} />}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import OyunIskeleti from '../../components/OyunIskeleti.jsx'
import { populerFilmHavuzuGetir, filmDetayGetir, karistir, rastgeleSec } from '../../utils/oyunHavuzu.js'

const SORU_SAYISI = 6

async function sorulariUret() {
  const havuz = await populerFilmHavuzuGetir(50)
  const adaylar = rastgeleSec(havuz, 30)
  const detaylar = (await Promise.all(adaylar.map((f) => filmDetayGetir(f.disId)))).filter(
    (d) => (d?.credits?.cast?.length || 0) >= 5
  )

  // Ortak oyuncusu olan film çiftlerini buluyoruz — "zincirleme" fikrinin
  // temeli: iki farklı filmi bağlayan görünmez bir oyuncu.
  const ciftler = []
  for (let i = 0; i < detaylar.length; i++) {
    for (let j = i + 1; j < detaylar.length; j++) {
      const a = detaylar[i]
      const b = detaylar[j]
      const aIsimler = new Set(a.credits.cast.slice(0, 15).map((o) => o.name))
      const ortak = b.credits.cast.slice(0, 15).find((o) => aIsimler.has(o.name))
      if (ortak) ciftler.push({ a, b, ortakOyuncu: ortak.name })
    }
  }

  if (ciftler.length < 2) return []

  const secilenCiftler = rastgeleSec(ciftler, Math.min(SORU_SAYISI, ciftler.length))
  const sorular = secilenCiftler.map(({ a, b, ortakOyuncu }) => {
    const havuzOyuncular = karistir([...a.credits.cast.slice(0, 10), ...b.credits.cast.slice(0, 10)])
      .map((o) => o.name)
      .filter((ad) => ad !== ortakOyuncu)
    const yanlislar = [...new Set(havuzOyuncular)].slice(0, 3)
    const secenekler = karistir([{ etiket: ortakOyuncu, dogruMu: true }, ...yanlislar.map((ad) => ({ etiket: ad, dogruMu: false }))])
    return {
      baslik: `${a.title} 🔗 ${b.title}`,
      altYazi: 'Bu iki filmde de hangi oyuncu rol aldı?',
      secenekler,
    }
  })
  return sorular
}

export default function FilmKoprusu() {
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
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">Film Köprüsü</h1>
      <p className="mb-4 text-sm text-kraft">İki filmi bağlayan görünmez oyuncuyu bul.</p>

      {sorular === null && <p className="text-sm text-kraft">Bağlantılar taranıyor...</p>}
      {sorular !== null && <OyunIskeleti sorular={sorular} tekrarOyna={() => setOynatmaSayaci((n) => n + 1)} />}
    </div>
  )
}

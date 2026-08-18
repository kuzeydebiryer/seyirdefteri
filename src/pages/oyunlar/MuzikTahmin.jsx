import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import OyunIskeleti from '../../components/OyunIskeleti.jsx'
import { populerFilmHavuzuGetir, filmDetayGetir, karistir, rastgeleSec } from '../../utils/oyunHavuzu.js'

const SORU_SAYISI = 8

// iTunes/Apple Arama API'si — kimlik doğrulama gerektirmiyor, gizli anahtar
// yok (Spotify'ın aksine tamamen istemci tarafında güvenle çağrılabilir).
// Spotify 30sn önizleme özelliğini yeni uygulamalar için kaldırdığından
// (Kasım 2024, kalıcı), bu oyun BİLEREK Spotify değil iTunes kullanıyor.
async function itunesOnizlemeAra(filmAdi) {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(filmAdi + ' soundtrack')}&media=music&entity=song&limit=5`
    )
    if (!res.ok) return null
    const veri = await res.json()
    const onizlemeliOlan = (veri.results || []).find((r) => r.previewUrl)
    return onizlemeliOlan?.previewUrl || null
  } catch {
    return null
  }
}

async function sorulariUret() {
  const havuz = await populerFilmHavuzuGetir(50)
  const adaylar = rastgeleSec(havuz, 30)
  const detaylar = await Promise.all(adaylar.map((f) => filmDetayGetir(f.disId)))

  // Her aday için iTunes'da önizlemeli bir parça var mı diye bakıyoruz —
  // özellikle bağımsız/eski/yabancı filmlerde soundtrack bulunamayabilir,
  // bu normal, sessizce eleniyor.
  const eslesenler = []
  for (let i = 0; i < detaylar.length && eslesenler.length < SORU_SAYISI; i++) {
    const d = detaylar[i]
    if (!d) continue
    const onizleme = await itunesOnizlemeAra(d.title)
    if (onizleme) eslesenler.push({ film: d, onizleme })
  }

  if (eslesenler.length < 4) return []

  const sorular = eslesenler.map(({ film, onizleme }) => {
    const digerFilmler = eslesenler.filter((e) => e.film.id !== film.id).map((e) => e.film)
    const yanlislar = rastgeleSec(digerFilmler, Math.min(3, digerFilmler.length))
    const secenekler = karistir([
      { etiket: film.title, dogruMu: true },
      ...yanlislar.map((y) => ({ etiket: y.title, dogruMu: false })),
    ])
    return { ses: onizleme, altYazi: 'Bu müzik hangi filme ait?', secenekler }
  })
  return sorular
}

export default function MuzikTahmin() {
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
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">Bu Müzik Hangi Filmden?</h1>
      <p className="mb-4 text-sm text-kraft">30 saniyelik bir parça — hangi filme ait olduğunu bulabilecek misin?</p>

      {sorular === null && <p className="text-sm text-kraft">Parçalar aranıyor, biraz sürebilir...</p>}
      {sorular !== null && <OyunIskeleti sorular={sorular} tekrarOyna={() => setOynatmaSayaci((n) => n + 1)} />}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import OyunIskeleti from '../../components/OyunIskeleti.jsx'
import { sonAlintilariGetir } from '../../utils/alinti.js'
import { karistir, rastgeleSec, tekillestir } from '../../utils/oyunHavuzu.js'

const SORU_SAYISI = 8

async function sorulariUret() {
  const havuzHam = await sonAlintilariGetir(80)
  // Aynı kitaptan birden fazla alıntı olabilir, ama seçenek listesinde aynı
  // kitap adı tekrar etmesin diye kitap bazında tekilleştiriyoruz.
  const havuz = tekillestir(
    havuzHam.filter((a) => a.metin?.trim() && a.kitapBaslik?.trim()),
    (a) => a.kitapBaslik
  )

  if (havuz.length < 4) return []

  const sorular = rastgeleSec(havuz, Math.min(SORU_SAYISI, havuz.length)).map((dogru) => {
    const digerKitaplar = havuz.filter((a) => a.kitapBaslik !== dogru.kitapBaslik)
    const yanlislar = rastgeleSec(digerKitaplar, Math.min(3, digerKitaplar.length))
    const secenekler = karistir([
      { etiket: dogru.kitapBaslik, dogruMu: true },
      ...yanlislar.map((y) => ({ etiket: y.kitapBaslik, dogruMu: false })),
    ])
    return { altYazi: `"${dogru.metin}"`, secenekler }
  })
  return sorular
}

export default function AlintiTahmin() {
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
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">Bu Alıntı Hangi Kitaptan?</h1>
      <p className="mb-4 text-sm text-kraft">Topluluğun Alıntı Duvarı'na paylaştığı gerçek alıntılar — hepsi sizin.</p>

      {sorular === null && <p className="text-sm text-kraft">Sorular hazırlanıyor...</p>}
      {sorular !== null && <OyunIskeleti sorular={sorular} tekrarOyna={() => setOynatmaSayaci((n) => n + 1)} />}
    </div>
  )
}

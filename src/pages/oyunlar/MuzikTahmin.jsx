import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import OyunIskeleti from '../../components/OyunIskeleti.jsx'
import { populerFilmHavuzuGetir, filmDetayGetir, karistir, rastgeleSec, oyunMuzikOnizlemesiGetir } from '../../utils/oyunHavuzu.js'

const SORU_SAYISI = 8
// Havuzdan taranacak aday sayısı — iTunes önizlemeleri artık Firestore'da
// önbelleklendiğinden (bkz. oyunMuzikOnizlemesiGetir), tekrar oynanan
// oturumlarda bu tarama hızlı geçiyor ve zamanla eşleşen film çeşidi artıyor
// (önceki sürümde sadece 30 aday taranıp ilk 8 eşleşmede duruluyordu, bu da
// hep aynı dar seçenek setine sıkışmaya sebep oluyordu).
const TARANACAK_ADAY_SAYISI = 45

async function sorulariUret() {
  const havuz = await populerFilmHavuzuGetir(150)
  const adaylar = rastgeleSec(havuz, Math.min(TARANACAK_ADAY_SAYISI, havuz.length))
  const detaylar = await Promise.all(adaylar.map((f) => filmDetayGetir(f.disId)))

  // Her aday için iTunes'da önizlemeli bir parça var mı diye bakıyoruz —
  // özellikle bağımsız/eski/yabancı filmlerde soundtrack bulunamayabilir,
  // bu normal, sessizce eleniyor. Erken durmuyoruz (tüm taranan adayları
  // gezip bulabildiğimiz kadar buluyoruz) ki seçenek havuzu genişlesin.
  const eslesenler = []
  for (const d of detaylar) {
    if (!d) continue
    const onizleme = await oyunMuzikOnizlemesiGetir(d.id, d.original_title || d.title)
    if (onizleme) eslesenler.push({ film: d, onizleme })
  }

  if (eslesenler.length < 4) return []

  const secilenSorular = rastgeleSec(eslesenler, Math.min(SORU_SAYISI, eslesenler.length))
  const sorular = secilenSorular.map(({ film, onizleme }) => {
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

      {sorular === null && <p className="text-sm text-kraft">Parçalar aranıyor, ilk oynayışta biraz sürebilir...</p>}
      {sorular !== null && <OyunIskeleti sorular={sorular} tekrarOyna={() => setOynatmaSayaci((n) => n + 1)} />}
    </div>
  )
}

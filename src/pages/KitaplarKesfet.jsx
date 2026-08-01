import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { topluluktaPopulerEserler } from '../hooks/useEser.js'
import { useTavsiyeler } from '../hooks/useTavsiyeler.js'
import { useHaberler } from '../hooks/useHaberler.js'
import YildizPuan from '../components/YildizPuan.jsx'
import TavsiyeBolumu from '../components/TavsiyeBolumu.jsx'
import HaberBolumu from '../components/HaberBolumu.jsx'

export default function KitaplarKesfet() {
  const [topluluk, setTopluluk] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const { tavsiyeler, yenidenYukle: tavsiyeleriYenile } = useTavsiyeler('kitap')
  const { haberler, yenidenYukle: haberleriYenile } = useHaberler('kitap')

  useEffect(() => {
    let iptal = false
    async function getir() {
      const topluluktakiler = await topluluktaPopulerEserler('kitap')
      if (!iptal) {
        setTopluluk(topluluktakiler)
        setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [])

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep mb-1">Kitap</h1>
      <Link to="/kitaplar/bakim" className="mb-6 inline-block text-[11px] text-kraft hover:text-deniz hover:underline">
        📋 Kitap Kataloğu Bakımı
      </Link>

      <TavsiyeBolumu tur="kitap" tavsiyeler={tavsiyeler} yenidenYukle={tavsiyeleriYenile} />
      <HaberBolumu kategori="kitap" haberler={haberler} yenidenYukle={haberleriYenile} />

      <h2 className="font-baslik text-lg text-murekkep mb-3">Bizim Aramızda Popüler</h2>
      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {!yukleniyor && topluluk.length === 0 && <p className="text-sm text-kraft">Henüz kimse kitap paylaşmadı.</p>}

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {topluluk.map((k) => (
          <Link key={k.id} to={`/kitap/${k.id}`} className="block">
            <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
              {k.posterUrl && <img src={k.posterUrl} alt={k.baslik} className="h-full w-full object-cover" />}
            </div>
            <p className="mt-1 truncate text-xs text-murekkep">{k.baslik}</p>
            <p className="truncate text-[11px] text-kraft">{k.yazar}</p>
            {k.ortalamaPuan != null && <YildizPuan puan={Math.round(k.ortalamaPuan * 2) / 2} boyut="text-[10px]" onluGoster={false} />}
          </Link>
        ))}
      </div>
    </div>
  )
}

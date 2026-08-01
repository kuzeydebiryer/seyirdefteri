import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { topluluktaPopulerEserler } from '../hooks/useEser.js'
import { useTavsiyeler } from '../hooks/useTavsiyeler.js'
import { useHaberler } from '../hooks/useHaberler.js'
import { useAuth } from '../context/AuthContext.jsx'
import { suankiOkunanKitabiGetir, ilerlemeGuncelle } from '../utils/izlenecek.js'
import YildizPuan from '../components/YildizPuan.jsx'
import TavsiyeBolumu from '../components/TavsiyeBolumu.jsx'
import HaberBolumu from '../components/HaberBolumu.jsx'

function SuankiKitapWidget() {
  const { kullanici } = useAuth()
  const [kitap, setKitap] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [sayfaTaslak, setSayfaTaslak] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  useEffect(() => {
    if (!kullanici) {
      setYukleniyor(false)
      return
    }
    let iptal = false
    async function getir() {
      const k = await suankiOkunanKitabiGetir(kullanici.uid)
      if (!iptal) {
        setKitap(k)
        setSayfaTaslak(k?.suankiSayfa ?? '')
        setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [kullanici])

  async function ilerlemeyiKaydet(e) {
    e.preventDefault()
    if (!kullanici || !kitap) return
    setKaydediliyor(true)
    try {
      await ilerlemeGuncelle(kullanici.uid, 'kitap', kitap.disId, Number(sayfaTaslak))
      setKitap((k) => ({ ...k, suankiSayfa: Number(sayfaTaslak) }))
    } finally {
      setKaydediliyor(false)
    }
  }

  if (yukleniyor || !kitap) return null

  const yuzde = kitap.toplamSayfa ? Math.min(100, Math.round(((kitap.suankiSayfa || 0) / kitap.toplamSayfa) * 100)) : null

  return (
    <div className="mb-6 rounded-sm bg-deniz p-4 text-kagit ring-1 ring-cizgi">
      <p className="text-[11px] uppercase tracking-widest opacity-80">📖 Şu An Okuduğun Kitap</p>
      <Link to={`/kitap/${kitap.disId}`} className="mt-1 block font-baslik text-lg hover:underline">
        {kitap.baslik}
      </Link>
      {kitap.alt && <p className="text-sm opacity-80">{kitap.alt}</p>}

      {kitap.toplamSayfa ? (
        <>
          <div className="mt-3 flex items-center gap-3">
            {yuzde != null && <span className="font-baslik text-2xl">%{yuzde}</span>}
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-kagit/30">
              <div className="h-full bg-kagit" style={{ width: `${yuzde || 0}%` }} />
            </div>
          </div>
          <form onSubmit={ilerlemeyiKaydet} className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min="0"
              max={kitap.toplamSayfa}
              value={sayfaTaslak}
              onChange={(e) => setSayfaTaslak(e.target.value)}
              className="w-20 rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
            />
            <span className="text-xs opacity-80">/ {kitap.toplamSayfa} sayfa</span>
            <button
              type="submit"
              disabled={kaydediliyor}
              className="ml-auto rounded-sm bg-kagit px-3 py-1.5 font-govde text-xs text-murekkep disabled:opacity-40"
            >
              {kaydediliyor ? 'Kaydediliyor...' : 'Güncelle'}
            </button>
          </form>
        </>
      ) : (
        <p className="mt-2 text-xs opacity-80">Sayfa bilgisi yok, ilerleme takip edilemiyor.</p>
      )}
    </div>
  )
}

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
      <div className="mb-4 flex gap-3">
        <Link to="/kitaplar/bakim" className="text-[11px] text-kraft hover:text-deniz hover:underline">
          📋 Kitap Kataloğu Bakımı
        </Link>
        <Link to="/alintilar" className="text-[11px] text-kraft hover:text-deniz hover:underline">
          💬 Alıntı Duvarı
        </Link>
      </div>

      <SuankiKitapWidget />

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

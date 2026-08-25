import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { topluluktaPopulerEserler } from '../hooks/useEser.js'
import { useTavsiyeler } from '../hooks/useTavsiyeler.js'
import { useHaberler } from '../hooks/useHaberler.js'
import { useAuth } from '../context/AuthContext.jsx'
import { suankiOkunanKitabiGetir, ilerlemeGuncelle, izlenecekEkle, toplamSayfaTamamla } from '../utils/izlenecek.js'
import { kitapGetir } from '../utils/kitapKatalog.js'
import SonAlintilarBolumu from '../components/SonAlintilarBolumu.jsx'
import KitapSecici from '../components/KitapSecici.jsx'
import YildizPuan from '../components/YildizPuan.jsx'
import TavsiyeBolumu from '../components/TavsiyeBolumu.jsx'
import HaberBolumu from '../components/HaberBolumu.jsx'
import ListelerBolumu from '../components/ListelerBolumu.jsx'
import KitapArama from '../components/KitapArama.jsx'
import NobelBanner from '../components/NobelBanner.jsx'
import GununKitabi from '../components/GununKitabi.jsx'
import MeydanOkuma from '../components/MeydanOkuma.jsx'
import IlhamPanosuOnizleme from '../components/IlhamPanosuOnizleme.jsx'
import AlintiOyunuKarti from '../components/AlintiOyunuKarti.jsx'

function SuankiKitapWidget() {
  const { kullanici } = useAuth()
  const [kitap, setKitap] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [sayfaTaslak, setSayfaTaslak] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [seciliKitap, setSeciliKitap] = useState(null) // KitapSecici'den henüz kaydedilmemiş seçim

  async function yeniden() {
    if (!kullanici) {
      setYukleniyor(false)
      return
    }
    const k = await suankiOkunanKitabiGetir(kullanici.uid)
    // Kendiliğinden onarım: kitap sonradan düzenlenip sayfa sayısı eklendiyse
    // ama bu izlenecek kaydı hâlâ eski (boş) değeri taşıyorsa, katalogdan
    // (Firestore'dan, dış API'ye gitmeden) tamamla.
    if (k && !k.toplamSayfa) {
      const kitapKaydi = await kitapGetir(k.disId)
      if (kitapKaydi.sayfaSayisi) {
        await toplamSayfaTamamla(kullanici.uid, 'kitap', k.disId, kitapKaydi.sayfaSayisi)
        k.toplamSayfa = kitapKaydi.sayfaSayisi
      }
    }
    setKitap(k)
    setSayfaTaslak(k?.suankiSayfa ?? '')
    setYukleniyor(false)
  }

  useEffect(() => {
    yeniden()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Kitap Kataloğu'ndan (Google Books + Open Library ile zenginleştirilmiş)
  // bir kitap seçilince direkt "okunuyor" durumunda izlenecekler kaydı açılır —
  // kullanıcının önce bir günce yazmasına ya da kitabı "Popüler" listesinde
  // bulmasına gerek kalmadan.
  async function okumayaBasla() {
    if (!kullanici || !seciliKitap) return
    setKaydediliyor(true)
    try {
      await izlenecekEkle(kullanici, {
        tur: 'kitap',
        disId: seciliKitap.id,
        baslik: seciliKitap.baslik,
        alt: seciliKitap.yazar || '',
        posterUrl: seciliKitap.posterUrl,
        toplamSayfa: seciliKitap.sayfaSayisi || null,
        durum: 'okunuyor',
      })
      setSeciliKitap(null)
      await yeniden()
    } finally {
      setKaydediliyor(false)
    }
  }

  if (yukleniyor) return null

  if (!kitap) {
    return (
      <div className="mb-6 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
        <p className="mb-2 font-baslik text-sm text-murekkep">📖 Şu An Ne Okuyorsun?</p>
        <p className="mb-3 text-xs text-kraft">Bir kitap seç, doğrudan "okunuyor" olarak işaretlensin.</p>
        <KitapSecici secili={seciliKitap} onSecim={setSeciliKitap} onTemizle={() => setSeciliKitap(null)} />
        {seciliKitap && (
          <button
            onClick={okumayaBasla}
            disabled={kaydediliyor}
            className="mt-2 rounded-sm bg-deniz px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {kaydediliyor ? 'Kaydediliyor...' : 'Okumaya Başlıyorum'}
          </button>
        )}
      </div>
    )
  }

  const yuzde = kitap.toplamSayfa ? Math.min(100, Math.round(((kitap.suankiSayfa || 0) / kitap.toplamSayfa) * 100)) : null

  return (
    <div className="mb-6 flex gap-4 rounded-sm bg-deniz p-4 text-kagit ring-1 ring-cizgi">
      {kitap.posterUrl && (
        <img src={kitap.posterUrl} alt={kitap.baslik} className="h-28 w-20 shrink-0 rounded-sm object-cover ring-1 ring-kagit/30" />
      )}
      <div className="min-w-0 flex-1">
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
          <div className="mt-2">
            <p className="text-xs opacity-80">Sayfa bilgisi yok, ilerleme yüzde olarak takip edilemiyor.</p>
            <Link to={`/kitap/${kitap.disId}`} className="text-xs underline opacity-90 hover:opacity-100">
              ✏️ Kitap sayfasından sayfa sayısını elle girebilirsin
            </Link>
          </div>
        )}
      </div>
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

      <NobelBanner />

      <div className="grid gap-4 sm:grid-cols-2">
        <GununKitabi />
        <MeydanOkuma />
      </div>

      <KitapArama />

      <SonAlintilarBolumu limitSayisi={5} />
      <AlintiOyunuKarti />
      <IlhamPanosuOnizleme kategori="Kitap" />

      <TavsiyeBolumu tur="kitap" tavsiyeler={tavsiyeler} yenidenYukle={tavsiyeleriYenile} />
      <HaberBolumu kategori="kitap" haberler={haberler} yenidenYukle={haberleriYenile} />
      <ListelerBolumu tur="kitap" />

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

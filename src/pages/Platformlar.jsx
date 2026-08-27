import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PlatformYeniEklentiFormu from '../components/PlatformYeniEklentiFormu.jsx'
import TavsiyeBolumu from '../components/TavsiyeBolumu.jsx'
import { useTavsiyeler } from '../hooks/useTavsiyeler.js'
import YakindaGelecekler from '../components/YakindaGelecekler.jsx'
import YakindaGelecekFormu from '../components/YakindaGelecekFormu.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_LOGO = 'https://image.tmdb.org/t/p/w200'

// TMDB, Türkiye'de aktif OLAN her sağlayıcıyı döndürüyor — bunların çoğu
// (küçük yerel VOD servisleri, TV kanalı uygulamaları vb.) kullanıcıların
// aradığı "büyük" platformlar değil. Listeyi bilinen, tanıdık platformlarla
// sınırlıyoruz — 40-50 satırlık bir kalabalık yerine, gerçekten arananlar.
const TANIDIK_PLATFORMLAR = [
  'Netflix',
  'Amazon Prime Video',
  'Disney Plus',
  'Max',
  'HBO Max',
  'BluTV',
  'Gain',
  'MUBI',
  'TOD',
  'Apple TV',
  'Apple TV+',
]

export default function Platformlar() {
  const [platformlar, setPlatformlar] = useState(null)
  const [yakindaYenile, setYakindaYenile] = useState(0)
  const [dijitalFiltre, setDijitalFiltre] = useState('tumu')
  const { tavsiyeler: dijitalYeniCikanlar, yenidenYukle: dijitalYeniCikanlarYenile } = useTavsiyeler('sinema', 'dijitalYeniCikanlar')

  // DijitalSayfasi.jsx'teki (/platform/dijital) filtreyle birebir aynı
  // mantık — burası sadece kısa bir önizleme olduğu için varsayılan "Tümü",
  // orada varsayılan "Dijital" (karodan geldiği için).
  const dijitalGosterilecekler = dijitalYeniCikanlar.filter((t) => {
    if (dijitalFiltre === 'tumu') return true
    if (dijitalFiltre === 'dijital') return !t.platformEtiketi || t.platformEtiketi === '💻 Dijital'
    return t.platformEtiketi && t.platformEtiketi !== '💻 Dijital'
  })

  useEffect(() => {
    if (!TMDB_API_KEY) return
    Promise.all([
      fetch(`https://api.themoviedb.org/3/watch/providers/movie?api_key=${TMDB_API_KEY}&watch_region=TR`).then((r) => r.json()),
      fetch(`https://api.themoviedb.org/3/watch/providers/tv?api_key=${TMDB_API_KEY}&watch_region=TR`).then((r) => r.json()),
    ]).then(([filmVeri, diziVeri]) => {
      const hepsi = [...(filmVeri.results || []), ...(diziVeri.results || [])]
      const benzersiz = new Map()
      hepsi.forEach((p) => {
        if (TANIDIK_PLATFORMLAR.some((ad) => p.provider_name.toLowerCase().includes(ad.toLowerCase()))) {
          if (!benzersiz.has(p.provider_id)) benzersiz.set(p.provider_id, p)
        }
      })
      const liste = [...benzersiz.values()].sort(
        (a, b) => (a.display_priorities?.TR ?? 999) - (b.display_priorities?.TR ?? 999)
      )
      setPlatformlar(liste)
    })
  }, [])

  return (
    <div>
      <h1 className="mb-1 font-baslik text-2xl text-murekkep">📡 Platformlar</h1>
      <p className="mb-6 text-sm text-kraft">Bir platform seç, o an abonelikle izlenebilen film ve dizileri keşfet.</p>

      <YakindaGelecekler yenilemeTetik={yakindaYenile} tumunuGorLink="/yakinda-geliyor" />
      {platformlar && <YakindaGelecekFormu platformlar={platformlar} onEklendi={() => setYakindaYenile((n) => n + 1)} />}

      <TavsiyeBolumu
        tur="sinema"
        koleksiyon="dijitalYeniCikanlar"
        tavsiyeler={dijitalGosterilecekler}
        yenidenYukle={dijitalYeniCikanlarYenile}
        yatay
        sade
        baslik="Dijitalde Yeni Çıkanlar"
        ekleButonuMetni="+ Film Ekle"
        rozetMetni="💻 Dijital"
        tumunuGorLink="/platform/dijital"
        araIcerik={
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              { id: 'tumu', etiket: 'Tümü' },
              { id: 'dijital', etiket: '💻 Dijital' },
              { id: 'platform', etiket: '📡 Platform' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setDijitalFiltre(f.id)}
                className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
                  dijitalFiltre === f.id ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagitKoyu text-kraft ring-cizgi'
                }`}
              >
                {f.etiket}
              </button>
            ))}
          </div>
        }
      />

      {platformlar && <PlatformYeniEklentiFormu platformlar={platformlar} />}

      {platformlar === null && <p className="text-sm text-kraft">Yükleniyor...</p>}

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
        {platformlar?.map((p) => (
          <Link
            key={p.provider_id}
            to={`/platform/${p.provider_id}?ad=${encodeURIComponent(p.provider_name)}`}
            className="flex flex-col items-center gap-2 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi transition hover:ring-deniz/50"
          >
            {p.logo_path ? (
              <img src={`${TMDB_LOGO}${p.logo_path}`} alt={p.provider_name} className="h-14 w-14 rounded-sm object-cover" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-sm bg-kagit text-2xl">📡</span>
            )}
            <p className="text-center text-xs text-murekkep">{p.provider_name}</p>
          </Link>
        ))}
        {/* Gerçek bir TMDB platformu değil — "belirli bir platformda değil
            ama dijital VOD ile evde izlenebilir" anlamına gelen, kendi
            oluşturduğumuz özel bir kategori. Aynı görsel dilde, ızgaranın
            sonunda. */}
        <Link
          to="/platform/dijital"
          className="flex flex-col items-center gap-2 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi transition hover:ring-deniz/50"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-sm bg-kagit text-2xl">💻</span>
          <p className="text-center text-xs text-murekkep">Dijital</p>
        </Link>
      </div>
    </div>
  )
}

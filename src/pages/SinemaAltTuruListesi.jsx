import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { altTurBul } from '../data/sinemaAltTurleri.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w300'

async function sayfaGetir({ uc, tmdbTurId, anahtarKelimeIdleri, sayfa }) {
  const parcalar = [
    `api_key=${TMDB_API_KEY}`,
    'language=tr-TR',
    'sort_by=popularity.desc',
    `with_keywords=${anahtarKelimeIdleri.join('|')}`,
    `page=${sayfa}`,
  ]
  if (tmdbTurId) parcalar.push(`with_genres=${tmdbTurId}`)
  const res = await fetch(`https://api.themoviedb.org/3/discover/${uc}?${parcalar.join('&')}`)
  const data = await res.json()
  return { sonuclar: data.results || [], toplamSayfa: Math.min(data.total_pages || 1, 500), toplamSonuc: data.total_results || 0 }
}

// Bir alt türün ("Folk Horror" gibi) "Tümünü Gör" linkinin gittiği sayfa —
// SinemaAnaTuruDetay'daki yatay şerit sadece ilk 12'yi gösteriyordu; burada
// TMDB'nin gerçekten kaç sonucu olduğu görülüyor, "Daha Fazla Yükle" ile
// sayfa sayfa devam ediliyor (diğer keşif sayfalarındaki aynı desen).
export default function SinemaAltTuruListesi() {
  const { anaTurId, altTurId } = useParams()
  const [aramaParametreleri, setAramaParametreleri] = useSearchParams()
  const mod = aramaParametreleri.get('mod') || 'sinema'
  const bulunan = altTurBul(anaTurId, altTurId)

  const [sonuclar, setSonuclar] = useState(null)
  const [sayfa, setSayfa] = useState(1)
  const [toplamSayfa, setToplamSayfa] = useState(1)
  const [toplamSonuc, setToplamSonuc] = useState(0)
  const [dahaFazlaYukleniyor, setDahaFazlaYukleniyor] = useState(false)

  const tmdbTurId = bulunan ? (mod === 'sinema' ? bulunan.anaTur.tmdbFilmTurId : bulunan.anaTur.tmdbDiziTurId) : null

  useEffect(() => {
    if (!bulunan || !TMDB_API_KEY) return
    setSonuclar(null)
    setSayfa(1)
    sayfaGetir({ uc: mod === 'sinema' ? 'movie' : 'tv', tmdbTurId, anahtarKelimeIdleri: bulunan.altTur.anahtarKelimeIdleri, sayfa: 1 }).then(
      ({ sonuclar, toplamSayfa, toplamSonuc }) => {
        setSonuclar(sonuclar)
        setToplamSayfa(toplamSayfa)
        setToplamSonuc(toplamSonuc)
      }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anaTurId, altTurId, mod])

  async function dahaFazlaYukle() {
    setDahaFazlaYukleniyor(true)
    try {
      const yeniSayfa = sayfa + 1
      const { sonuclar: yeniSonuclar } = await sayfaGetir({
        uc: mod === 'sinema' ? 'movie' : 'tv',
        tmdbTurId,
        anahtarKelimeIdleri: bulunan.altTur.anahtarKelimeIdleri,
        sayfa: yeniSayfa,
      })
      setSonuclar((onceki) => [...onceki, ...yeniSonuclar])
      setSayfa(yeniSayfa)
    } finally {
      setDahaFazlaYukleniyor(false)
    }
  }

  if (!bulunan) {
    return (
      <div>
        <Link to="/sinema-turleri" className="text-xs text-kraft hover:text-deniz">
          ← Sinemasal Alt Türler
        </Link>
        <p className="mt-4 text-sm text-kraft">Bu alt tür bulunamadı.</p>
      </div>
    )
  }

  const { anaTur, altTur } = bulunan

  return (
    <div>
      <Link to={`/sinema-turu/${anaTurId}?mod=${mod}`} className="text-xs text-kraft hover:text-deniz">
        ← {anaTur.ikon} {anaTur.ad}
      </Link>
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">
        {altTur.ikon} {altTur.ad}
      </h1>
      {sonuclar && <p className="mb-6 text-sm text-kraft">Toplam {toplamSonuc} sonuç, en popülerden başlayarak.</p>}

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setAramaParametreleri({ mod: 'sinema' })}
          className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
            mod === 'sinema' ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagitKoyu text-kraft ring-cizgi'
          }`}
        >
          🎬 Film
        </button>
        <button
          onClick={() => setAramaParametreleri({ mod: 'dizi' })}
          className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
            mod === 'dizi' ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagitKoyu text-kraft ring-cizgi'
          }`}
        >
          📺 Dizi
        </button>
      </div>

      {sonuclar === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {sonuclar !== null && sonuclar.length === 0 && <p className="text-sm text-kraft">Bu alt türde sonuç bulunamadı.</p>}

      {sonuclar && sonuclar.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {sonuclar.map((item) => (
              <Link key={item.id} to={`/${mod === 'sinema' ? 'film' : 'dizi'}/${item.id}`}>
                <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                  {item.poster_path ? (
                    <img src={`${TMDB_POSTER}${item.poster_path}`} alt={item.title || item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">🎬</div>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-murekkep">{item.title || item.name}</p>
              </Link>
            ))}
          </div>
          {sayfa < toplamSayfa && (
            <button
              onClick={dahaFazlaYukle}
              disabled={dahaFazlaYukleniyor}
              className="mt-4 rounded-sm bg-kagitKoyu px-4 py-2 font-govde text-xs text-kraft ring-1 ring-cizgi hover:text-murekkep disabled:opacity-40"
            >
              {dahaFazlaYukleniyor ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

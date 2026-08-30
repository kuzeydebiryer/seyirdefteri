import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w342'

// TurSayfasi.jsx'in ("/tur/:tur/:turId") ülke/dil/yıl için genelleştirilmiş
// hali — film/dizi sayfasındaki 🌍 Ülke, 🗣️ Dil, (Yıl) rozetlerinin gittiği
// yer. Hangi filtrenin uygulanacağı query parametresinden anlaşılıyor
// (ulke=US, dil=en ya da yil=2019 — sadece biri gelir).
export default function KesfetFiltre() {
  const { tur } = useParams() // 'sinema' | 'dizi'
  const [aramaParametreleri] = useSearchParams()
  const ulke = aramaParametreleri.get('ulke')
  const dil = aramaParametreleri.get('dil')
  const yil = aramaParametreleri.get('yil')
  const ad = aramaParametreleri.get('ad') || ''

  const [sonuclar, setSonuclar] = useState([])
  const [sayfa, setSayfa] = useState(1)
  const [toplamSayfa, setToplamSayfa] = useState(1)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')

  const tmdbTuru = tur === 'dizi' ? 'tv' : 'movie'

  async function sayfaGetir(hedefSayfa) {
    if (!TMDB_API_KEY) {
      setHata('TMDB API anahtarı tanımlı değil.')
      setYukleniyor(false)
      return
    }
    setYukleniyor(true)
    try {
      const parcalar = [`api_key=${TMDB_API_KEY}`, 'language=tr-TR', 'sort_by=popularity.desc', `page=${hedefSayfa}`]
      if (ulke) parcalar.push(`with_origin_country=${ulke}`)
      if (dil) parcalar.push(`with_original_language=${dil}`)
      if (yil) parcalar.push(tur === 'dizi' ? `first_air_date_year=${yil}` : `primary_release_year=${yil}`)
      const url = `https://api.themoviedb.org/3/discover/${tmdbTuru}?${parcalar.join('&')}`
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.status_message || `HTTP ${res.status}`)
      setSonuclar((onceki) => (hedefSayfa === 1 ? data.results : [...onceki, ...data.results]))
      setToplamSayfa(data.total_pages || 1)
      setSayfa(hedefSayfa)
    } catch (err) {
      setHata('Yüklenirken hata oluştu: ' + err.message)
    } finally {
      setYukleniyor(false)
    }
  }

  useEffect(() => {
    setSonuclar([])
    sayfaGetir(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tur, ulke, dil, yil])

  const baslik = yil ? yil : ad || ulke || dil || 'Keşfet'
  const aciklama = ulke ? '🌍 Ülke' : dil ? '🗣️ Dil' : yil ? '📅 Yıl' : ''

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep mb-1">{baslik}</h1>
      <p className="mb-6 text-sm text-kraft">
        {aciklama} · {tur === 'dizi' ? 'Diziler' : 'Filmler'} · TMDB'den popülerlik sırasıyla
      </p>

      {hata && <p className="text-sm text-muhur">{hata}</p>}
      {yukleniyor && sonuclar.length === 0 && <p className="text-sm text-kraft">Yükleniyor...</p>}

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {sonuclar.map((s) => (
          <Link key={s.id} to={`/${tur === 'dizi' ? 'dizi' : 'film'}/${s.id}`} className="block">
            <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
              {s.poster_path && (
                <img src={`${TMDB_POSTER}${s.poster_path}`} alt={s.title || s.name} loading="lazy" className="h-full w-full object-cover" />
              )}
            </div>
            <p className="mt-1 truncate text-xs text-murekkep">{s.title || s.name}</p>
          </Link>
        ))}
      </div>

      {!yukleniyor && sayfa < toplamSayfa && (
        <button
          onClick={() => sayfaGetir(sayfa + 1)}
          className="mt-6 rounded-sm bg-kagitKoyu px-4 py-2 font-govde text-sm text-kraft ring-1 ring-cizgi hover:text-murekkep"
        >
          Daha Fazla Göster
        </button>
      )}
      {yukleniyor && sonuclar.length > 0 && <p className="mt-4 text-sm text-kraft">Yükleniyor...</p>}
    </div>
  )
}

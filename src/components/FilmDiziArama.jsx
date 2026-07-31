import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w342'

const ULKELER = [
  { kod: '', ad: 'Tümü' },
  { kod: 'TR', ad: 'Türkiye' },
  { kod: 'US', ad: 'ABD' },
  { kod: 'GB', ad: 'İngiltere' },
  { kod: 'FR', ad: 'Fransa' },
  { kod: 'DE', ad: 'Almanya' },
  { kod: 'IT', ad: 'İtalya' },
  { kod: 'ES', ad: 'İspanya' },
  { kod: 'JP', ad: 'Japonya' },
  { kod: 'KR', ad: 'Güney Kore' },
]

const SIRALAMALAR = [
  { deger: 'popularity.desc', etiket: 'Popülerlik' },
  { deger: 'vote_average.desc', etiket: 'Puan (yüksekten)' },
  { deger: 'primary_release_date.desc', etiket: 'Tarih (yeniden)' },
  { deger: 'vote_count.desc', etiket: 'Oy sayısı' },
]

export default function FilmDiziArama({ tur }) {
  const uc = tur === 'sinema' ? 'movie' : 'tv'
  const [mod, setMod] = useState('ara') // 'ara' | 'filtrele'

  const [arama, setArama] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [aramaYapildi, setAramaYapildi] = useState(false)

  const [turler, setTurler] = useState([])
  const [seciliTur, setSeciliTur] = useState('')
  const [yilBaslangic, setYilBaslangic] = useState('')
  const [yilBitis, setYilBitis] = useState('')
  const [minPuan, setMinPuan] = useState('')
  const [ulke, setUlke] = useState('')
  const [siralama, setSiralama] = useState('popularity.desc')

  useEffect(() => {
    if (!TMDB_API_KEY) return
    fetch(`https://api.themoviedb.org/3/genre/${uc}/list?api_key=${TMDB_API_KEY}&language=tr-TR`)
      .then((res) => res.json())
      .then((data) => setTurler(data.genres || []))
      .catch(() => {})
  }, [uc])

  async function isimleAra(e) {
    e.preventDefault()
    if (!arama.trim() || !TMDB_API_KEY) return
    setYukleniyor(true)
    setAramaYapildi(true)
    try {
      const url = `https://api.themoviedb.org/3/search/${uc}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(arama)}`
      const res = await fetch(url)
      const data = await res.json()
      setSonuclar(data.results || [])
    } finally {
      setYukleniyor(false)
    }
  }

  async function filtreUygula(e) {
    e.preventDefault()
    if (!TMDB_API_KEY) return
    setYukleniyor(true)
    setAramaYapildi(true)
    try {
      const tarihAlani = tur === 'sinema' ? 'primary_release_date' : 'first_air_date'
      const parcalar = [`api_key=${TMDB_API_KEY}`, 'language=tr-TR', `sort_by=${siralama}`]
      if (seciliTur) parcalar.push(`with_genres=${seciliTur}`)
      if (yilBaslangic) parcalar.push(`${tarihAlani}.gte=${yilBaslangic}-01-01`)
      if (yilBitis) parcalar.push(`${tarihAlani}.lte=${yilBitis}-12-31`)
      if (minPuan) parcalar.push(`vote_average.gte=${minPuan}`, 'vote_count.gte=20')
      if (ulke) parcalar.push(`with_origin_country=${ulke}`)
      const url = `https://api.themoviedb.org/3/discover/${uc}?${parcalar.join('&')}`
      const res = await fetch(url)
      const data = await res.json()
      setSonuclar(data.results || [])
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <div className="mb-10 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setMod('ara')}
          className={`rounded-sm px-3 py-1 font-govde text-xs ${mod === 'ara' ? 'bg-murekkep text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
        >
          İsimle Ara
        </button>
        <button
          onClick={() => setMod('filtrele')}
          className={`rounded-sm px-3 py-1 font-govde text-xs ${mod === 'filtrele' ? 'bg-murekkep text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
        >
          Filtrele
        </button>
      </div>

      {mod === 'ara' ? (
        <form onSubmit={isimleAra} className="flex gap-2">
          <input
            type="text"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder={tur === 'sinema' ? 'Film adı ara...' : 'Dizi adı ara...'}
            className="flex-1 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
          <button type="submit" className="rounded-sm bg-deniz px-4 py-2 font-govde text-xs text-kagit">
            {yukleniyor ? 'Aranıyor...' : 'Ara'}
          </button>
        </form>
      ) : (
        <form onSubmit={filtreUygula} className="space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select value={seciliTur} onChange={(e) => setSeciliTur(e.target.value)} className="rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi">
              <option value="">Tür (tümü)</option>
              {turler.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select value={ulke} onChange={(e) => setUlke(e.target.value)} className="rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi">
              {ULKELER.map((u) => (
                <option key={u.kod} value={u.kod}>
                  {u.ad}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={yilBaslangic}
              onChange={(e) => setYilBaslangic(e.target.value)}
              placeholder="Yıl (min)"
              className="rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
            />
            <input
              type="number"
              value={yilBitis}
              onChange={(e) => setYilBitis(e.target.value)}
              placeholder="Yıl (max)"
              className="rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
            />
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={minPuan}
              onChange={(e) => setMinPuan(e.target.value)}
              placeholder="Min TMDB puanı"
              className="rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
            />
            <select value={siralama} onChange={(e) => setSiralama(e.target.value)} className="rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi">
              {SIRALAMALAR.map((s) => (
                <option key={s.deger} value={s.deger}>
                  {s.etiket}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-kraft">
            Not: Puan, TMDB'nin kendi kullanıcı puanı (IMDb değil).
          </p>
          <button type="submit" className="rounded-sm bg-deniz px-4 py-2 font-govde text-xs text-kagit">
            {yukleniyor ? 'Filtreleniyor...' : 'Uygula'}
          </button>
        </form>
      )}

      {aramaYapildi && (
        <div className="mt-4">
          {sonuclar.length === 0 && !yukleniyor && <p className="text-sm text-kraft">Sonuç bulunamadı.</p>}
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {sonuclar.slice(0, 18).map((item) => (
              <Link key={item.id} to={`/${uc === 'movie' ? 'film' : 'dizi'}/${item.id}`} className="block">
                <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                  {item.poster_path && (
                    <img
                      src={`${TMDB_POSTER}${item.poster_path}`}
                      alt={item.title || item.name}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-murekkep">{item.title || item.name}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

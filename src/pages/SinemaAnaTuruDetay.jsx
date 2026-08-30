import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { anaTurGetir, altTurleriGetir } from '../utils/sinemaTurleri.js'
import YatayKaydirma from '../components/YatayKaydirma.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w300'

// Tek bir alt türün (ör. "Folk Horror") sonuçlarını çeken ve yatay bir
// şerit olarak gösteren alt bileşen. tmdbTurId null ise (dizi türlerinde
// Korku diye bir TMDB kategorisi olmadığı için) tür kısıtı hiç eklenmiyor,
// sadece anahtar kelime yeterli oluyor. anahtarKelimeIdleri artık Firestore
// belgesindeki anahtarKelimeler dizisinden (her biri {id, ad}) çıkarılıyor.
function AltTurSeridi({ anaTurId, altTur, tmdbTurId, mod }) {
  const [sonuclar, setSonuclar] = useState(null)
  const anahtarKelimeIdleri = altTur.anahtarKelimeler.map((k) => k.id)

  useEffect(() => {
    if (!TMDB_API_KEY) return
    setSonuclar(null)
    const uc = mod === 'sinema' ? 'movie' : 'tv'
    const parcalar = [`api_key=${TMDB_API_KEY}`, 'language=tr-TR', 'sort_by=popularity.desc', `with_keywords=${anahtarKelimeIdleri.join('|')}`]
    if (tmdbTurId) parcalar.push(`with_genres=${tmdbTurId}`)
    fetch(`https://api.themoviedb.org/3/discover/${uc}?${parcalar.join('&')}`)
      .then((r) => r.json())
      .then((data) => setSonuclar(data.results || []))
      .catch(() => setSonuclar([]))
  }, [altTur, tmdbTurId, mod])

  if (sonuclar !== null && sonuclar.length === 0) return null

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">
          {altTur.ikon} {altTur.ad}
        </h2>
        <Link
          to={`/sinema-turu/${anaTurId}/${altTur.id}?mod=${mod}`}
          className="shrink-0 whitespace-nowrap text-sm text-kraft hover:text-deniz"
        >
          Tümünü Gör ›
        </Link>
      </div>
      {sonuclar === null ? (
        <p className="text-sm text-kraft">Yükleniyor...</p>
      ) : (
        <YatayKaydirma>
          {sonuclar.slice(0, 12).map((item) => (
            <Link key={item.id} to={`/${mod === 'sinema' ? 'film' : 'dizi'}/${item.id}`} className="shrink-0" style={{ width: 120 }}>
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
        </YatayKaydirma>
      )}
    </div>
  )
}

// Platformlar/PlatformDetay ile aynı desen — hub'dan (SinemaAltTurleri.jsx)
// gelinen, tek bir ana türün (ör. Korku Sineması) tüm alt türlerini yatay
// şeritler halinde gösteren sayfa. Film/Dizi sekmesi tüm şeritleri birden
// etkiliyor. Artık Firestore'dan okunuyor (bkz. utils/sinemaTurleri.js).
export default function SinemaAnaTuruDetay() {
  const { anaTurId } = useParams()
  const [aramaParametreleri, setAramaParametreleri] = useSearchParams()
  const mod = aramaParametreleri.get('mod') || 'sinema'
  const [anaTur, setAnaTur] = useState(undefined) // undefined: yükleniyor, null: bulunamadı
  const [altTurler, setAltTurler] = useState(null)

  useEffect(() => {
    anaTurGetir(anaTurId).then(setAnaTur)
    altTurleriGetir(anaTurId).then(setAltTurler)
  }, [anaTurId])

  if (anaTur === undefined) return <p className="text-sm text-kraft">Yükleniyor...</p>

  if (!anaTur) {
    return (
      <div>
        <Link to="/sinema-turleri" className="text-xs text-kraft hover:text-deniz">
          ← Sinemasal Alt Türler
        </Link>
        <p className="mt-4 text-sm text-kraft">Bu ana tür bulunamadı.</p>
      </div>
    )
  }

  const tmdbTurId = mod === 'sinema' ? anaTur.tmdbFilmTurId : anaTur.tmdbDiziTurId

  return (
    <div>
      <Link to="/sinema-turleri" className="text-xs text-kraft hover:text-deniz">
        ← Sinemasal Alt Türler
      </Link>
      <h1 className="mt-1 mb-6 font-baslik text-2xl text-murekkep">
        {anaTur.ikon} {anaTur.ad}
      </h1>

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

      {altTurler === null && <p className="text-sm text-kraft">Alt türler yükleniyor...</p>}
      {altTurler !== null && altTurler.length === 0 && <p className="text-sm text-kraft">Bu ana türe henüz alt tür eklenmemiş.</p>}
      {altTurler?.map((altTur) => (
        <AltTurSeridi key={altTur.id} anaTurId={anaTurId} altTur={altTur} tmdbTurId={tmdbTurId} mod={mod} />
      ))}
    </div>
  )
}

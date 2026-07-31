import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useIlgiliKitaplar } from '../hooks/useIlgiliKitaplar.js'
import { ilgiliKitapEkle, ilgiliKitapSil, yonetmenSil } from '../utils/yonetmen.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w342'
const TMDB_PROFIL = 'https://image.tmdb.org/t/p/w300'
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

export default function YonetmenSayfasi() {
  const { id } = useParams()
  const { kullanici } = useAuth()
  const [kisi, setKisi] = useState(null)
  const [filmografi, setFilmografi] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')

  const { kitaplar, yenidenYukle: kitaplariYenile } = useIlgiliKitaplar(id)
  const [kitapFormuAcik, setKitapFormuAcik] = useState(false)
  const [kitapArama, setKitapArama] = useState('')
  const [kitapSonuclari, setKitapSonuclari] = useState([])

  useEffect(() => {
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      setHata('')
      try {
        if (!TMDB_API_KEY) throw new Error('TMDB API anahtarı tanımlı değil.')

        const kisiUrl = `https://api.themoviedb.org/3/person/${id}?api_key=${TMDB_API_KEY}&language=tr-TR`
        const kisiRes = await fetch(kisiUrl)
        const kisiData = await kisiRes.json()
        if (!kisiRes.ok) throw new Error(kisiData.status_message || `HTTP ${kisiRes.status}`)
        if (!kisiData.biography) {
          try {
            const enRes = await fetch(`https://api.themoviedb.org/3/person/${id}?api_key=${TMDB_API_KEY}&language=en-US`)
            const enData = await enRes.json()
            if (enData.biography) kisiData.biography = enData.biography
          } catch {
            // sessizce geç
          }
        }
        if (iptal) return
        setKisi(kisiData)

        const krediUrl = `https://api.themoviedb.org/3/person/${id}/combined_credits?api_key=${TMDB_API_KEY}&language=tr-TR`
        const krediRes = await fetch(krediUrl)
        const krediData = await krediRes.json()
        if (iptal) return

        const yonetmenlik = (krediData.crew || [])
          .filter((k) => k.job === 'Director' || k.job === 'Creator')
          .sort((a, b) => (b.release_date || b.first_air_date || '').localeCompare(a.release_date || a.first_air_date || ''))
        const gorulen = new Set()
        setFilmografi(
          yonetmenlik.filter((k) => {
            if (gorulen.has(k.id)) return false
            gorulen.add(k.id)
            return true
          })
        )
      } catch (err) {
        if (!iptal) setHata(err.message)
      } finally {
        if (!iptal) setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [id])

  async function kitapAra(e) {
    e.preventDefault()
    if (!kitapArama.trim()) return
    const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(kitapArama)}&maxResults=8${anahtarParcasi}`
    const res = await fetch(url)
    const data = await res.json()
    setKitapSonuclari(data.items || [])
  }

  async function kitapSec(item) {
    const v = item.volumeInfo || {}
    await ilgiliKitapEkle(id, {
      googleBooksId: item.id,
      baslik: v.title || '',
      yazar: (v.authors || []).join(', '),
      posterUrl: (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://'),
      kullanici,
    })
    setKitapSonuclari([])
    setKitapArama('')
    setKitapFormuAcik(false)
    kitaplariYenile()
  }

  async function kitabiSil(kitapId) {
    await ilgiliKitapSil(id, kitapId)
    kitaplariYenile()
  }

  if (yukleniyor) return <p className="text-sm text-kraft">Yükleniyor...</p>
  if (hata) return <p className="text-sm text-muhur">Bilgi alınamadı: {hata}</p>
  if (!kisi) return <p className="text-sm text-kraft">Bulunamadı.</p>

  return (
    <div>
      <div className="flex gap-5">
        {kisi.profile_path && (
          <img
            src={`${TMDB_PROFIL}${kisi.profile_path}`}
            alt={kisi.name}
            className="h-40 w-28 shrink-0 rounded-sm object-cover ring-1 ring-cizgi"
          />
        )}
        <div>
          <span className="rounded-full bg-kagitKoyu px-2 py-0.5 text-[10px] uppercase tracking-wide text-kraft ring-1 ring-cizgi">
            Yönetmen
          </span>
          <h1 className="font-baslik text-2xl text-murekkep mt-1">{kisi.name}</h1>
          {kisi.biography && <p className="mt-2 text-sm text-murekkep leading-relaxed line-clamp-6">{kisi.biography}</p>}
        </div>
      </div>

      <div className="defter-cizgi my-6" />

      <h2 className="font-baslik text-lg text-murekkep mb-3">Yönetmenlik Filmografisi</h2>
      {filmografi.length === 0 ? (
        <p className="text-sm text-kraft">Kayıt yok.</p>
      ) : (
        <div className="mb-8 grid grid-cols-4 gap-3 sm:grid-cols-6">
          {filmografi.slice(0, 24).map((is) => {
            const tur = is.media_type === 'tv' ? 'dizi' : 'sinema'
            const baslik = is.title || is.name
            const yil = (is.release_date || is.first_air_date || '').slice(0, 4)
            return (
              <Link key={`${is.credit_id}-${is.id}`} to={`/${tur === 'dizi' ? 'dizi' : 'film'}/${is.id}`} className="block">
                <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                  {is.poster_path && <img src={`${TMDB_POSTER}${is.poster_path}`} alt={baslik} className="h-full w-full object-cover" />}
                </div>
                <p className="mt-1 truncate text-xs text-murekkep">{baslik}</p>
                {yil && <p className="text-[11px] text-kraft">{yil}</p>}
              </Link>
            )
          })}
        </div>
      )}

      <div className="defter-cizgi my-6" />

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">İlgili Kitaplar</h2>
        {kullanici && (
          <button
            onClick={() => setKitapFormuAcik((a) => !a)}
            className="rounded-sm bg-kagitKoyu px-3 py-1 font-govde text-xs text-kraft ring-1 ring-cizgi"
          >
            {kitapFormuAcik ? 'Vazgeç' : '+ Kitap Ekle'}
          </button>
        )}
      </div>

      {kitapFormuAcik && (
        <div className="mb-4 space-y-2 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <form onSubmit={kitapAra} className="flex gap-2">
            <input
              type="text"
              value={kitapArama}
              onChange={(e) => setKitapArama(e.target.value)}
              placeholder="Kitap ara..."
              className="flex-1 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
            <button type="submit" className="rounded-sm bg-deniz px-3 py-2 text-xs text-kagit">
              Ara
            </button>
          </form>
          {kitapSonuclari.length > 0 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {kitapSonuclari.map((item) => {
                const url = (item.volumeInfo?.imageLinks?.thumbnail || '').replace('http://', 'https://')
                return (
                  <button key={item.id} type="button" onClick={() => kitapSec(item)} className="text-left">
                    <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <p className="mt-1 truncate text-[11px] text-murekkep">{item.volumeInfo?.title}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {kitaplar.length === 0 ? (
        <p className="text-sm text-kraft">Henüz ilgili kitap eklenmedi.</p>
      ) : (
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-6">
          {kitaplar.map((k) => (
            <div key={k.id} className="relative">
              <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                {k.posterUrl && <img src={k.posterUrl} alt={k.baslik} className="h-full w-full object-cover" />}
              </div>
              <p className="mt-1 truncate text-xs text-murekkep">{k.baslik}</p>
              <p className="truncate text-[11px] text-kraft">{k.yazar}</p>
              {kullanici?.uid === k.ekleyenId && (
                <button
                  onClick={() => kitabiSil(k.id)}
                  className="absolute right-1 top-1 rounded-full bg-kagit/90 px-1.5 py-0.5 text-[10px] text-kraft ring-1 ring-cizgi hover:text-muhur"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

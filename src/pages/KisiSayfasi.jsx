import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w342'
const TMDB_PROFIL = 'https://image.tmdb.org/t/p/w300'

export default function KisiSayfasi() {
  const { id } = useParams()
  const [kisi, setKisi] = useState(null)
  const [yonetmenIsleri, setYonetmenIsleri] = useState([])
  const [oyunculukIsleri, setOyunculukIsleri] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')

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
        if (iptal) return
        setKisi(kisiData)

        const krediUrl = `https://api.themoviedb.org/3/person/${id}/combined_credits?api_key=${TMDB_API_KEY}&language=tr-TR`
        const krediRes = await fetch(krediUrl)
        const krediData = await krediRes.json()
        if (iptal) return

        const yonetmenlik = (krediData.crew || [])
          .filter((k) => k.job === 'Director' || k.job === 'Creator')
          .sort((a, b) => (b.release_date || b.first_air_date || '').localeCompare(a.release_date || a.first_air_date || ''))
        const oyunculuk = (krediData.cast || []).sort((a, b) =>
          (b.release_date || b.first_air_date || '').localeCompare(a.release_date || a.first_air_date || '')
        )

        // Aynı işten birden fazla kredi (örn. hem yönetmen hem yazar) varsa tekilleştir
        const tekillestir = (liste) => {
          const gorulen = new Set()
          return liste.filter((k) => {
            if (gorulen.has(k.id)) return false
            gorulen.add(k.id)
            return true
          })
        }

        setYonetmenIsleri(tekillestir(yonetmenlik))
        setOyunculukIsleri(tekillestir(oyunculuk))
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

  if (yukleniyor) return <p className="text-sm text-kraft">Yükleniyor...</p>
  if (hata) return <p className="text-sm text-muhur">Bilgi alınamadı: {hata}</p>
  if (!kisi) return <p className="text-sm text-kraft">Bulunamadı.</p>

  function IsGrid({ isler }) {
    if (isler.length === 0) return <p className="text-sm text-kraft">Kayıt yok.</p>
    return (
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
        {isler.slice(0, 24).map((is) => {
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
    )
  }

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
          <h1 className="font-baslik text-2xl text-murekkep">{kisi.name}</h1>
          {kisi.known_for_department && <p className="text-xs text-kraft">{kisi.known_for_department}</p>}
          {kisi.biography && <p className="mt-2 text-sm text-murekkep leading-relaxed line-clamp-6">{kisi.biography}</p>}
        </div>
      </div>

      <div className="defter-cizgi my-6" />

      {yonetmenIsleri.length > 0 && (
        <div className="mb-8">
          <h2 className="font-baslik text-lg text-murekkep mb-3">Yönetmenliğini Yaptıkları</h2>
          <IsGrid isler={yonetmenIsleri} />
        </div>
      )}

      <div className="mb-8">
        <h2 className="font-baslik text-lg text-murekkep mb-3">Oyunculuk Yaptıkları</h2>
        <IsGrid isler={oyunculukIsleri} />
      </div>
    </div>
  )
}

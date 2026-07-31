import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { topluluktaPopulerEserler } from '../hooks/useEser.js'
import { useTavsiyeler } from '../hooks/useTavsiyeler.js'
import { useHaberler } from '../hooks/useHaberler.js'
import YildizPuan from '../components/YildizPuan.jsx'
import TavsiyeBolumu from '../components/TavsiyeBolumu.jsx'
import HaberBolumu from '../components/HaberBolumu.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'

export default function Filmler() {
  const [topluluk, setTopluluk] = useState([])
  const [populer, setPopuler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const { tavsiyeler, yenidenYukle: tavsiyeleriYenile } = useTavsiyeler('sinema')
  const { haberler, yenidenYukle: haberleriYenile } = useHaberler('sinema')

  useEffect(() => {
    let iptal = false
    async function getir() {
      const topluluktakiler = await topluluktaPopulerEserler('sinema')
      if (!iptal) setTopluluk(topluluktakiler)

      if (TMDB_API_KEY) {
        try {
          const url = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=tr-TR&page=1`
          const res = await fetch(url)
          const data = await res.json()
          if (!iptal) setPopuler((data.results || []).slice(0, 12))
        } catch (e) {
          console.warn('TMDB popüler film listesi alınamadı:', e.message)
        }
      }
      if (!iptal) setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [])

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep mb-6">Film</h1>

      <TavsiyeBolumu tur="sinema" tavsiyeler={tavsiyeler} yenidenYukle={tavsiyeleriYenile} />
      <HaberBolumu kategori="sinema" haberler={haberler} yenidenYukle={haberleriYenile} />

      <h2 className="font-baslik text-lg text-murekkep mb-3">Bizim Aramızda Popüler</h2>
      {yukleniyor && <p className="text-sm text-kraft mb-6">Yükleniyor...</p>}
      {!yukleniyor && topluluk.length === 0 && (
        <p className="text-sm text-kraft mb-6">Henüz kimse film paylaşmadı.</p>
      )}
      <div className="mb-10 grid grid-cols-3 gap-4 sm:grid-cols-6">
        {topluluk.map((f) => (
          <Link key={f.id} to={`/film/${f.id}`} className="block">
            <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
              {f.posterUrl && <img src={f.posterUrl} alt={f.baslik} className="h-full w-full object-cover" />}
            </div>
            <p className="mt-1 truncate text-xs text-murekkep">{f.baslik}</p>
            {f.ortalamaPuan != null && <YildizPuan puan={Math.round(f.ortalamaPuan * 2) / 2} boyut="text-[10px]" onluGoster={false} />}
          </Link>
        ))}
      </div>

      {populer.length > 0 && (
        <>
          <h2 className="font-baslik text-lg text-murekkep mb-3">TMDB'de Şu An Popüler</h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {populer.map((f) => (
              <Link key={f.id} to={`/film/${f.id}`} className="block">
                <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                  {f.poster_path && (
                    <img src={`${TMDB_POSTER}${f.poster_path}`} alt={f.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-murekkep">{f.title}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

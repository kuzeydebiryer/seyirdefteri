import { useEffect, useState } from 'react'
import { topluluktaPopulerEserler } from '../hooks/useEser.js'
import { useTavsiyeler } from '../hooks/useTavsiyeler.js'
import { useHaberler } from '../hooks/useHaberler.js'
import TavsiyeBolumu from '../components/TavsiyeBolumu.jsx'
import HaberBolumu from '../components/HaberBolumu.jsx'
import ListelerBolumu from '../components/ListelerBolumu.jsx'
import FilmDiziArama from '../components/FilmDiziArama.jsx'
import EserKarti from '../components/EserKarti.jsx'
import IlhamPanosuOnizleme from '../components/IlhamPanosuOnizleme.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'

export default function Diziler() {
  const [topluluk, setTopluluk] = useState([])
  const [populer, setPopuler] = useState([])
  const [yayinda, setYayinda] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const { tavsiyeler, yenidenYukle: tavsiyeleriYenile } = useTavsiyeler('dizi')
  const { haberler, yenidenYukle: haberleriYenile } = useHaberler('dizi')

  useEffect(() => {
    let iptal = false
    async function getir() {
      const topluluktakiler = await topluluktaPopulerEserler('dizi')
      if (!iptal) setTopluluk(topluluktakiler)

      if (TMDB_API_KEY) {
        try {
          const [populerRes, yayindaRes] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_API_KEY}&language=tr-TR&page=1`),
            // Film tarafındaki "Vizyonda"nın dizi karşılığı — TMDB'nin
            // "şu an yayında olan diziler" uç noktası.
            fetch(`https://api.themoviedb.org/3/tv/on_the_air?api_key=${TMDB_API_KEY}&language=tr-TR&page=1`),
          ])
          const [populerData, yayindaData] = await Promise.all([populerRes.json(), yayindaRes.json()])
          if (!iptal) {
            setPopuler((populerData.results || []).slice(0, 12))
            setYayinda((yayindaData.results || []).slice(0, 12))
          }
        } catch (e) {
          console.warn('TMDB dizi listeleri alınamadı:', e.message)
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
      <h1 className="font-baslik text-2xl text-murekkep mb-6">Dizi</h1>

      <FilmDiziArama tur="dizi" />

      <TavsiyeBolumu tur="dizi" tavsiyeler={tavsiyeler} yenidenYukle={tavsiyeleriYenile} />
      <IlhamPanosuOnizleme kategori="Dizi" />
      <HaberBolumu kategori="dizi" haberler={haberler} yenidenYukle={haberleriYenile} />
      <ListelerBolumu tur="dizi" />

      {yayinda.length > 0 && (
        <div className="mb-10">
          <h2 className="font-baslik text-lg text-murekkep mb-3">Şu An Yayında</h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {yayinda.map((d) => (
              <EserKarti
                key={d.id}
                id={d.id}
                tur="dizi"
                baslik={d.name}
                posterUrl={d.poster_path ? `${TMDB_POSTER}${d.poster_path}` : ''}
                yil={d.first_air_date?.slice(0, 4)}
                puan={d.vote_average}
              />
            ))}
          </div>
        </div>
      )}

      <h2 className="font-baslik text-lg text-murekkep mb-3">Bizim Aramızda Popüler</h2>
      {yukleniyor && <p className="text-sm text-kraft mb-6">Yükleniyor...</p>}
      {!yukleniyor && topluluk.length === 0 && (
        <p className="text-sm text-kraft mb-6">Henüz kimse dizi paylaşmadı.</p>
      )}
      <div className="mb-10 grid grid-cols-3 gap-4 sm:grid-cols-6">
        {topluluk.map((d) => (
          <EserKarti key={d.id} id={d.id} tur="dizi" baslik={d.baslik} posterUrl={d.posterUrl} puan={d.ortalamaPuan} />
        ))}
      </div>

      {populer.length > 0 && (
        <>
          <h2 className="font-baslik text-lg text-murekkep mb-3">TMDB'de Şu An Popüler</h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {populer.map((d) => (
              <EserKarti
                key={d.id}
                id={d.id}
                tur="dizi"
                baslik={d.name}
                posterUrl={d.poster_path ? `${TMDB_POSTER}${d.poster_path}` : ''}
                yil={d.first_air_date?.slice(0, 4)}
                puan={d.vote_average}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

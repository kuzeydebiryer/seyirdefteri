import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { topluluktaPopulerEserler } from '../hooks/useEser.js'
import { useTavsiyeler } from '../hooks/useTavsiyeler.js'
import { useHaberler } from '../hooks/useHaberler.js'
import TavsiyeBolumu from '../components/TavsiyeBolumu.jsx'
import HaberBolumu from '../components/HaberBolumu.jsx'
import ListelerBolumu from '../components/ListelerBolumu.jsx'
import FilmDiziArama from '../components/FilmDiziArama.jsx'
import EserKarti from '../components/EserKarti.jsx'
import BegenilenMuziklerBolumu from '../components/BegenilenMuziklerBolumu.jsx'
import IlhamPanosuOnizleme from '../components/IlhamPanosuOnizleme.jsx'
import SinemaOyunlariBolumu from '../components/SinemaOyunlariBolumu.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'

function FilmGrid({ filmler, vizyonTarihiGoster }) {
  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
      {filmler.map((f) => (
        <EserKarti
          key={f.id}
          id={f.id}
          tur="sinema"
          baslik={f.title}
          posterUrl={f.poster_path ? `${TMDB_POSTER}${f.poster_path}` : ''}
          yil={f.release_date?.slice(0, 4)}
          puan={f.vote_average}
          vizyonTarihi={vizyonTarihiGoster ? f.release_date : null}
        />
      ))}
    </div>
  )
}

export default function Filmler() {
  const [topluluk, setTopluluk] = useState([])
  const [populer, setPopuler] = useState([])
  const [vizyondakiler, setVizyondakiler] = useState([])
  const [yakinda, setYakinda] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const { tavsiyeler, yenidenYukle: tavsiyeleriYenile } = useTavsiyeler('sinema')
  const { tavsiyeler: yeniGelenFilmler, yenidenYukle: yeniGelenFilmleriYenile } = useTavsiyeler('sinema', 'yeniGelenFilmler')
  const { haberler, yenidenYukle: haberleriYenile } = useHaberler('sinema')

  useEffect(() => {
    let iptal = false
    async function getir() {
      const topluluktakiler = await topluluktaPopulerEserler('sinema')
      if (!iptal) setTopluluk(topluluktakiler)

      if (TMDB_API_KEY) {
        try {
          const [populerRes, vizyonRes, yakindaRes] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=tr-TR&page=1`),
            fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&language=tr-TR&region=TR&page=1`),
            fetch(`https://api.themoviedb.org/3/movie/upcoming?api_key=${TMDB_API_KEY}&language=tr-TR&region=TR&page=1`),
          ])
          const [populerData, vizyonData, yakindaData] = await Promise.all([populerRes.json(), vizyonRes.json(), yakindaRes.json()])
          if (!iptal) {
            setPopuler((populerData.results || []).slice(0, 12))
            setVizyondakiler((vizyonData.results || []).slice(0, 12))
            setYakinda((yakindaData.results || []).slice(0, 12))
          }
        } catch (e) {
          console.warn('TMDB film listeleri alınamadı:', e.message)
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

      <Link
        to="/sinema-turleri"
        className="mb-6 flex items-center gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi transition hover:ring-deniz/50"
      >
        <span className="text-xl">🎭</span>
        <div>
          <p className="text-sm text-murekkep">Sinemasal Alt Türler</p>
          <p className="text-xs text-kraft">Folk Horror, Giallo, Buluntu Film ve daha fazlası →</p>
        </div>
      </Link>

      <FilmDiziArama tur="sinema" />

      <TavsiyeBolumu tur="sinema" tavsiyeler={tavsiyeler} yenidenYukle={tavsiyeleriYenile} />
      <TavsiyeBolumu
        tur="sinema"
        koleksiyon="yeniGelenFilmler"
        tavsiyeler={yeniGelenFilmler}
        yenidenYukle={yeniGelenFilmleriYenile}
        baslik="Yeni Gelen Filmler"
        tumunuGorLink="/yeni-gelen-filmler"
        ekleButonuMetni="+ Film Ekle"
      />
      <BegenilenMuziklerBolumu />
      <SinemaOyunlariBolumu />
      <IlhamPanosuOnizleme kategori="Film" />
      <HaberBolumu kategori="sinema" haberler={haberler} yenidenYukle={haberleriYenile} />
      <ListelerBolumu tur="sinema" />

      {vizyondakiler.length > 0 && (
        <div className="mb-10">
          <h2 className="font-baslik text-lg text-murekkep mb-3">Türkiye'de Vizyonda</h2>
          <FilmGrid filmler={vizyondakiler} />
        </div>
      )}

      {yakinda.length > 0 && (
        <div className="mb-10">
          <h2 className="font-baslik text-lg text-murekkep mb-3">Yakında Vizyonda</h2>
          <FilmGrid filmler={yakinda} vizyonTarihiGoster />
        </div>
      )}

      <h2 className="font-baslik text-lg text-murekkep mb-3">Bizim Aramızda Popüler</h2>
      {yukleniyor && <p className="text-sm text-kraft mb-6">Yükleniyor...</p>}
      {!yukleniyor && topluluk.length === 0 && (
        <p className="text-sm text-kraft mb-6">Henüz kimse film paylaşmadı.</p>
      )}
      <div className="mb-10 grid grid-cols-3 gap-4 sm:grid-cols-6">
        {topluluk.map((f) => (
          <EserKarti key={f.id} id={f.id} tur="sinema" baslik={f.baslik} posterUrl={f.posterUrl} puan={f.ortalamaPuan} />
        ))}
      </div>

      {populer.length > 0 && (
        <>
          <h2 className="font-baslik text-lg text-murekkep mb-3">TMDB'de Şu An Popüler</h2>
          <FilmGrid filmler={populer} />
        </>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { topluluktaPopulerKisiler } from '../hooks/useKisiPopulerlik.js'
import { useHaberler } from '../hooks/useHaberler.js'
import HaberBolumu from '../components/HaberBolumu.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_PROFIL = 'https://image.tmdb.org/t/p/w300'

export default function Oyuncular() {
  const [topluluk, setTopluluk] = useState([])
  const [populer, setPopuler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const { haberler, yenidenYukle: haberleriYenile } = useHaberler('kisi')

  useEffect(() => {
    let iptal = false
    async function getir() {
      const topluluktakiler = await topluluktaPopulerKisiler()
      if (!iptal) setTopluluk(topluluktakiler)

      if (TMDB_API_KEY) {
        try {
          const url = `https://api.themoviedb.org/3/person/popular?api_key=${TMDB_API_KEY}&language=tr-TR&page=1`
          const res = await fetch(url)
          const data = await res.json()
          if (!iptal) setPopuler((data.results || []).slice(0, 12))
        } catch (e) {
          console.warn('TMDB popüler kişi listesi alınamadı:', e.message)
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
      <h1 className="font-baslik text-2xl text-murekkep mb-6">Oyuncular &amp; Yönetmenler</h1>

      <HaberBolumu kategori="kisi" haberler={haberler} yenidenYukle={haberleriYenile} />

      <h2 className="font-baslik text-lg text-murekkep mb-3">Bizim Aramızda Popüler</h2>
      {yukleniyor && <p className="text-sm text-kraft mb-6">Yükleniyor...</p>}
      {!yukleniyor && topluluk.length === 0 && <p className="text-sm text-kraft mb-6">Henüz kimse kimseyi değerlendirmedi.</p>}
      <div className="mb-10 grid grid-cols-4 gap-4 sm:grid-cols-6">
        {topluluk.map((k) => (
          <Link key={k.id} to={`/kisi/${k.id}`} className="block text-center">
            <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
              {k.kisiFotoUrl && <img src={k.kisiFotoUrl} alt={k.kisiAdi} className="h-full w-full object-cover" />}
            </div>
            <p className="mt-1 truncate text-xs text-murekkep">{k.kisiAdi}</p>
          </Link>
        ))}
      </div>

      {populer.length > 0 && (
        <>
          <h2 className="font-baslik text-lg text-murekkep mb-3">TMDB'de Şu An Popüler</h2>
          <div className="grid grid-cols-4 gap-4 sm:grid-cols-6">
            {populer.map((k) => (
              <Link key={k.id} to={`/kisi/${k.id}`} className="block text-center">
                <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                  {k.profile_path && <img src={`${TMDB_PROFIL}${k.profile_path}`} alt={k.name} className="h-full w-full object-cover" />}
                </div>
                <p className="mt-1 truncate text-xs text-murekkep">{k.name}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

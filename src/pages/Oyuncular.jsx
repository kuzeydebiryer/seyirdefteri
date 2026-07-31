import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { topluluktaPopulerKisiler } from '../hooks/useKisiPopulerlik.js'
import { useHaberler } from '../hooks/useHaberler.js'
import { useYonetmenler } from '../hooks/useYonetmenler.js'
import { useAuth } from '../context/AuthContext.jsx'
import { yonetmenEkle } from '../utils/yonetmen.js'
import HaberBolumu from '../components/HaberBolumu.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_PROFIL = 'https://image.tmdb.org/t/p/w300'

export default function Oyuncular() {
  const { kullanici } = useAuth()
  const [topluluk, setTopluluk] = useState([])
  const [populer, setPopuler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const { haberler, yenidenYukle: haberleriYenile } = useHaberler('kisi')

  const { yonetmenler, yukleniyor: yonetmenlerYukleniyor, yenidenYukle: yonetmenleriYenile } = useYonetmenler()
  const [yonetmenFormuAcik, setYonetmenFormuAcik] = useState(false)
  const [yonetmenArama, setYonetmenArama] = useState('')
  const [yonetmenSonuclari, setYonetmenSonuclari] = useState([])
  const [yonetmenEkleniyor, setYonetmenEkleniyor] = useState(false)

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

  async function yonetmenAra(e) {
    e.preventDefault()
    if (!yonetmenArama.trim() || !TMDB_API_KEY) return
    const url = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(yonetmenArama)}`
    const res = await fetch(url)
    const data = await res.json()
    setYonetmenSonuclari(data.results || [])
  }

  async function yonetmenSec(kisi) {
    setYonetmenEkleniyor(true)
    try {
      await yonetmenEkle(kisi.id, {
        ad: kisi.name,
        fotoUrl: kisi.profile_path ? `${TMDB_PROFIL}${kisi.profile_path}` : '',
        kullanici,
      })
      setYonetmenSonuclari([])
      setYonetmenArama('')
      setYonetmenFormuAcik(false)
      yonetmenleriYenile()
    } finally {
      setYonetmenEkleniyor(false)
    }
  }

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep mb-6">Oyuncular &amp; Yönetmenler</h1>

      <HaberBolumu kategori="kisi" haberler={haberler} yenidenYukle={haberleriYenile} />

      {/* Yönetmenler — üyelerin elle eklediği küratörlü liste */}
      <div className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-baslik text-lg text-murekkep">Yönetmenler</h2>
          {kullanici && (
            <button
              onClick={() => setYonetmenFormuAcik((a) => !a)}
              className="rounded-sm bg-kagitKoyu px-3 py-1 font-govde text-xs text-kraft ring-1 ring-cizgi"
            >
              {yonetmenFormuAcik ? 'Vazgeç' : '+ Yönetmen Ekle'}
            </button>
          )}
        </div>

        {yonetmenFormuAcik && (
          <div className="mb-4 space-y-2 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
            <form onSubmit={yonetmenAra} className="flex gap-2">
              <input
                type="text"
                value={yonetmenArama}
                onChange={(e) => setYonetmenArama(e.target.value)}
                placeholder="Yönetmen adı ara..."
                className="flex-1 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
              <button type="submit" className="rounded-sm bg-deniz px-3 py-2 text-xs text-kagit">
                Ara
              </button>
            </form>
            {yonetmenSonuclari.length > 0 && (
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {yonetmenSonuclari.slice(0, 12).map((kisi) => (
                  <button
                    key={kisi.id}
                    onClick={() => yonetmenSec(kisi)}
                    disabled={yonetmenEkleniyor}
                    className="text-left disabled:opacity-40"
                  >
                    <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                      {kisi.profile_path && (
                        <img src={`${TMDB_PROFIL}${kisi.profile_path}`} alt={kisi.name} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-murekkep">{kisi.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {yonetmenlerYukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
        {!yonetmenlerYukleniyor && yonetmenler.length === 0 && (
          <p className="text-sm text-kraft">Henüz bir yönetmen eklenmedi.</p>
        )}
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-6">
          {yonetmenler.map((y) => (
            <Link key={y.id} to={`/yonetmen/${y.tmdbId}`} className="block text-center">
              <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                {y.fotoUrl && <img src={y.fotoUrl} alt={y.ad} className="h-full w-full object-cover" />}
              </div>
              <p className="mt-1 truncate text-xs text-murekkep">{y.ad}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="defter-cizgi my-8" />

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

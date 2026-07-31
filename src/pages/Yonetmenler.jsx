import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useYonetmenler } from '../hooks/useYonetmenler.js'
import { yonetmenEkle } from '../utils/yonetmen.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_PROFIL = 'https://image.tmdb.org/t/p/w300'

export default function Yonetmenler() {
  const { kullanici } = useAuth()
  const { yonetmenler, yukleniyor, yenidenYukle } = useYonetmenler()
  const [formuAcik, setFormuAcik] = useState(false)
  const [arama, setArama] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [ekleniyor, setEkleniyor] = useState(false)

  async function ara(e) {
    e.preventDefault()
    if (!arama.trim() || !TMDB_API_KEY) return
    const url = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(arama)}`
    const res = await fetch(url)
    const data = await res.json()
    setSonuclar(data.results || [])
  }

  async function ekle(kisi) {
    setEkleniyor(true)
    try {
      await yonetmenEkle(kisi.id, {
        ad: kisi.name,
        fotoUrl: kisi.profile_path ? `${TMDB_PROFIL}${kisi.profile_path}` : '',
        kullanici,
      })
      setSonuclar([])
      setArama('')
      setFormuAcik(false)
      yenidenYukle()
    } finally {
      setEkleniyor(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-baslik text-2xl text-murekkep">Yönetmenler</h1>
        {kullanici && (
          <button
            onClick={() => setFormuAcik((a) => !a)}
            className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-sm text-kagit"
          >
            {formuAcik ? 'Vazgeç' : '+ Yönetmen Ekle'}
          </button>
        )}
      </div>
      <p className="mb-6 text-sm text-kraft">
        Bu liste üyelerin elle seçtiği yönetmenlerden oluşuyor — her birinin kendi filmografisi ve
        ilgili kitap önerileri var.
      </p>

      {formuAcik && (
        <div className="mb-8 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <form onSubmit={ara} className="flex gap-2">
            <input
              type="text"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Yönetmen adı ara..."
              className="flex-1 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
            <button type="submit" className="rounded-sm bg-deniz px-3 py-2 text-xs text-kagit">
              Ara
            </button>
          </form>
          {sonuclar.length > 0 && (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
              {sonuclar.slice(0, 12).map((kisi) => (
                <button
                  key={kisi.id}
                  onClick={() => ekle(kisi)}
                  disabled={ekleniyor}
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

      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {!yukleniyor && yonetmenler.length === 0 && <p className="text-sm text-kraft">Henüz bir yönetmen eklenmedi.</p>}

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
  )
}

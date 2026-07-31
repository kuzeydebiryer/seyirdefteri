import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useRafOgeleri } from '../hooks/useRafOgeleri.js'
import { rafOgeEkle, rafOgeSil } from '../utils/raf.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w342'
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

const KATEGORILER = [
  { id: 'sinema', etiket: 'Film' },
  { id: 'dizi', etiket: 'Dizi' },
  { id: 'kitap', etiket: 'Kitap' },
]

function esereLink(tur, disId) {
  if (tur === 'kitap') return `/kitap/${disId}`
  if (tur === 'dizi') return `/dizi/${disId}`
  return `/film/${disId}`
}

export default function RafDetay() {
  const { id } = useParams()
  const { kullanici } = useAuth()
  const { ogeler, yukleniyor, yenidenYukle } = useRafOgeleri(id)

  const [raf, setRaf] = useState(null)
  const [formuAcik, setFormuAcik] = useState(false)
  const [kategori, setKategori] = useState('sinema')
  const [arama, setArama] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [ekleniyor, setEkleniyor] = useState(false)

  useEffect(() => {
    getDoc(doc(db, 'raflar', id)).then((snap) => {
      if (snap.exists()) setRaf({ id: snap.id, ...snap.data() })
    })
  }, [id])

  async function ara(e) {
    e.preventDefault()
    if (!arama.trim()) return
    if (kategori === 'kitap') {
      const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(arama)}&maxResults=12${anahtarParcasi}`
      const res = await fetch(url)
      const data = await res.json()
      setSonuclar(data.items || [])
      return
    }
    if (!TMDB_API_KEY) return
    const uc = kategori === 'sinema' ? 'movie' : 'tv'
    const url = `https://api.themoviedb.org/3/search/${uc}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(arama)}`
    const res = await fetch(url)
    const data = await res.json()
    setSonuclar(data.results || [])
  }

  async function ekle(item) {
    setEkleniyor(true)
    try {
      let oge
      if (kategori === 'kitap') {
        const v = item.volumeInfo || {}
        oge = {
          tur: 'kitap',
          disId: item.id,
          baslik: v.title || '',
          alt: (v.authors || []).join(', '),
          posterUrl: (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://'),
        }
      } else {
        oge = {
          tur: kategori,
          disId: item.id,
          baslik: kategori === 'sinema' ? item.title : item.name,
          posterUrl: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '',
        }
      }
      await rafOgeEkle(id, kullanici, oge)
      setSonuclar([])
      setArama('')
      setFormuAcik(false)
      yenidenYukle()
    } finally {
      setEkleniyor(false)
    }
  }

  async function ogeyiSil(ogeId) {
    await rafOgeSil(id, ogeId)
    yenidenYukle()
  }

  if (!raf) return <p className="text-sm text-kraft">Yükleniyor...</p>

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep">{raf.baslik}</h1>
      {raf.aciklama && <p className="mt-1 text-sm text-kraft">{raf.aciklama}</p>}
      <p className="mt-1 text-xs text-kraft">{ogeler.length} eser</p>

      {kullanici && (
        <button
          onClick={() => setFormuAcik((a) => !a)}
          className="mt-4 rounded-sm bg-muhur px-3 py-1.5 font-govde text-sm text-kagit"
        >
          {formuAcik ? 'Vazgeç' : '+ Eser Ekle'}
        </button>
      )}

      {formuAcik && (
        <div className="mt-4 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <div className="flex gap-2">
            {KATEGORILER.map((k) => (
              <button
                key={k.id}
                onClick={() => {
                  setKategori(k.id)
                  setSonuclar([])
                }}
                className={`rounded-sm px-3 py-1 font-govde text-xs ${
                  kategori === k.id ? 'bg-deniz text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'
                }`}
              >
                {k.etiket}
              </button>
            ))}
          </div>
          <form onSubmit={ara} className="flex gap-2">
            <input
              type="text"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Ara..."
              className="flex-1 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
            <button type="submit" className="rounded-sm bg-deniz px-3 py-2 text-xs text-kagit">
              Ara
            </button>
          </form>
          {sonuclar.length > 0 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {sonuclar.slice(0, 12).map((item) => {
                const gorselVeAd =
                  kategori === 'kitap'
                    ? {
                        url: (item.volumeInfo?.imageLinks?.thumbnail || '').replace('http://', 'https://'),
                        ad: item.volumeInfo?.title,
                      }
                    : { url: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '', ad: item.title || item.name }
                return (
                  <button key={item.id} type="button" onClick={() => ekle(item)} disabled={ekleniyor} className="text-left disabled:opacity-40">
                    <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                      {gorselVeAd.url && <img src={gorselVeAd.url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <p className="mt-1 truncate text-[11px] text-murekkep">{gorselVeAd.ad}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="defter-cizgi my-6" />

      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {!yukleniyor && ogeler.length === 0 && <p className="text-sm text-kraft">Bu rafta henüz eser yok.</p>}

      <div className="grid grid-cols-4 gap-4 sm:grid-cols-6">
        {ogeler.map((o) => (
          <div key={o.id} className="relative">
            <Link to={esereLink(o.tur, o.disId)} className="block">
              <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                {o.posterUrl && <img src={o.posterUrl} alt={o.baslik} className="h-full w-full object-cover" />}
              </div>
              <p className="mt-1 truncate text-xs text-murekkep">{o.baslik}</p>
              {o.alt && <p className="truncate text-[11px] text-kraft">{o.alt}</p>}
            </Link>
            {kullanici?.uid === o.kullaniciId && (
              <button
                onClick={() => ogeyiSil(o.id)}
                className="absolute right-1 top-1 rounded-full bg-kagit/90 px-1.5 py-0.5 text-[10px] text-kraft ring-1 ring-cizgi hover:text-muhur"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { favoriEkle, favoriKaldir } from '../utils/favori.js'
import { favoriMi } from '../hooks/useFavoriler.js'

const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

export default function YazarSayfasi() {
  const { ad } = useParams()
  const yazarAdi = decodeURIComponent(ad)
  const { kullanici } = useAuth()

  const [kitaplar, setKitaplar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')
  const [favoriMi_, setFavoriMi_] = useState(false)
  const [favoriIsleniyor, setFavoriIsleniyor] = useState(false)

  useEffect(() => {
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      setHata('')
      try {
        const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`inauthor:"${yazarAdi}"`)}&maxResults=24&orderBy=newest${anahtarParcasi}`
        const res = await fetch(url)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`)
        if (iptal) return
        setKitaplar(data.items || [])
      } catch (err) {
        if (!iptal) setHata(err.message)
      } finally {
        if (!iptal) setYukleniyor(false)
      }
    }
    getir()

    if (kullanici) {
      favoriMi(kullanici.uid, 'yazar', ad).then((v) => {
        if (!iptal) setFavoriMi_(v)
      })
    }
    return () => {
      iptal = true
    }
  }, [ad, yazarAdi, kullanici])

  async function favoriDegistir() {
    if (!kullanici) return
    setFavoriIsleniyor(true)
    try {
      if (favoriMi_) {
        await favoriKaldir(kullanici.uid, 'yazar', ad)
      } else {
        await favoriEkle(kullanici, { tur: 'yazar', disId: ad, baslik: yazarAdi })
      }
      setFavoriMi_(!favoriMi_)
    } finally {
      setFavoriIsleniyor(false)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <h1 className="font-baslik text-2xl text-murekkep">{yazarAdi}</h1>
        {kullanici && (
          <button
            onClick={favoriDegistir}
            disabled={favoriIsleniyor}
            className={`shrink-0 rounded-sm px-3 py-1.5 font-govde text-xs ${
              favoriMi_ ? 'bg-muhur text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
            } disabled:opacity-40`}
          >
            {favoriMi_ ? '★ Favorilerimde' : '☆ Favorilere Ekle'}
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-kraft">Google Books'tan otomatik derlenen bibliyografi.</p>

      <div className="defter-cizgi my-6" />

      <h2 className="font-baslik text-lg text-murekkep mb-3">Kitapları</h2>
      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {hata && <p className="text-sm text-muhur">Bilgi alınamadı: {hata}</p>}
      {!yukleniyor && kitaplar.length === 0 && <p className="text-sm text-kraft">Kayıt bulunamadı.</p>}

      <div className="grid grid-cols-4 gap-4 sm:grid-cols-6">
        {kitaplar.map((k) => {
          const v = k.volumeInfo || {}
          const posterUrl = (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://')
          return (
            <Link key={k.id} to={`/kitap/${k.id}`} className="block">
              <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                {posterUrl && <img src={posterUrl} alt={v.title} className="h-full w-full object-cover" />}
              </div>
              <p className="mt-1 truncate text-xs text-murekkep">{v.title}</p>
              {v.publishedDate && <p className="text-[11px] text-kraft">{v.publishedDate.slice(0, 4)}</p>}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

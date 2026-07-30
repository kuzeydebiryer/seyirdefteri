import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { useEffect } from 'react'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useListeOgeleri } from '../hooks/useListeOgeleri.js'
import { ogeEkle } from '../utils/liste.js'
import ListeOgesi from '../components/ListeOgesi.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

export default function ListeDetay() {
  const { topluluklId, listeId } = useParams()
  const { kullanici } = useAuth()
  const { ogeler, yukleniyor, yenidenYukle } = useListeOgeleri(topluluklId, listeId)

  const [liste, setListe] = useState(null)
  const [formuAcik, setFormuAcik] = useState(false)
  const [kategori, setKategori] = useState('sinema')
  const [arama, setArama] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [aramaYukleniyor, setAramaYukleniyor] = useState(false)
  const [secili, setSecili] = useState(null)
  const [etkinlikTarihi, setEtkinlikTarihi] = useState('')
  const [ekleniyor, setEkleniyor] = useState(false)

  useEffect(() => {
    getDoc(doc(db, 'topluluklar', topluluklId, 'listeler', listeId)).then((snap) => {
      if (snap.exists()) setListe({ id: snap.id, ...snap.data() })
    })
  }, [topluluklId, listeId])

  async function ara(e) {
    e.preventDefault()
    if (!arama.trim()) return
    setAramaYukleniyor(true)
    setSonuclar([])
    try {
      if (kategori === 'sinema' || kategori === 'dizi') {
        if (!TMDB_API_KEY) return
        const uc = kategori === 'sinema' ? 'movie' : 'tv'
        const url = `https://api.themoviedb.org/3/search/${uc}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(arama)}`
        const res = await fetch(url)
        const data = await res.json()
        setSonuclar(data.results || [])
      } else {
        const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(arama)}&maxResults=10${anahtarParcasi}`
        const res = await fetch(url)
        const data = await res.json()
        setSonuclar(data.items || [])
      }
    } finally {
      setAramaYukleniyor(false)
    }
  }

  function sec(item) {
    if (kategori === 'sinema') {
      setSecili({
        tmdbId: item.id,
        baslik: item.title,
        yil: item.release_date ? item.release_date.slice(0, 4) : null,
        posterUrl: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '',
      })
    } else if (kategori === 'dizi') {
      setSecili({
        tmdbId: item.id,
        baslik: item.name,
        yil: item.first_air_date ? item.first_air_date.slice(0, 4) : null,
        posterUrl: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '',
      })
    } else {
      const v = item.volumeInfo || {}
      setSecili({
        googleBooksId: item.id,
        baslik: v.title || '',
        yazar: (v.authors || []).join(', '),
        yil: v.publishedDate ? v.publishedDate.slice(0, 4) : null,
        posterUrl: (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://'),
      })
    }
  }

  async function ekle(e) {
    e.preventDefault()
    if (!secili) return
    setEkleniyor(true)
    try {
      await ogeEkle(topluluklId, listeId, {
        tur: kategori,
        ...secili,
        etkinlikTarihi: etkinlikTarihi || null,
        ekleyenId: kullanici.uid,
      })
      setSecili(null)
      setArama('')
      setSonuclar([])
      setEtkinlikTarihi('')
      setFormuAcik(false)
      yenidenYukle()
    } finally {
      setEkleniyor(false)
    }
  }

  if (!liste) return <p className="text-sm text-kraft">Yükleniyor...</p>

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep">{liste.baslik}</h1>
      {liste.aciklama && <p className="mt-1 text-sm text-kraft">{liste.aciklama}</p>}
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
            {[
              { id: 'sinema', etiket: 'Film' },
              { id: 'dizi', etiket: 'Dizi' },
              { id: 'kitap', etiket: 'Kitap' },
            ].map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => {
                  setKategori(k.id)
                  setSecili(null)
                  setSonuclar([])
                }}
                className={`rounded-sm px-3 py-1 font-govde text-xs ${
                  kategori === k.id ? 'bg-murekkep text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'
                }`}
              >
                {k.etiket}
              </button>
            ))}
          </div>

          {!secili ? (
            <>
              <form onSubmit={ara} className="flex gap-2">
                <input
                  type="text"
                  value={arama}
                  onChange={(e) => setArama(e.target.value)}
                  placeholder="Ara..."
                  className="flex-1 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
                <button type="submit" className="rounded-sm bg-deniz px-3 py-2 font-govde text-xs text-kagit">
                  {aramaYukleniyor ? 'Aranıyor...' : 'Ara'}
                </button>
              </form>
              {sonuclar.length > 0 && (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {sonuclar.slice(0, 12).map((item) => {
                    const ad = kategori === 'sinema' ? item.title : kategori === 'dizi' ? item.name : item.volumeInfo?.title
                    const url =
                      kategori === 'kitap'
                        ? (item.volumeInfo?.imageLinks?.thumbnail || '').replace('http://', 'https://')
                        : item.poster_path
                          ? `${TMDB_POSTER}${item.poster_path}`
                          : ''
                    return (
                      <button key={item.id} type="button" onClick={() => sec(item)} className="text-left">
                        <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                          {url && <img src={url} alt={ad} className="h-full w-full object-cover" />}
                        </div>
                        <p className="mt-1 truncate text-[11px] text-murekkep">{ad}</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={ekle} className="space-y-3">
              <div className="flex items-center gap-3">
                {secili.posterUrl && <img src={secili.posterUrl} alt={secili.baslik} className="h-16 w-11 rounded-sm object-cover" />}
                <div className="flex-1">
                  <p className="text-sm text-murekkep">{secili.baslik}</p>
                  <button type="button" onClick={() => setSecili(null)} className="text-xs text-kraft hover:text-muhur">
                    Değiştir
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Etkinlik Tarihi</label>
                <input
                  type="date"
                  value={etkinlikTarihi}
                  onChange={(e) => setEtkinlikTarihi(e.target.value)}
                  className="rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <button
                type="submit"
                disabled={ekleniyor}
                className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
              >
                {ekleniyor ? 'Ekleniyor...' : 'Listeye Ekle'}
              </button>
            </form>
          )}
        </div>
      )}

      <div className="defter-cizgi my-6" />

      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {!yukleniyor && ogeler.length === 0 && <p className="text-sm text-kraft">Bu listede henüz eser yok.</p>}

      <div className="space-y-2">
        {ogeler.map((oge) => (
          <ListeOgesi key={oge.id} topluluklId={topluluklId} listeId={listeId} oge={oge} />
        ))}
      </div>
    </div>
  )
}

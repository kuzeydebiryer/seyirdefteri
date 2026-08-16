import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useKisiselListeOgeleri } from '../hooks/useKisiselListeOgeleri.js'
import { listeGetir, ogeEkle, ogeSil, listeSil } from '../utils/kisiselListe.js'
import { kitapAramaSonucundanKaydet } from '../utils/kitapKatalog.js'
import { kisiselListedenTopluluğaKopyala } from '../utils/liste.js'
import { useTopluluklar } from '../hooks/useTopluluklar.js'
import LetterboxdIceAktar from '../components/LetterboxdIceAktar.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

export default function KisiselListeDetay() {
  const { listeId } = useParams()
  const { kullanici } = useAuth()
  const { ogeler, yukleniyor, yenidenYukle } = useKisiselListeOgeleri(listeId)
  const { topluluklar } = useTopluluklar()

  const [liste, setListe] = useState(null)
  const [formuAcik, setFormuAcik] = useState(false)
  const [sekme, setSekme] = useState('ara') // 'ara' | 'letterboxd'
  const [kategori, setKategori] = useState('sinema')
  const [arama, setArama] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [aramaYukleniyor, setAramaYukleniyor] = useState(false)
  const [ekleniyor, setEkleniyor] = useState(null) // hangi öğe ekleniyor

  const [kopyalaFormuAcik, setKopyalaFormuAcik] = useState(false)
  const [uyeOlduklarim, setUyeOlduklarim] = useState([])
  const [hedefTopluluk, setHedefTopluluk] = useState('')
  const [kopyalaniyor, setKopyalaniyor] = useState(false)

  useEffect(() => {
    listeGetir(listeId).then(setListe)
  }, [listeId])

  const sahibiMi = kullanici && liste && kullanici.uid === liste.kullaniciId

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

  async function ekle(item) {
    setEkleniyor(item.id)
    try {
      let oge
      if (kategori === 'sinema') {
        oge = {
          tur: 'sinema',
          disId: item.id,
          baslik: item.title,
          alt: item.release_date ? item.release_date.slice(0, 4) : '',
          posterUrl: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '',
        }
      } else if (kategori === 'dizi') {
        oge = {
          tur: 'dizi',
          disId: item.id,
          baslik: item.name,
          alt: item.first_air_date ? item.first_air_date.slice(0, 4) : '',
          posterUrl: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '',
        }
      } else {
        // Kitaplarda dahili kataloğa (Google Books + Open Library) yazıp zenginleştirilmiş
        // veriyi kullanıyoruz — Faz 1'de kurduğumuz aynı altyapı.
        const kitap = await kitapAramaSonucundanKaydet(item)
        oge = { tur: 'kitap', disId: item.id, baslik: kitap.baslik, alt: kitap.yazar, posterUrl: kitap.posterUrl }
      }
      await ogeEkle(liste, oge)
      setListe((onceki) => ({ ...onceki, ogeSayisi: (onceki.ogeSayisi || 0) + 1 }))
      yenidenYukle()
    } finally {
      setEkleniyor(null)
    }
  }

  async function ogeKaldirTiklandi(ogeId) {
    if (!window.confirm('Bu eseri listeden kaldırmak istediğine emin misin?')) return
    await ogeSil(ogeId)
    yenidenYukle()
  }

  async function listeyiSilTiklandi() {
    if (!window.confirm('Bu listeyi tamamen silmek istediğine emin misin? Bu işlem geri alınamaz.')) return
    await listeSil(listeId)
    window.location.href = '/listelerim'
  }

  async function kopyalaFormunuAc() {
    setKopyalaFormuAcik((a) => !a)
    if (!kopyalaFormuAcik && kullanici && uyeOlduklarim.length === 0) {
      // Ters indeksten (bkz. utils/topluluk.js) tek okumayla — eskiden
      // sitedeki her topluluğu tek tek kontrol ediyorduk.
      const profilSnap = await getDoc(doc(db, 'kullanicilar', kullanici.uid))
      const uyeIdler = profilSnap.exists() ? profilSnap.data().uyeOlduklarim || [] : []
      setUyeOlduklarim(topluluklar.filter((t) => uyeIdler.includes(t.id)))
    }
  }

  async function kopyalaTiklandi() {
    if (!hedefTopluluk || !kullanici) return
    setKopyalaniyor(true)
    try {
      const yeniListeId = await kisiselListedenTopluluğaKopyala(liste, ogeler, hedefTopluluk, kullanici)
      window.location.href = `/topluluk/${hedefTopluluk}/liste/${yeniListeId}`
    } finally {
      setKopyalaniyor(false)
    }
  }

  if (!liste) return <p className="text-sm text-kraft">Yükleniyor...</p>

  return (
    <div>
      <Link to="/listelerim" className="text-xs text-kraft hover:text-deniz hover:underline">
        ← Listelerim
      </Link>
      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="font-baslik text-2xl text-murekkep">{liste.baslik}</h1>
          {liste.aciklama && <p className="mt-1 text-sm text-kraft">{liste.aciklama}</p>}
          <p className="mt-1 text-xs text-kraft">
            {liste.ogeSayisi || 0} eser{!liste.herkeseAcik && ' · Gizli'}
          </p>
        </div>
        {sahibiMi && (
          <button onClick={listeyiSilTiklandi} className="text-xs text-kraft hover:text-muhur">
            Listeyi Sil
          </button>
        )}
      </div>

      {sahibiMi && ogeler.length > 0 && (
        <div className="mt-2">
          <button onClick={kopyalaFormunuAc} className="text-xs text-kraft hover:text-deniz hover:underline">
            {kopyalaFormuAcik ? 'Vazgeç' : '📋 Bir Topluluğa Kopyala'}
          </button>
          {kopyalaFormuAcik && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
              {uyeOlduklarim.length === 0 ? (
                <p className="text-xs text-kraft">Üyesi olduğun bir topluluk bulunamadı.</p>
              ) : (
                <>
                  <select
                    value={hedefTopluluk}
                    onChange={(e) => setHedefTopluluk(e.target.value)}
                    className="rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
                  >
                    <option value="">Topluluk seç...</option>
                    {uyeOlduklarim.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.ad}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={kopyalaTiklandi}
                    disabled={!hedefTopluluk || kopyalaniyor}
                    className="rounded-sm bg-deniz px-3 py-1.5 text-xs text-kagit disabled:opacity-40"
                  >
                    {kopyalaniyor ? 'Kopyalanıyor...' : 'Kopyala'}
                  </button>
                  <p className="w-full text-[11px] text-kraft">
                    Kişisel listen olduğu gibi kalır, topluluğa {ogeler.length} eserlik yeni bir kopya oluşturulur.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {sahibiMi && (
        <button
          onClick={() => setFormuAcik((a) => !a)}
          className="mt-4 rounded-sm bg-muhur px-3 py-1.5 font-govde text-sm text-kagit"
        >
          {formuAcik ? 'Vazgeç' : '+ Ekle'}
        </button>
      )}

      {formuAcik && (
        <div className="mt-4 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setSekme('ara')}
              className={`rounded-sm px-3 py-1 font-govde text-xs ${sekme === 'ara' ? 'bg-murekkep text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
            >
              İsimle Ara
            </button>
            <button
              onClick={() => setSekme('letterboxd')}
              className={`rounded-sm px-3 py-1 font-govde text-xs ${sekme === 'letterboxd' ? 'bg-murekkep text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
            >
              Letterboxd'dan İçe Aktar
            </button>
          </div>

          {sekme === 'ara' && (
            <div className="space-y-3">
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
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => ekle(item)}
                        disabled={ekleniyor === item.id}
                        className="text-left disabled:opacity-40"
                      >
                        <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                          {url && <img src={url} alt={ad} className="h-full w-full object-cover" />}
                        </div>
                        <p className="mt-1 truncate text-[11px] text-murekkep">
                          {ekleniyor === item.id ? 'Ekleniyor...' : ad}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {sekme === 'letterboxd' && (
            <LetterboxdIceAktar
              liste={liste}
              onTamamlandi={() => {
                setFormuAcik(false)
                listeGetir(listeId).then(setListe)
                yenidenYukle()
              }}
            />
          )}
        </div>
      )}

      <div className="defter-cizgi my-6" />

      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {!yukleniyor && ogeler.length === 0 && <p className="text-sm text-kraft">Bu listede henüz eser yok.</p>}

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {ogeler.map((oge) => {
          const esereGit = `/${oge.tur === 'kitap' ? 'kitap' : oge.tur === 'dizi' ? 'dizi' : 'film'}/${oge.disId}`
          return (
            <div key={oge.id} className="group relative">
              <Link to={esereGit}>
                <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                  {oge.posterUrl && <img src={oge.posterUrl} alt={oge.baslik} className="h-full w-full object-cover" />}
                </div>
                <p className="mt-1 truncate text-xs text-murekkep">{oge.baslik}</p>
                {oge.alt && <p className="truncate text-[11px] text-kraft">{oge.alt}</p>}
              </Link>
              {sahibiMi && (
                <button
                  onClick={() => ogeKaldirTiklandi(oge.id)}
                  className="absolute right-1 top-1 rounded-full bg-kagit/90 px-1.5 py-0.5 text-[10px] text-kraft opacity-0 ring-1 ring-cizgi transition-opacity hover:text-muhur group-hover:opacity-100"
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { kitapGetir, kitapAramaSonucundanKaydet } from '../utils/kitapKatalog.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
const YILDIZ_SECENEKLERI = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
const ETKINLIK_TURLERI = ['Tiyatro', 'Konser', 'Mekan', 'Sergi', 'Diğer']

const KATEGORILER = [
  { id: 'sinema', etiket: 'Film' },
  { id: 'dizi', etiket: 'Dizi' },
  { id: 'kitap', etiket: 'Kitap' },
  { id: 'yazi', etiket: 'Yazı' },
  { id: 'gezi', etiket: 'Gezi' },
  { id: 'etkinlik', etiket: 'Etkinlik' },
]

const YAZI_ALT_TURLERI = [
  { id: 'deneme', etiket: 'Deneme' },
  { id: 'film-incelemesi', etiket: 'Film İncelemesi' },
  { id: 'kitap-incelemesi', etiket: 'Kitap İncelemesi' },
]

// Bir kategori TMDB/Google Books araması kullanıyor mu?
const API_KATEGORILERI = ['sinema', 'dizi', 'kitap']

export default function GonderiEkle() {
  const { kullanici, profil } = useAuth()
  const navigate = useNavigate()
  const [aramaParametreleri] = useSearchParams()

  const [kategori, setKategori] = useState('sinema')
  const [yaziAltTur, setYaziAltTur] = useState('deneme')

  const [arama, setArama] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [aramaYukleniyor, setAramaYukleniyor] = useState(false)
  const [aramaHatasi, setAramaHatasi] = useState('')
  const [detayYukleniyor, setDetayYukleniyor] = useState(false)

  const [seciliId, setSeciliId] = useState(null)
  const [tmdbId, setTmdbId] = useState(null)
  const [googleBooksId, setGoogleBooksId] = useState(null)
  const [baslik, setBaslik] = useState('')
  const [yil, setYil] = useState('')
  const [yazar, setYazar] = useState('')
  const [posterUrl, setPosterUrl] = useState('')

  // Zengin meta veri (TMDB / Google Books'tan otomatik, elle düzenlenebilir)
  const [ozet, setOzet] = useState('')
  const [turler, setTurler] = useState('')
  const [sureDk, setSureDk] = useState('')
  const [sezonSayisi, setSezonSayisi] = useState('')
  const [bolumSayisi, setBolumSayisi] = useState('')
  const [yonetmen, setYonetmen] = useState('') // film: yönetmen, dizi: yaratıcı
  const [oyuncular, setOyuncular] = useState('')
  const [yonetmenListesi, setYonetmenListesi] = useState([]) // [{id, name}] - kişi sayfasına link için
  const [oyuncularListesi, setOyuncularListesi] = useState([])
  const [dbPuan, setDbPuan] = useState('')
  const [sayfaSayisi, setSayfaSayisi] = useState('')
  const [yayinevi, setYayinevi] = useState('')

  // Gezi / Etkinlik'e özel alanlar
  const [konum, setKonum] = useState('')
  const [etkinlikTarihi, setEtkinlikTarihi] = useState('')
  const [altTur, setAltTur] = useState('Tiyatro')

  // Yazı'ya özel: incelenen film/kitabın hafif referans kartı
  const [ilgiliBaslik, setIlgiliBaslik] = useState('')
  const [ilgiliYil, setIlgiliYil] = useState('')
  const [ilgiliYazar, setIlgiliYazar] = useState('')
  const [ilgiliPosterUrl, setIlgiliPosterUrl] = useState('')
  const [ilgiliTmdbId, setIlgiliTmdbId] = useState(null)
  const [ilgiliDisId, setIlgiliDisId] = useState(null) // kitap incelemesi: hangi kitaba ait (googleBooksId)

  const [kullaniciPuani, setKullaniciPuani] = useState(4)
  const [gunce, setGunce] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const gunceRef = useRef(null)

  const apiliKategori = API_KATEGORILERI.includes(kategori)
  const yaziAramaHedefi =
    kategori === 'yazi'
      ? yaziAltTur === 'film-incelemesi'
        ? 'sinema'
        : yaziAltTur === 'kitap-incelemesi'
          ? 'kitap'
          : null
      : null
  const aramaGosterilsinMi = apiliKategori || yaziAramaHedefi

  function kategoriDegistir(yeni) {
    setKategori(yeni)
    setYaziAltTur('deneme')
    sifirla()
  }

  function yaziAltTuruDegistir(yeni) {
    setYaziAltTur(yeni)
    sifirla()
  }

  function sifirla() {
    setArama('')
    setSonuclar([])
    setAramaHatasi('')
    setSeciliId(null)
    setTmdbId(null)
    setGoogleBooksId(null)
    setBaslik('')
    setYil('')
    setYazar('')
    setPosterUrl('')
    setOzet('')
    setTurler('')
    setSureDk('')
    setSezonSayisi('')
    setBolumSayisi('')
    setYonetmen('')
    setOyuncular('')
    setYonetmenListesi([])
    setOyuncularListesi([])
    setDbPuan('')
    setSayfaSayisi('')
    setYayinevi('')
    setKonum('')
    setEtkinlikTarihi('')
    setAltTur('Tiyatro')
    setIlgiliBaslik('')
    setIlgiliYil('')
    setIlgiliYazar('')
    setIlgiliPosterUrl('')
    setIlgiliTmdbId(null)
    setIlgiliDisId(null)
  }

  function ilgiliyiKaldir() {
    setSeciliId(null)
    setIlgiliBaslik('')
    setIlgiliYil('')
    setIlgiliYazar('')
    setIlgiliPosterUrl('')
    setIlgiliTmdbId(null)
    setIlgiliDisId(null)
  }

  function gorselEkle() {
    const url = window.prompt('Görsel URL\'i yapıştır (jpg, png, gif, webp):')
    if (!url || !url.trim()) return
    const temizUrl = url.trim()
    const ta = gunceRef.current
    const imlecKonumu = ta ? ta.selectionStart : gunce.length
    const eklenecek = `\n\n${temizUrl}\n\n`
    const yeniMetin = gunce.slice(0, imlecKonumu) + eklenecek + gunce.slice(imlecKonumu)
    setGunce(yeniMetin)
    const yeniKonum = imlecKonumu + eklenecek.length
    setTimeout(() => {
      if (ta) {
        ta.focus()
        ta.setSelectionRange(yeniKonum, yeniKonum)
      }
    }, 0)
  }

  async function disIdIleGetir(hedefTur, disId) {
    setDetayYukleniyor(true)
    try {
      if (hedefTur === 'sinema' || hedefTur === 'dizi') {
        if (!TMDB_API_KEY) return
        const uc = hedefTur === 'sinema' ? 'movie' : 'tv'
        const url = `https://api.themoviedb.org/3/${uc}/${disId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=credits`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Eser bilgisi alınamadı')
        const detay = await res.json()
        setTmdbId(Number(disId))
        setBaslik(hedefTur === 'sinema' ? detay.title : detay.name)
        setYil((hedefTur === 'sinema' ? detay.release_date : detay.first_air_date)?.slice(0, 4) || '')
        setPosterUrl(detay.poster_path ? `${TMDB_POSTER}${detay.poster_path}` : '')
        setOzet(detay.overview || '')
        setDbPuan(detay.vote_average ? detay.vote_average.toFixed(1) : '')
        setTurler((detay.genres || []).map((g) => g.name).join(', '))
        if (hedefTur === 'sinema') {
          setSureDk(detay.runtime || '')
          const yonetmenler = (detay.credits?.crew || []).filter((k) => k.job === 'Director').map((k) => k.name)
          setYonetmen(yonetmenler.join(', '))
          setYonetmenListesi(
            (detay.credits?.crew || []).filter((k) => k.job === 'Director').map((k) => ({ id: k.id, name: k.name }))
          )
        } else {
          setSezonSayisi(detay.number_of_seasons || '')
          setBolumSayisi(detay.number_of_episodes || '')
          setYonetmen((detay.created_by || []).map((k) => k.name).join(', '))
          setYonetmenListesi((detay.created_by || []).map((k) => ({ id: k.id, name: k.name })))
        }
        setOyuncular((detay.credits?.cast || []).slice(0, 5).map((k) => k.name).join(', '))
        setOyuncularListesi((detay.credits?.cast || []).slice(0, 5).map((k) => ({ id: k.id, name: k.name })))
      } else if (hedefTur === 'kitap') {
        // Faz 1: önce dahili katalog (Firestore), yoksa Google Books + Open Library
        // birleşimi. Bkz. utils/kitapKatalog.js
        const k = await kitapGetir(disId)
        setGoogleBooksId(disId)
        setBaslik(k.baslik || '')
        setYazar(k.yazar || '')
        setPosterUrl(k.posterUrl || '')
        setOzet(k.ozet || '')
        setTurler(k.turler || '')
        setSayfaSayisi(k.sayfaSayisi || '')
        setYayinevi(k.yayinevi || '')
        setYil(k.yil || '')
        setDbPuan(k.dbPuan ? Number(k.dbPuan).toFixed(1) : '')
      }
    } catch (err) {
      setAramaHatasi('Eser bilgisi çekilemedi: ' + err.message)
    } finally {
      setDetayYukleniyor(false)
    }
  }

  // Eser sayfasından "Bu film/dizi/kitap hakkında günce yaz" linkiyle gelindiyse
  // (?tur=sinema&disId=123 gibi) formu otomatik olarak o esere göre doldur.
  useEffect(() => {
    const urlTur = aramaParametreleri.get('tur')
    const urlDisId = aramaParametreleri.get('disId')
    if (urlTur && urlDisId) {
      setKategori(urlTur)
      disIdIleGetir(urlTur, urlDisId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function ara(e) {
    e.preventDefault()
    if (!arama.trim()) return
    const hedef = kategori === 'yazi' ? yaziAramaHedefi : kategori
    setAramaYukleniyor(true)
    setAramaHatasi('')
    try {
      if (hedef === 'sinema') {
        if (!TMDB_API_KEY) {
          setAramaHatasi('TMDB API anahtarı tanımlı değil. Aşağıdan elle ekleyebilirsin.')
          return
        }
        const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(arama)}`
        const res = await fetch(url)
        const data = await res.json()
        if (!res.ok) throw new Error(data.status_message || `HTTP ${res.status}`)
        setSonuclar(data.results || [])
        if ((data.results || []).length === 0) setAramaHatasi('Sonuç bulunamadı.')
      } else if (hedef === 'dizi') {
        if (!TMDB_API_KEY) {
          setAramaHatasi('TMDB API anahtarı tanımlı değil. Aşağıdan elle ekleyebilirsin.')
          return
        }
        const url = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(arama)}`
        const res = await fetch(url)
        const data = await res.json()
        if (!res.ok) throw new Error(data.status_message || `HTTP ${res.status}`)
        setSonuclar(data.results || [])
        if ((data.results || []).length === 0) setAramaHatasi('Sonuç bulunamadı.')
      } else if (hedef === 'kitap') {
        const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(arama)}&maxResults=10${anahtarParcasi}`
        const res = await fetch(url)
        const data = await res.json()
        if (!res.ok) {
          console.error('Google Books API hatası:', data)
          throw new Error(data.error?.message || `HTTP ${res.status}`)
        }
        setSonuclar(data.items || [])
        if ((data.items || []).length === 0) setAramaHatasi('Sonuç bulunamadı.')
      }
    } catch (err) {
      setAramaHatasi('Arama sırasında hata: ' + err.message)
    } finally {
      setAramaYukleniyor(false)
    }
  }

  async function sec(item) {
    const hedef = kategori === 'yazi' ? yaziAramaHedefi : kategori

    if (hedef === 'sinema') {
      setSeciliId(item.id)
      const yilDegeri = item.release_date ? item.release_date.slice(0, 4) : ''
      const posterDegeri = item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : ''

      if (kategori === 'yazi') {
        setIlgiliBaslik(item.title)
        setIlgiliYil(yilDegeri)
        setIlgiliPosterUrl(posterDegeri)
        setIlgiliTmdbId(item.id)
        return
      }

      setTmdbId(item.id)
      setBaslik(item.title)
      setYil(yilDegeri)
      setPosterUrl(posterDegeri)
      setOzet(item.overview || '')
      setDbPuan(item.vote_average ? item.vote_average.toFixed(1) : '')

      if (!TMDB_API_KEY) return
      setDetayYukleniyor(true)
      try {
        const url = `https://api.themoviedb.org/3/movie/${item.id}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=credits`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Detay isteği başarısız')
        const detay = await res.json()
        setTurler((detay.genres || []).map((g) => g.name).join(', '))
        setSureDk(detay.runtime || '')
        if (detay.overview) setOzet(detay.overview)
        const yonetmenler = (detay.credits?.crew || []).filter((k) => k.job === 'Director').map((k) => k.name)
        setYonetmen(yonetmenler.join(', '))
        setYonetmenListesi(
          (detay.credits?.crew || []).filter((k) => k.job === 'Director').map((k) => ({ id: k.id, name: k.name }))
        )
        const ilkOyuncular = (detay.credits?.cast || []).slice(0, 5).map((k) => k.name)
        setOyuncular(ilkOyuncular.join(', '))
        setOyuncularListesi((detay.credits?.cast || []).slice(0, 5).map((k) => ({ id: k.id, name: k.name })))
      } catch (err) {
        console.warn('TMDB detay bilgisi çekilemedi:', err.message)
      } finally {
        setDetayYukleniyor(false)
      }
    } else if (hedef === 'dizi') {
      setSeciliId(item.id)
      setTmdbId(item.id)
      const yilDegeri = item.first_air_date ? item.first_air_date.slice(0, 4) : ''
      const posterDegeri = item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : ''
      setBaslik(item.name)
      setYil(yilDegeri)
      setPosterUrl(posterDegeri)
      setOzet(item.overview || '')
      setDbPuan(item.vote_average ? item.vote_average.toFixed(1) : '')

      if (!TMDB_API_KEY) return
      setDetayYukleniyor(true)
      try {
        const url = `https://api.themoviedb.org/3/tv/${item.id}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=credits`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Detay isteği başarısız')
        const detay = await res.json()
        setTurler((detay.genres || []).map((g) => g.name).join(', '))
        setSezonSayisi(detay.number_of_seasons || '')
        setBolumSayisi(detay.number_of_episodes || '')
        if (detay.overview) setOzet(detay.overview)
        const yaratanlar = (detay.created_by || []).map((k) => k.name)
        setYonetmen(yaratanlar.join(', '))
        setYonetmenListesi((detay.created_by || []).map((k) => ({ id: k.id, name: k.name })))
        const ilkOyuncular = (detay.credits?.cast || []).slice(0, 5).map((k) => k.name)
        setOyuncular(ilkOyuncular.join(', '))
        setOyuncularListesi((detay.credits?.cast || []).slice(0, 5).map((k) => ({ id: k.id, name: k.name })))
      } catch (err) {
        console.warn('TMDB detay bilgisi çekilemedi:', err.message)
      } finally {
        setDetayYukleniyor(false)
      }
    } else if (hedef === 'kitap') {
      const v = item.volumeInfo || {}
      const kapakOnizleme = (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://')

      if (kategori === 'yazi') {
        setSeciliId(item.id)
        setIlgiliBaslik(v.title || '')
        setIlgiliYazar((v.authors || []).join(', '))
        setIlgiliPosterUrl(kapakOnizleme)
        setIlgiliDisId(item.id)
        return
      }

      // Önce ham arama sonucuyla anında doldur (bekleme hissi olmasın),
      // ardından dahili kataloğa yazıp (Open Library ile zenginleştirip) üzerine güncelle.
      setSeciliId(item.id)
      setGoogleBooksId(item.id)
      setBaslik(v.title || '')
      setYazar((v.authors || []).join(', '))
      setPosterUrl(kapakOnizleme)
      setOzet(v.description || '')
      setTurler((v.categories || []).join(', '))
      setSayfaSayisi(v.pageCount || '')
      setYayinevi(v.publisher || '')
      setYil(v.publishedDate ? v.publishedDate.slice(0, 4) : '')
      setDbPuan(v.averageRating ? v.averageRating.toFixed(1) : '')

      setDetayYukleniyor(true)
      try {
        const k = await kitapAramaSonucundanKaydet(item)
        setPosterUrl(k.posterUrl || kapakOnizleme)
        setOzet(k.ozet || v.description || '')
        setTurler(k.turler || (v.categories || []).join(', '))
        setSayfaSayisi(k.sayfaSayisi || v.pageCount || '')
        setYayinevi(k.yayinevi || v.publisher || '')
      } catch (err) {
        console.warn('Kitap kataloğuna kaydetme başarısız:', err.message)
      } finally {
        setDetayYukleniyor(false)
      }
    }
  }

  async function paylas(e) {
    e.preventDefault()
    if (!baslik.trim() || !kullanici) return
    setKaydediliyor(true)
    try {
      await addDoc(collection(db, 'gonderiler'), {
        tur: kategori,
        altTur: kategori === 'yazi' ? yaziAltTur : kategori === 'etkinlik' ? altTur : null,
        yazarId: kullanici.uid,
        yazarAdi: profil?.adSoyad || kullanici.displayName || 'İsimsiz',
        yazarKullaniciAdi: profil?.kullaniciAdi || '',
        yazarAvatarUrl: profil?.avatarUrl || '',
        baslik: baslik.trim(),
        yil: apiliKategori && yil ? Number(yil) : null,
        yazar: kategori === 'kitap' ? yazar : null,
        posterUrl,
        tmdbId: kategori === 'sinema' || kategori === 'dizi' ? tmdbId : null,
        googleBooksId: kategori === 'kitap' ? googleBooksId : null,
        ozet: apiliKategori ? ozet || '' : '',
        turler: kategori === 'etkinlik' ? altTur : apiliKategori ? turler || '' : '',
        sureDk: kategori === 'sinema' && sureDk ? Number(sureDk) : null,
        sezonSayisi: kategori === 'dizi' && sezonSayisi ? Number(sezonSayisi) : null,
        bolumSayisi: kategori === 'dizi' && bolumSayisi ? Number(bolumSayisi) : null,
        yonetmen: kategori === 'sinema' || kategori === 'dizi' ? yonetmen : '',
        yonetmenListesi: kategori === 'sinema' || kategori === 'dizi' ? yonetmenListesi : [],
        oyuncularListesi: kategori === 'sinema' || kategori === 'dizi' ? oyuncularListesi : [],
        oyuncular: kategori === 'sinema' || kategori === 'dizi' ? oyuncular : '',
        dbPuan: apiliKategori && dbPuan ? Number(dbPuan) : null,
        sayfaSayisi: kategori === 'kitap' && sayfaSayisi ? Number(sayfaSayisi) : null,
        yayinevi: kategori === 'kitap' ? yayinevi : '',
        konum: kategori === 'gezi' || kategori === 'etkinlik' ? konum : '',
        etkinlikTarihi: (kategori === 'gezi' || kategori === 'etkinlik') && etkinlikTarihi ? etkinlikTarihi : null,
        // Yazı'ya özel: incelenen film/kitabın hafif referans kartı
        ilgiliBaslik: kategori === 'yazi' ? ilgiliBaslik : '',
        ilgiliYil: kategori === 'yazi' && ilgiliYil ? Number(ilgiliYil) : null,
        ilgiliYazar: kategori === 'yazi' ? ilgiliYazar : '',
        ilgiliPosterUrl: kategori === 'yazi' ? ilgiliPosterUrl : '',
        ilgiliTmdbId: kategori === 'yazi' ? ilgiliTmdbId : null,
        ilgiliDisId: kategori === 'yazi' && yaziAltTur === 'kitap-incelemesi' ? ilgiliDisId : null,
        kullaniciPuani: kategori === 'yazi' && yaziAltTur === 'deneme' ? null : kullaniciPuani,
        gunce,
        tarih: serverTimestamp(),
        begenenler: [],
        yorumSayisi: 0,
      })
      navigate('/')
    } catch (err) {
      setAramaHatasi('Kaydedilemedi: ' + err.message)
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <div className={kategori === 'yazi' ? 'max-w-2xl' : 'max-w-xl'}>
      <h1 className="font-baslik text-2xl text-murekkep mb-4">Günce Ekle</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {KATEGORILER.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => kategoriDegistir(k.id)}
            className={`rounded-sm px-3 py-1.5 font-govde text-sm transition ${
              kategori === k.id
                ? 'bg-murekkep text-kagit font-medium ring-2 ring-murekkep'
                : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi hover:ring-murekkep/50'
            }`}
          >
            {k.etiket}
          </button>
        ))}
      </div>

      {kategori === 'yazi' && (
        <div className="mb-6 flex flex-wrap gap-2">
          {YAZI_ALT_TURLERI.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => yaziAltTuruDegistir(t.id)}
              className={`rounded-sm px-3 py-1.5 font-govde text-sm transition ${
                yaziAltTur === t.id
                  ? 'bg-deniz text-kagit font-medium ring-2 ring-deniz'
                  : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi hover:ring-deniz/50'
              }`}
            >
              {t.etiket}
            </button>
          ))}
        </div>
      )}

      {aramaGosterilsinMi && (
        <>
          {ilgiliBaslik ? (
            <div className="mb-6 flex items-center gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
              {ilgiliPosterUrl && (
                <img src={ilgiliPosterUrl} alt={ilgiliBaslik} className="h-16 w-11 rounded-sm object-cover" />
              )}
              <div className="flex-1">
                <p className="text-sm text-murekkep">
                  {ilgiliBaslik} {ilgiliYil && <span className="text-kraft">({ilgiliYil})</span>}
                </p>
                {ilgiliYazar && <p className="text-xs text-kraft">{ilgiliYazar}</p>}
              </div>
              <button type="button" onClick={ilgiliyiKaldir} className="text-xs text-kraft hover:text-muhur">
                Kaldır
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={ara} className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={arama}
                  onChange={(e) => setArama(e.target.value)}
                  placeholder={
                    (kategori === 'yazi' ? yaziAramaHedefi : kategori) === 'sinema'
                      ? 'Film adı ara...'
                      : (kategori === 'yazi' ? yaziAramaHedefi : kategori) === 'dizi'
                        ? 'Dizi adı ara...'
                        : 'Kitap adı ara...'
                  }
                  className="flex-1 rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
                <button type="submit" className="rounded-sm bg-murekkep px-4 py-2 font-govde text-sm text-kagit">
                  {aramaYukleniyor ? 'Aranıyor...' : 'Ara'}
                </button>
              </form>

              {aramaHatasi && <p className="mb-4 text-xs text-muhur">{aramaHatasi}</p>}

              {sonuclar.length > 0 && (
                <div className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {sonuclar.slice(0, 10).map((item) => {
                    const hedef = kategori === 'yazi' ? yaziAramaHedefi : kategori
                    const gorselVeAd =
                      hedef === 'sinema'
                        ? { url: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '', ad: item.title }
                        : hedef === 'dizi'
                          ? { url: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '', ad: item.name }
                          : {
                              url: (item.volumeInfo?.imageLinks?.thumbnail || item.volumeInfo?.imageLinks?.smallThumbnail || '').replace(
                                'http://',
                                'https://'
                              ),
                              ad: item.volumeInfo?.title,
                            }
                    return (
                      <button
                        key={item.id}
                        onClick={() => sec(item)}
                        type="button"
                        className={`text-left rounded-sm ring-1 ${seciliId === item.id ? 'ring-muhur' : 'ring-cizgi'}`}
                      >
                        <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu">
                          {gorselVeAd.url ? (
                            <img src={gorselVeAd.url} alt={gorselVeAd.ad} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center p-1 text-center text-xs text-kraft">
                              {gorselVeAd.ad}
                            </div>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-murekkep">{gorselVeAd.ad}</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}

          <div className="defter-cizgi mb-6" />
        </>
      )}

      <form onSubmit={paylas} className="space-y-4">
        {kategori !== 'yazi' && (
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">
                {kategori === 'gezi' ? 'Gidilen Yer' : kategori === 'etkinlik' ? 'Etkinlik Adı' : 'Başlık'}
              </label>
              <input
                type="text"
                value={baslik}
                onChange={(e) => setBaslik(e.target.value)}
                required
                className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>
            {(kategori === 'sinema' || kategori === 'dizi') && (
              <div className="w-24">
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Yıl</label>
                <input
                  type="number"
                  value={yil}
                  onChange={(e) => setYil(e.target.value)}
                  className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
            )}
            {kategori === 'kitap' && (
              <div className="flex-1">
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Yazar</label>
                <input
                  type="text"
                  value={yazar}
                  onChange={(e) => setYazar(e.target.value)}
                  className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
            )}
            {kategori === 'etkinlik' && (
              <div className="w-40">
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Tür</label>
                <select
                  value={altTur}
                  onChange={(e) => setAltTur(e.target.value)}
                  className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                >
                  {ETKINLIK_TURLERI.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {kategori === 'yazi' && (
          <div>
            <input
              type="text"
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              required
              placeholder="Yazına bir başlık ver"
              className="w-full border-b-2 border-cizgi bg-transparent pb-2 font-baslik text-2xl text-murekkep placeholder-kraft/50 focus:border-deniz focus:outline-none"
            />
          </div>
        )}

        {(kategori === 'gezi' || kategori === 'etkinlik') && (
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Konum</label>
              <input
                type="text"
                value={konum}
                onChange={(e) => setKonum(e.target.value)}
                placeholder={kategori === 'gezi' ? 'Şehir, ülke' : 'Mekan adı, şehir'}
                className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>
            <div className="w-40">
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Tarih</label>
              <input
                type="date"
                value={etkinlikTarihi}
                onChange={(e) => setEtkinlikTarihi(e.target.value)}
                className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>
          </div>
        )}

        {(kategori === 'gezi' || kategori === 'etkinlik') && (
          <div>
            <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Fotoğraf URL (opsiyonel)</label>
            <input
              type="text"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
          </div>
        )}

        {detayYukleniyor && (
          <p className="text-xs text-kraft">
            TMDB'den {kategori === 'dizi' ? 'yaratıcı, oyuncular ve sezon' : 'yönetmen, oyuncular ve tür'} bilgisi çekiliyor...
          </p>
        )}

        {apiliKategori && (
          <>
            <div>
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Özet</label>
              <textarea
                value={ozet}
                onChange={(e) => setOzet(e.target.value)}
                rows={3}
                className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Tür(ler)</label>
                <input
                  type="text"
                  value={turler}
                  onChange={(e) => setTurler(e.target.value)}
                  className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              {kategori === 'sinema' && (
                <div className="w-28">
                  <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Süre (dk)</label>
                  <input
                    type="number"
                    value={sureDk}
                    onChange={(e) => setSureDk(e.target.value)}
                    className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                  />
                </div>
              )}
              {kategori === 'dizi' && (
                <>
                  <div className="w-24">
                    <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Sezon</label>
                    <input
                      type="number"
                      value={sezonSayisi}
                      onChange={(e) => setSezonSayisi(e.target.value)}
                      className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Bölüm</label>
                    <input
                      type="number"
                      value={bolumSayisi}
                      onChange={(e) => setBolumSayisi(e.target.value)}
                      className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                    />
                  </div>
                </>
              )}
              {kategori === 'kitap' && (
                <div className="w-28">
                  <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Sayfa</label>
                  <input
                    type="number"
                    value={sayfaSayisi}
                    onChange={(e) => setSayfaSayisi(e.target.value)}
                    className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                  />
                </div>
              )}
              <div className="w-28">
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">
                  {kategori === 'kitap' ? 'Google Puanı' : 'TMDB Puanı'}
                </label>
                <input
                  type="text"
                  value={dbPuan}
                  onChange={(e) => setDbPuan(e.target.value)}
                  className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
            </div>

            {(kategori === 'sinema' || kategori === 'dizi') ? (
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs uppercase tracking-widest text-kraft mb-1">
                    {kategori === 'dizi' ? 'Yaratıcı' : 'Yönetmen'}
                  </label>
                  <input
                    type="text"
                    value={yonetmen}
                    onChange={(e) => setYonetmen(e.target.value)}
                    className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Oyuncular</label>
                  <input
                    type="text"
                    value={oyuncular}
                    onChange={(e) => setOyuncular(e.target.value)}
                    className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Yayınevi</label>
                <input
                  type="text"
                  value={yayinevi}
                  onChange={(e) => setYayinevi(e.target.value)}
                  className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
            )}
          </>
        )}

        {!(kategori === 'yazi' && yaziAltTur === 'deneme') && (
          <div>
            <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Puanın</label>
            <select
              value={kullaniciPuani}
              onChange={(e) => setKullaniciPuani(Number(e.target.value))}
              className="rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            >
              {YILDIZ_SECENEKLERI.map((s) => (
                <option key={s} value={s}>
                  {s} ★ ({(s * 2).toFixed(1)}/10)
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          {kategori !== 'yazi' && (
            <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Güncen</label>
          )}
          {kategori === 'yazi' && (
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={gorselEkle}
                className="rounded-sm bg-kagitKoyu px-3 py-1 font-govde text-xs text-kraft ring-1 ring-cizgi hover:ring-deniz/50"
              >
                🖼 Görsel Ekle
              </button>
              <p className="text-[11px] text-kraft">İpucu: bir görsel linkini kendi satırına yapıştırırsan otomatik resme dönüşür</p>
            </div>
          )}
          <textarea
            ref={gunceRef}
            value={gunce}
            onChange={(e) => setGunce(e.target.value)}
            rows={kategori === 'yazi' ? 16 : 5}
            placeholder={kategori === 'yazi' ? 'Yazmaya başla...' : 'Ne düşünüyorsun, nasıl geçti?'}
            className={
              kategori === 'yazi'
                ? 'w-full resize-y rounded-sm bg-kagitKoyu px-4 py-4 font-govde text-base leading-relaxed text-murekkep placeholder-kraft/50 ring-1 ring-cizgi focus:ring-2 focus:ring-deniz focus:outline-none min-h-[50vh]'
                : 'w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi'
            }
          />
          {kategori === 'yazi' && (
            <p className="mt-1 text-right text-xs text-kraft">
              {gunce.trim() ? gunce.trim().split(/\s+/).length : 0} kelime
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={kaydediliyor}
          className="rounded-sm bg-muhur px-5 py-2 font-govde text-sm font-medium text-kagit disabled:opacity-40"
        >
          {kaydediliyor ? 'Paylaşılıyor...' : 'Paylaş'}
        </button>
      </form>
    </div>
  )
}

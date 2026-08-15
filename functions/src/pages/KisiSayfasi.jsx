import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { favoriEkle, favoriKaldir } from '../utils/favori.js'
import { favoriMi } from '../hooks/useFavoriler.js'
import { kisiDegerlendir } from '../utils/kisiDegerlendirme.js'
import { useKisiDegerlendirmeleri } from '../hooks/useKisiDegerlendirmeleri.js'
import YildizPuan from '../components/YildizPuan.jsx'
import YildizSecici from '../components/YildizSecici.jsx'
import { esereAitListeleriGetir } from '../utils/kisiselListe.js'
import { ilgiliEserEkle, ilgiliEserleriGetir, ilgiliEserSil } from '../utils/ilgiliEser.js'
import { ilgiliKitaplarGetir as eskiYonetmenKitaplariGetir, ilgiliKitapSil as eskiIlgiliKitapSil } from '../utils/yonetmen.js'

import { kitapAramaSonucundanKaydet, kitapElleEkle } from '../utils/kitapKatalog.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w342'
const TMDB_PROFIL = 'https://image.tmdb.org/t/p/w300'
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
const DIL_ADLARI = { tr: 'Türkçe', en: 'İngilizce', de: 'Almanca', fr: 'Fransızca', es: 'İspanyolca', it: 'İtalyanca', ru: 'Rusça' }

export default function KisiSayfasi() {
  const { id } = useParams()
  const { kullanici } = useAuth()
  const [kisi, setKisi] = useState(null)
  const [yonetmenIsleri, setYonetmenIsleri] = useState([])
  const [oyunculukIsleri, setOyunculukIsleri] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')

  const [favoriMi_, setFavoriMi_] = useState(false)
  const [favoriIsleniyor, setFavoriIsleniyor] = useState(false)

  const {
    degerlendirmeler,
    ortalamaPuan,
    puanSayisi,
    kullanicininDegerlendirmesi,
    yenidenYukle: degerlendirmeleriYenile,
  } = useKisiDegerlendirmeleri(id)

  const [puanTaslak, setPuanTaslak] = useState(4)
  const [yorumTaslak, setYorumTaslak] = useState('')
  const [degerlendirmeKaydediliyor, setDegerlendirmeKaydediliyor] = useState(false)

  const [ilgiliKitaplar, setIlgiliKitaplar] = useState([])
  const [ilgiliEkleAcik, setIlgiliEkleAcik] = useState(false)
  const [ilgiliArama, setIlgiliArama] = useState('')
  const [ilgiliSonuclar, setIlgiliSonuclar] = useState([])
  const [ilgiliAramaYukleniyor, setIlgiliAramaYukleniyor] = useState(false)
  const [ilgiliEkleniyor, setIlgiliEkleniyor] = useState(null)
  const [ilgiliElleAcik, setIlgiliElleAcik] = useState(false)
  const [ilgiliElleForm, setIlgiliElleForm] = useState({ baslik: '', yazar: '', yayinevi: '', yil: '', posterUrl: '' })
  const [ilgiliElleKaydediliyor, setIlgiliElleKaydediliyor] = useState(false)

  useEffect(() => {
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      setHata('')
      try {
        if (!TMDB_API_KEY) throw new Error('TMDB API anahtarı tanımlı değil.')

        const kisiUrl = `https://api.themoviedb.org/3/person/${id}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=images`
        const kisiRes = await fetch(kisiUrl)
        const kisiData = await kisiRes.json()
        if (!kisiRes.ok) throw new Error(kisiData.status_message || `HTTP ${kisiRes.status}`)
        if (iptal) return

        // TMDB birçok kişi için Türkçe biyografi sağlamıyor — boşsa İngilizce'sine geri dön.
        if (!kisiData.biography) {
          try {
            const enUrl = `https://api.themoviedb.org/3/person/${id}?api_key=${TMDB_API_KEY}&language=en-US`
            const enRes = await fetch(enUrl)
            const enData = await enRes.json()
            if (enData.biography) kisiData.biography = enData.biography
          } catch {
            // sessizce geç, biyografi olmadan devam
          }
        }
        setKisi(kisiData)

        if (kullanici) {
          const varMi = await favoriMi(kullanici.uid, 'kisi', id)
          if (!iptal) setFavoriMi_(varMi)
        }

        const krediUrl = `https://api.themoviedb.org/3/person/${id}/combined_credits?api_key=${TMDB_API_KEY}&language=tr-TR`
        const krediRes = await fetch(krediUrl)
        const krediData = await krediRes.json()
        if (iptal) return

        const yonetmenlik = (krediData.crew || [])
          .filter((k) => k.job === 'Director' || k.job === 'Creator')
          .sort((a, b) => (b.release_date || b.first_air_date || '').localeCompare(a.release_date || a.first_air_date || ''))
        const oyunculuk = (krediData.cast || []).sort((a, b) =>
          (b.release_date || b.first_air_date || '').localeCompare(a.release_date || a.first_air_date || '')
        )

        const tekillestir = (liste) => {
          const gorulen = new Set()
          return liste.filter((k) => {
            if (gorulen.has(k.id)) return false
            gorulen.add(k.id)
            return true
          })
        }

        setYonetmenIsleri(tekillestir(yonetmenlik))
        setOyunculukIsleri(tekillestir(oyunculuk))
      } catch (err) {
        if (!iptal) setHata(err.message)
      } finally {
        if (!iptal) setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [id, kullanici])

  useEffect(() => {
    if (kullanicininDegerlendirmesi) {
      setPuanTaslak(kullanicininDegerlendirmesi.puan)
      setYorumTaslak(kullanicininDegerlendirmesi.yorum || '')
    }
  }, [kullanicininDegerlendirmesi])

  useEffect(() => {
    let iptal = false
    Promise.all([ilgiliEserleriGetir('kisi', Number(id), kullanici?.uid), eskiYonetmenKitaplariGetir(id).catch(() => [])]).then(
      ([genelListe, eskiListe]) => {
        if (iptal) return
        // Eski (yönetmen sayfasına özel) kayıtları genel listeyle aynı şekle
        // dönüştürüp birleştiriyoruz — kullanıcı ikisi arasındaki farkı hiç
        // görmüyor, hepsi tek bir "İlgili Kitaplar" listesi gibi duruyor.
        const eskiDonusturulmus = eskiListe.map((k) => ({
          id: `eski-${k.id}`,
          digerTur: 'kitap',
          digerDisId: k.googleBooksId,
          digerBaslik: k.baslik,
          digerPosterUrl: k.posterUrl,
          digerAlt: k.yazar,
          eski: true,
        }))
        setIlgiliKitaplar([...genelListe, ...eskiDonusturulmus])
      }
    )
    return () => {
      iptal = true
    }
  }, [id, kullanici?.uid])

  async function ilgiliAra(e) {
    e.preventDefault()
    if (!ilgiliArama.trim()) return
    setIlgiliAramaYukleniyor(true)
    setIlgiliSonuclar([])
    try {
      const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(ilgiliArama)}&maxResults=10${anahtarParcasi}`
      const res = await fetch(url)
      const data = await res.json()
      setIlgiliSonuclar(data.items || [])
    } finally {
      setIlgiliAramaYukleniyor(false)
    }
  }

  async function ilgiliSec(item) {
    if (!kullanici) return
    setIlgiliEkleniyor(item.id)
    try {
      const kitap = await kitapAramaSonucundanKaydet(item)
      const hedef = { tur: 'kitap', disId: kitap.id, baslik: kitap.baslik, alt: kitap.yazar, posterUrl: kitap.posterUrl }
      const kaynak = {
        tur: 'kisi',
        disId: Number(id),
        baslik: kisi.name,
        alt: kisi.known_for_department || '',
        posterUrl: kisi.profile_path ? `${TMDB_PROFIL}${kisi.profile_path}` : '',
      }
      await ilgiliEserEkle(kaynak, hedef, kullanici)
      setIlgiliKitaplar((onceki) => [
        ...onceki,
        { digerTur: 'kitap', digerDisId: hedef.disId, digerBaslik: hedef.baslik, digerPosterUrl: hedef.posterUrl, digerAlt: hedef.alt },
      ])
      setIlgiliArama('')
      setIlgiliSonuclar([])
      setIlgiliEkleAcik(false)
    } finally {
      setIlgiliEkleniyor(null)
    }
  }

  async function ilgiliElleKaydet(e) {
    e.preventDefault()
    if (!ilgiliElleForm.baslik.trim() || !kullanici) return
    setIlgiliElleKaydediliyor(true)
    try {
      const kitap = await kitapElleEkle(ilgiliElleForm, kullanici)
      const hedef = { tur: 'kitap', disId: kitap.id, baslik: kitap.baslik, alt: kitap.yazar, posterUrl: kitap.posterUrl }
      const kaynak = {
        tur: 'kisi',
        disId: Number(id),
        baslik: kisi.name,
        alt: kisi.known_for_department || '',
        posterUrl: kisi.profile_path ? `${TMDB_PROFIL}${kisi.profile_path}` : '',
      }
      await ilgiliEserEkle(kaynak, hedef, kullanici)
      setIlgiliKitaplar((onceki) => [
        ...onceki,
        { digerTur: 'kitap', digerDisId: hedef.disId, digerBaslik: hedef.baslik, digerPosterUrl: hedef.posterUrl, digerAlt: hedef.alt },
      ])
      setIlgiliElleAcik(false)
      setIlgiliEkleAcik(false)
    } finally {
      setIlgiliElleKaydediliyor(false)
    }
  }

  async function ilgiliKaldirTiklandi(kitap) {
    if (!window.confirm('Bu bağlantıyı kaldırmak istediğine emin misin?')) return
    if (kitap.eski) {
      // Eski (yönetmen sayfasına özel) kayıt — ayrı bir alt koleksiyonda duruyor.
      await eskiIlgiliKitapSil(id, kitap.id.replace('eski-', ''))
    } else {
      const kaynak = { tur: 'kisi', disId: Number(id) }
      await ilgiliEserSil(kaynak, { tur: 'kitap', disId: kitap.digerDisId })
    }
    setIlgiliKitaplar((onceki) => onceki.filter((k) => k !== kitap))
  }

  async function favoriDegistir() {
    if (!kullanici || !kisi) return
    setFavoriIsleniyor(true)
    try {
      if (favoriMi_) {
        await favoriKaldir(kullanici.uid, 'kisi', id)
      } else {
        await favoriEkle(kullanici, {
          tur: 'kisi',
          disId: id,
          baslik: kisi.name,
          alt: kisi.known_for_department || '',
          posterUrl: kisi.profile_path ? `${TMDB_PROFIL}${kisi.profile_path}` : '',
        })
      }
      setFavoriMi_(!favoriMi_)
    } finally {
      setFavoriIsleniyor(false)
    }
  }

  async function degerlendirmeGonder(e) {
    e.preventDefault()
    if (!kullanici) return
    setDegerlendirmeKaydediliyor(true)
    try {
      await kisiDegerlendir(id, {
        puan: puanTaslak,
        yorum: yorumTaslak,
        kisiAdi: kisi.name,
        kisiFotoUrl: kisi.profile_path ? `${TMDB_PROFIL}${kisi.profile_path}` : '',
        kullanici,
      })
      degerlendirmeleriYenile()
    } finally {
      setDegerlendirmeKaydediliyor(false)
    }
  }

  if (yukleniyor) return <p className="text-sm text-kraft">Yükleniyor...</p>
  if (hata) return <p className="text-sm text-muhur">Bilgi alınamadı: {hata}</p>
  if (!kisi) return <p className="text-sm text-kraft">Bulunamadı.</p>

  function IsGrid({ isler }) {
    if (isler.length === 0) return <p className="text-sm text-kraft">Kayıt yok.</p>
    return (
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
        {isler.slice(0, 24).map((is) => {
          const tur = is.media_type === 'tv' ? 'dizi' : 'sinema'
          const baslik = is.title || is.name
          const yil = (is.release_date || is.first_air_date || '').slice(0, 4)
          return (
            <Link key={`${is.credit_id}-${is.id}`} to={`/${tur === 'dizi' ? 'dizi' : 'film'}/${is.id}`} className="block">
              <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                {is.poster_path && <img src={`${TMDB_POSTER}${is.poster_path}`} alt={baslik} className="h-full w-full object-cover" />}
              </div>
              <p className="mt-1 truncate text-xs text-murekkep">{baslik}</p>
              {yil && <p className="text-[11px] text-kraft">{yil}</p>}
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
        {kisi.profile_path && (
          <img
            src={`${TMDB_PROFIL}${kisi.profile_path}`}
            alt={kisi.name}
            className="h-40 w-28 shrink-0 self-center rounded-sm object-cover ring-1 ring-cizgi sm:self-start"
          />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-baslik text-2xl text-murekkep">{kisi.name}</h1>
          {kisi.known_for_department && <p className="text-xs text-kraft">{kisi.known_for_department}</p>}
          {kisi.biography && <p className="mt-2 text-sm text-murekkep leading-relaxed line-clamp-6">{kisi.biography}</p>}

          {kisi.images?.profiles?.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {kisi.images.profiles.slice(0, 8).map((p, i) => (
                <img
                  key={i}
                  src={`https://image.tmdb.org/t/p/w185${p.file_path}`}
                  alt=""
                  className="h-24 w-16 shrink-0 rounded-sm object-cover ring-1 ring-cizgi"
                />
              ))}
            </div>
          )}

          {kullanici && (
            <div className="mt-3 flex flex-wrap items-start gap-6">
              <button onClick={favoriDegistir} disabled={favoriIsleniyor} className="flex flex-col items-center gap-1 disabled:opacity-40">
                <span className={`text-2xl ${favoriMi_ ? 'text-muhur' : 'text-cizgi'}`}>{favoriMi_ ? '♥' : '♡'}</span>
                <span className="text-[10px] uppercase tracking-wide text-kraft">Favori</span>
              </button>

              <div className="relative flex flex-col items-center gap-1">
                <button onClick={() => setIlgiliEkleAcik((a) => !a)} className="flex flex-col items-center gap-1">
                  <span className="text-2xl text-cizgi">📚</span>
                  <span className="text-[10px] uppercase tracking-wide text-kraft">İlgili Kitap</span>
                </button>
                {ilgiliEkleAcik && (
                  <div className="absolute left-0 top-full z-10 mt-1 w-72 space-y-2 rounded-sm bg-kagit p-3 shadow-lg ring-1 ring-cizgi">
                    {ilgiliElleAcik ? (
                      <form onSubmit={ilgiliElleKaydet} className="space-y-2">
                        <p className="text-[11px] uppercase tracking-widest text-gise">Kitabı Elle Ekle</p>
                        <input
                          value={ilgiliElleForm.baslik}
                          onChange={(e) => setIlgiliElleForm((f) => ({ ...f, baslik: e.target.value }))}
                          placeholder="Başlık *"
                          required
                          className="w-full rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                        />
                        <input
                          value={ilgiliElleForm.yazar}
                          onChange={(e) => setIlgiliElleForm((f) => ({ ...f, yazar: e.target.value }))}
                          placeholder="Yazar"
                          className="w-full rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                        />
                        <div className="flex gap-2">
                          <input
                            value={ilgiliElleForm.yayinevi}
                            onChange={(e) => setIlgiliElleForm((f) => ({ ...f, yayinevi: e.target.value }))}
                            placeholder="Yayınevi"
                            className="flex-1 rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                          />
                          <input
                            value={ilgiliElleForm.yil}
                            onChange={(e) => setIlgiliElleForm((f) => ({ ...f, yil: e.target.value }))}
                            placeholder="Yıl"
                            className="w-16 rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                          />
                        </div>
                        <input
                          value={ilgiliElleForm.posterUrl}
                          onChange={(e) => setIlgiliElleForm((f) => ({ ...f, posterUrl: e.target.value }))}
                          placeholder="Kapak görseli URL'i (opsiyonel)"
                          className="w-full rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={ilgiliElleKaydediliyor || !ilgiliElleForm.baslik.trim()}
                            className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
                          >
                            {ilgiliElleKaydediliyor ? 'Ekleniyor...' : 'Kaydet'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIlgiliElleAcik(false)}
                            className="rounded-sm bg-kagitKoyu px-3 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi"
                          >
                            Vazgeç
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <form onSubmit={ilgiliAra} className="flex gap-2">
                          <input
                            type="text"
                            value={ilgiliArama}
                            onChange={(e) => setIlgiliArama(e.target.value)}
                            placeholder="Kitap ara..."
                            className="flex-1 rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                          />
                          <button type="submit" className="rounded-sm bg-deniz px-2 py-1 font-govde text-xs text-kagit">
                            {ilgiliAramaYukleniyor ? '...' : 'Ara'}
                          </button>
                        </form>
                        {ilgiliSonuclar.length > 0 && (
                          <ul className="max-h-56 space-y-1 overflow-y-auto">
                            {ilgiliSonuclar.slice(0, 10).map((item) => {
                              const v = item.volumeInfo || {}
                              const kapak = (v.imageLinks?.thumbnail || '').replace('http://', 'https://')
                              const altSatir = [(v.authors || []).join(', '), v.publisher, DIL_ADLARI[v.language] || v.language]
                                .filter(Boolean)
                                .join(' · ')
                              return (
                                <li key={item.id}>
                                  <button
                                    type="button"
                                    onClick={() => ilgiliSec(item)}
                                    disabled={ilgiliEkleniyor === item.id}
                                    className="flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-left hover:bg-kagitKoyu disabled:opacity-40"
                                  >
                                    {kapak && <img src={kapak} alt="" className="h-9 w-6 shrink-0 rounded-sm object-cover" />}
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs text-murekkep">{ilgiliEkleniyor === item.id ? 'Ekleniyor...' : v.title}</p>
                                      {altSatir && <p className="truncate text-[10px] text-kraft">{altSatir}</p>}
                                    </div>
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setIlgiliElleForm({ baslik: ilgiliArama, yazar: '', yayinevi: '', yil: '', posterUrl: '' })
                            setIlgiliElleAcik(true)
                          }}
                          className="text-[11px] text-kraft hover:text-deniz hover:underline"
                        >
                          Aradığını bulamadın mı? Elle ekle →
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {ilgiliKitaplar.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 text-xs text-kraft">📚 İlgili Kitaplar</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {ilgiliKitaplar.map((k) => (
                  <div key={k.id || `yeni-${k.digerDisId}`} className="group relative w-16 shrink-0">
                    <Link to={`/kitap/${k.digerDisId}`}>
                      <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                        {k.digerPosterUrl && <img src={k.digerPosterUrl} alt={k.digerBaslik} className="h-full w-full object-cover" />}
                      </div>
                      <p className="mt-1 truncate text-[11px] text-murekkep">{k.digerBaslik}</p>
                    </Link>
                    {kullanici && (
                      <button
                        onClick={() => ilgiliKaldirTiklandi(k)}
                        className="absolute right-0 top-0 rounded-full bg-kagit/90 px-1 text-[10px] text-kraft opacity-0 ring-1 ring-cizgi transition-opacity hover:text-muhur group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {kullanici ? (
              <YildizSecici
                deger={puanTaslak}
                onSec={(p) => {
                  setPuanTaslak(p)
                  kisiDegerlendir(id, { puan: p, yorum: yorumTaslak, kisiAdi: kisi.name, kisiFotoUrl: kisi.profile_path ? `${TMDB_PROFIL}${kisi.profile_path}` : '', kullanici }).then(degerlendirmeleriYenile)
                }}
                boyut="text-lg"
              />
            ) : (
              <YildizSecici deger={ortalamaPuan} disabled boyut="text-lg" />
            )}
            <span className="text-xs text-kraft">
              {ortalamaPuan != null ? `Topluluk: ${ortalamaPuan.toFixed(1)} (${puanSayisi} kişi)` : 'Henüz kimse puanlamadı'}
            </span>
          </div>
        </div>
      </div>

      {kullanici && (
        <form onSubmit={degerlendirmeGonder} className="mt-4 max-w-md">
          <textarea
            value={yorumTaslak}
            onChange={(e) => setYorumTaslak(e.target.value)}
            rows={2}
            placeholder="Kısa bir yorum (opsiyonel)"
            className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
          <button
            type="submit"
            disabled={degerlendirmeKaydediliyor}
            className="mt-2 rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {degerlendirmeKaydediliyor ? 'Kaydediliyor...' : 'Yorumu Kaydet'}
          </button>
        </form>
      )}

      {degerlendirmeler.length > 0 && (
        <div className="mt-6">
          <p className="font-govde text-sm text-murekkep mb-2">Topluluk Yorumları</p>
          <ul className="space-y-2">
            {degerlendirmeler
              .filter((d) => d.yorum)
              .map((d) => (
                <li key={d.id} className="rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
                  <div className="flex items-center gap-2 text-xs text-kraft">
                    <span className="font-medium text-murekkep">{d.kullaniciAdi}</span>
                    <YildizPuan puan={d.puan} boyut="text-xs" />
                  </div>
                  <p className="mt-1 text-sm text-murekkep">{d.yorum}</p>
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="defter-cizgi my-6" />

      {yonetmenIsleri.length > 0 && (
        <div className="mb-8">
          <h2 className="font-baslik text-lg text-murekkep mb-3">Yönetmenliğini Yaptıkları</h2>
          <IsGrid isler={yonetmenIsleri} />
        </div>
      )}

      <div className="mb-8">
        <h2 className="font-baslik text-lg text-murekkep mb-3">Oyunculuk Yaptıkları</h2>
        <IsGrid isler={oyunculukIsleri} />
      </div>
    </div>
  )
}

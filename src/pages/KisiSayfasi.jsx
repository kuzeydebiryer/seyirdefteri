import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { favoriEkle, favoriKaldir } from '../utils/favori.js'
import { favoriMi } from '../hooks/useFavoriler.js'
import { kisiDegerlendir } from '../utils/kisiDegerlendirme.js'
import { useKisiDegerlendirmeleri } from '../hooks/useKisiDegerlendirmeleri.js'
import YildizPuan from '../components/YildizPuan.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w342'
const TMDB_PROFIL = 'https://image.tmdb.org/t/p/w300'
const YILDIZ_SECENEKLERI = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

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

  useEffect(() => {
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      setHata('')
      try {
        if (!TMDB_API_KEY) throw new Error('TMDB API anahtarı tanımlı değil.')

        const kisiUrl = `https://api.themoviedb.org/3/person/${id}?api_key=${TMDB_API_KEY}&language=tr-TR`
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
      <div className="flex gap-5">
        {kisi.profile_path && (
          <img
            src={`${TMDB_PROFIL}${kisi.profile_path}`}
            alt={kisi.name}
            className="h-40 w-28 shrink-0 rounded-sm object-cover ring-1 ring-cizgi"
          />
        )}
        <div>
          <h1 className="font-baslik text-2xl text-murekkep">{kisi.name}</h1>
          {kisi.known_for_department && <p className="text-xs text-kraft">{kisi.known_for_department}</p>}
          {kisi.biography && <p className="mt-2 text-sm text-murekkep leading-relaxed line-clamp-6">{kisi.biography}</p>}

          {kullanici && (
            <button
              onClick={favoriDegistir}
              disabled={favoriIsleniyor}
              className={`mt-3 rounded-sm px-3 py-1.5 font-govde text-xs ${
                favoriMi_ ? 'bg-muhur text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
              } disabled:opacity-40`}
            >
              {favoriMi_ ? '★ Favorilerimde' : '☆ Favorilere Ekle'}
            </button>
          )}

          <div className="mt-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi inline-block">
            <p className="text-xs uppercase tracking-widest text-gise">Topluluk Ortalaması</p>
            {ortalamaPuan != null ? (
              <div className="mt-1 flex items-center gap-2">
                <YildizPuan puan={Math.round(ortalamaPuan * 2) / 2} boyut="text-lg" />
                <span className="text-xs text-kraft">({puanSayisi} kişi puanladı)</span>
              </div>
            ) : (
              <p className="mt-1 text-sm text-kraft">Henüz kimse puanlamadı.</p>
            )}
          </div>
        </div>
      </div>

      {kullanici && (
        <form onSubmit={degerlendirmeGonder} className="mt-6 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi max-w-md">
          <p className="font-govde text-sm text-murekkep">
            {kullanicininDegerlendirmesi ? 'Değerlendirmeni güncelle' : 'Bu kişiyi değerlendir'}
          </p>
          <select
            value={puanTaslak}
            onChange={(e) => setPuanTaslak(Number(e.target.value))}
            className="rounded-sm bg-kagit px-2 py-1 text-sm text-murekkep ring-1 ring-cizgi"
          >
            {YILDIZ_SECENEKLERI.map((s) => (
              <option key={s} value={s}>
                {s} ★
              </option>
            ))}
          </select>
          <textarea
            value={yorumTaslak}
            onChange={(e) => setYorumTaslak(e.target.value)}
            rows={2}
            placeholder="Kısa bir yorum (opsiyonel)"
            className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
          <button
            type="submit"
            disabled={degerlendirmeKaydediliyor}
            className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {degerlendirmeKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
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

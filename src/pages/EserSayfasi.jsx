import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useEserGonderileri } from '../hooks/useEser.js'
import { useAuth } from '../context/AuthContext.jsx'
import { favoriEkle, favoriKaldir } from '../utils/favori.js'
import { favoriMi } from '../hooks/useFavoriler.js'
import { izlenecekEkle, izlenecekKaldir, izlenecekMi } from '../utils/izlenecek.js'
import YildizPuan from '../components/YildizPuan.jsx'
import Avatar from '../components/Avatar.jsx'
import GonderiIcerik from '../components/GonderiIcerik.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'
const TMDB_SAGLAYICI_LOGO = 'https://image.tmdb.org/t/p/w92'
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

function KisiListesi({ kisiler, etiket }) {
  if (!kisiler || kisiler.length === 0) return null
  return (
    <p className="mt-1 text-xs text-murekkep">
      <span className="text-kraft">{etiket}: </span>
      {kisiler.map((k, i) => (
        <span key={k.id}>
          <Link to={`/kisi/${k.id}`} className="hover:underline hover:text-deniz">
            {k.name}
          </Link>
          {i < kisiler.length - 1 && ', '}
        </span>
      ))}
    </p>
  )
}

export default function EserSayfasi({ tur }) {
  const { id } = useParams()
  const { kullanici } = useAuth()
  const { gonderiler, yukleniyor: gonderilerYukleniyor, ortalamaPuan, puanSayisi, kullanicininPuani } = useEserGonderileri(tur, id)

  const [detay, setDetay] = useState(null)
  const [saglayicilar, setSaglayicilar] = useState(null)
  const [detayYukleniyor, setDetayYukleniyor] = useState(true)
  const [hata, setHata] = useState('')

  const [favoriMi_, setFavoriMi_] = useState(false)
  const [izlenecekMi_, setIzlenecekMi_] = useState(false)
  const [favoriIsleniyor, setFavoriIsleniyor] = useState(false)
  const [izlenecekIsleniyor, setIzlenecekIsleniyor] = useState(false)

  useEffect(() => {
    let iptal = false
    async function getir() {
      setDetayYukleniyor(true)
      setHata('')
      try {
        if (tur === 'sinema' || tur === 'dizi') {
          if (!TMDB_API_KEY) throw new Error('TMDB API anahtarı tanımlı değil.')
          const uc = tur === 'sinema' ? 'movie' : 'tv'
          const url = `https://api.themoviedb.org/3/${uc}/${id}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=credits`
          const res = await fetch(url)
          const data = await res.json()
          if (!res.ok) throw new Error(data.status_message || `HTTP ${res.status}`)
          if (iptal) return

          const yonetmenler =
            tur === 'sinema'
              ? (data.credits?.crew || []).filter((k) => k.job === 'Director').map((k) => ({ id: k.id, name: k.name }))
              : (data.created_by || []).map((k) => ({ id: k.id, name: k.name }))
          const oyuncular = (data.credits?.cast || []).slice(0, 6).map((k) => ({ id: k.id, name: k.name }))

          setDetay({
            baslik: tur === 'sinema' ? data.title : data.name,
            yil: (tur === 'sinema' ? data.release_date : data.first_air_date)?.slice(0, 4),
            posterUrl: data.poster_path ? `${TMDB_POSTER}${data.poster_path}` : '',
            ozet: data.overview,
            turler: (data.genres || []).map((g) => g.name).join(', '),
            sureDk: tur === 'sinema' ? data.runtime : null,
            sezonSayisi: tur === 'dizi' ? data.number_of_seasons : null,
            bolumSayisi: tur === 'dizi' ? data.number_of_episodes : null,
            yonetmenler,
            oyuncular,
            dbPuan: data.vote_average ? data.vote_average.toFixed(1) : null,
          })

          // Nerede İzlenebilir (Türkiye) — TMDB'nin JustWatch verisi üzerinden sağladığı uç nokta
          try {
            const spUrl = `https://api.themoviedb.org/3/${uc}/${id}/watch/providers?api_key=${TMDB_API_KEY}`
            const spRes = await fetch(spUrl)
            const spData = await spRes.json()
            if (!iptal) setSaglayicilar(spData.results?.TR || null)
          } catch (e) {
            console.warn('İzleme sağlayıcıları alınamadı:', e.message)
          }
        } else if (tur === 'kitap') {
          const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
          const url = `https://www.googleapis.com/books/v1/volumes/${id}?${anahtarParcasi}`
          const res = await fetch(url)
          const data = await res.json()
          if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`)
          if (iptal) return
          const v = data.volumeInfo || {}
          setDetay({
            baslik: v.title,
            yazar: (v.authors || []).join(', '),
            yil: v.publishedDate?.slice(0, 4),
            posterUrl: (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://'),
            ozet: v.description,
            turler: (v.categories || []).join(', '),
            sayfaSayisi: v.pageCount,
            yayinevi: v.publisher,
            dbPuan: v.averageRating ? v.averageRating.toFixed(1) : null,
          })
        }
      } catch (err) {
        if (!iptal) setHata(err.message)
      } finally {
        if (!iptal) setDetayYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [tur, id])

  useEffect(() => {
    let iptal = false
    async function kontrolEt() {
      if (!kullanici) {
        setFavoriMi_(false)
        setIzlenecekMi_(false)
        return
      }
      const [fav, izl] = await Promise.all([favoriMi(kullanici.uid, tur, id), izlenecekMi(kullanici.uid, tur, id)])
      if (!iptal) {
        setFavoriMi_(fav)
        setIzlenecekMi_(izl)
      }
    }
    kontrolEt()
    return () => {
      iptal = true
    }
  }, [kullanici, tur, id])

  async function favoriDegistir() {
    if (!kullanici || !detay) return
    setFavoriIsleniyor(true)
    try {
      if (favoriMi_) {
        await favoriKaldir(kullanici.uid, tur, id)
      } else {
        await favoriEkle(kullanici, {
          tur,
          disId: id,
          baslik: detay.baslik,
          alt: detay.yazar || '',
          posterUrl: detay.posterUrl,
        })
      }
      setFavoriMi_(!favoriMi_)
    } finally {
      setFavoriIsleniyor(false)
    }
  }

  async function izlenecekDegistir() {
    if (!kullanici || !detay) return
    setIzlenecekIsleniyor(true)
    try {
      if (izlenecekMi_) {
        await izlenecekKaldir(kullanici.uid, tur, id)
      } else {
        await izlenecekEkle(kullanici, {
          tur,
          disId: id,
          baslik: detay.baslik,
          alt: detay.yazar || '',
          posterUrl: detay.posterUrl,
        })
      }
      setIzlenecekMi_(!izlenecekMi_)
    } finally {
      setIzlenecekIsleniyor(false)
    }
  }

  const basliklar = { sinema: 'film', dizi: 'dizi', kitap: 'kitap' }
  const eklemeLinki = `/gonderi-ekle?tur=${tur}&disId=${id}`

  if (detayYukleniyor) return <p className="text-sm text-kraft">Yükleniyor...</p>
  if (hata) return <p className="text-sm text-muhur">Bilgi alınamadı: {hata}</p>
  if (!detay) return <p className="text-sm text-kraft">Bulunamadı.</p>

  const izlemeSecenekleri = saglayicilar
    ? [
        { etiket: 'Abonelik', liste: saglayicilar.flatrate },
        { etiket: 'Kirala', liste: saglayicilar.rent },
        { etiket: 'Satın Al', liste: saglayicilar.buy },
      ].filter((s) => s.liste && s.liste.length > 0)
    : []

  return (
    <div>
      <div className="flex gap-5">
        {detay.posterUrl && (
          <img src={detay.posterUrl} alt={detay.baslik} className="h-56 w-40 shrink-0 rounded-sm object-cover ring-1 ring-cizgi" />
        )}
        <div>
          <h1 className="font-baslik text-3xl text-murekkep">
            {detay.baslik} {detay.yil && <span className="text-kraft text-xl">({detay.yil})</span>}
          </h1>
          {detay.yazar && <p className="text-sm text-kraft mt-1">{detay.yazar}</p>}

          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-kraft">
            {detay.turler && <span>{detay.turler}</span>}
            {detay.sureDk && <span>⏱ {detay.sureDk} dk</span>}
            {detay.sezonSayisi && <span>📺 {detay.sezonSayisi} sezon</span>}
            {detay.bolumSayisi && <span>{detay.bolumSayisi} bölüm</span>}
            {detay.sayfaSayisi && <span>📄 {detay.sayfaSayisi} sayfa</span>}
            {detay.yayinevi && <span>{detay.yayinevi}</span>}
            {detay.dbPuan && <span>{tur === 'kitap' ? 'Google' : 'TMDB'} {detay.dbPuan}</span>}
          </div>

          <KisiListesi kisiler={detay.yonetmenler} etiket={tur === 'dizi' ? 'Yaratıcı' : 'Yönetmen'} />
          <KisiListesi kisiler={detay.oyuncular} etiket="Oyuncular" />

          {kullanici && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={favoriDegistir}
                disabled={favoriIsleniyor}
                className={`rounded-sm px-3 py-1.5 font-govde text-xs ${
                  favoriMi_ ? 'bg-muhur text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
                } disabled:opacity-40`}
              >
                {favoriMi_ ? '★ Favorilerimde' : '☆ Favorilere Ekle'}
              </button>
              <button
                onClick={izlenecekDegistir}
                disabled={izlenecekIsleniyor}
                className={`rounded-sm px-3 py-1.5 font-govde text-xs ${
                  izlenecekMi_ ? 'bg-deniz text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
                } disabled:opacity-40`}
              >
                {izlenecekMi_ ? '✓ İzlenecekler Listemde' : `+ ${tur === 'kitap' ? 'Okuyacaklarıma' : 'İzleyeceklerime'} Ekle`}
              </button>
            </div>
          )}

          {/* Topluluk ortalaması — bu esere şimdiye kadar verilen tüm puanların ortalaması */}
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi inline-block">
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

            {kullanicininPuani != null && (
              <div className="rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi inline-block">
                <p className="text-xs uppercase tracking-widest text-gise">Senin Puanın</p>
                <div className="mt-1">
                  <YildizPuan puan={kullanicininPuani} boyut="text-lg" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {detay.ozet && <p className="mt-4 text-sm text-murekkep leading-relaxed">{detay.ozet}</p>}

      {(tur === 'sinema' || tur === 'dizi') && izlemeSecenekleri.length > 0 && (
        <div className="mt-6">
          <h2 className="font-baslik text-lg text-murekkep mb-2">Nerede İzlenebilir</h2>
          <div className="space-y-2">
            {izlemeSecenekleri.map((s) => (
              <div key={s.etiket} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-xs text-kraft">{s.etiket}</span>
                <div className="flex flex-wrap gap-2">
                  {s.liste.map((p) => (
                    <img
                      key={p.provider_id}
                      src={`${TMDB_SAGLAYICI_LOGO}${p.logo_path}`}
                      alt={p.provider_name}
                      title={p.provider_name}
                      className="h-8 w-8 rounded-sm ring-1 ring-cizgi"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-kraft">
            Veriler{' '}
            {saglayicilar?.link ? (
              <a href={saglayicilar.link} target="_blank" rel="noreferrer" className="hover:underline">
                JustWatch
              </a>
            ) : (
              'JustWatch'
            )}{' '}
            tarafından sağlanmaktadır. Bölgeye ve zamana göre değişebilir.
          </p>
        </div>
      )}

      {kullanici && (
        <Link
          to={eklemeLinki}
          className="mt-4 inline-block rounded-sm bg-muhur px-4 py-2 font-govde text-sm text-kagit"
        >
          Bu {basliklar[tur]} hakkında günce yaz
        </Link>
      )}

      <div className="defter-cizgi my-6" />

      <h2 className="font-baslik text-lg text-murekkep mb-3">Topluluk Güncesi</h2>
      {gonderilerYukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {!gonderilerYukleniyor && gonderiler.length === 0 && (
        <p className="text-sm text-kraft">Bu {basliklar[tur]} hakkında henüz kimse günce yazmadı.</p>
      )}

      <ul className="space-y-4">
        {gonderiler.map((g) => (
          <li key={g.id} className="rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
            <div className="flex items-center gap-2 text-xs text-kraft">
              <Link to={`/profil/${g.yazarId}`} className="flex items-center gap-2">
                <Avatar adSoyad={g.yazarAdi} avatarUrl={g.yazarAvatarUrl} boyut="h-5 w-5" />
                <span className="font-medium text-murekkep">{g.yazarAdi}</span>
              </Link>
              {g.kullaniciPuani && (
                <>
                  <span>·</span>
                  <YildizPuan puan={g.kullaniciPuani} boyut="text-xs" />
                </>
              )}
            </div>
            {g.gunce && (
              <Link to={`/gonderi/${g.id}`} className="block mt-2">
                <GonderiIcerik metin={g.gunce} tam={false} />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

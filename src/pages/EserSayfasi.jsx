import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useEserGonderileri } from '../hooks/useEser.js'
import { useAuth } from '../context/AuthContext.jsx'
import { favoriEkle, favoriKaldir } from '../utils/favori.js'
import { favoriMi } from '../hooks/useFavoriler.js'
import {
  izlenecekEkle,
  izlenecekKaldir,
  izlenecekGetir,
  okumayaBasla,
  ilerlemeGuncelle,
} from '../utils/izlenecek.js'
import { eserPuanla } from '../utils/eserPuani.js'
import YildizPuan from '../components/YildizPuan.jsx'
import Avatar from '../components/Avatar.jsx'
import GonderiIcerik from '../components/GonderiIcerik.jsx'
import { kitapGetir, kitapGuncelle } from '../utils/kitapKatalog.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'
const TMDB_SAGLAYICI_LOGO = 'https://image.tmdb.org/t/p/w92'
const YILDIZ_SECENEKLERI = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

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
  const {
    gonderiler,
    yukleniyor: gonderilerYukleniyor,
    ortalamaPuan,
    puanSayisi,
    kullanicininPuani,
    yenidenYukle: puanlariYenidenYukle,
  } = useEserGonderileri(tur, id)
  const [puanTaslak, setPuanTaslak] = useState(kullanicininPuani || 4)
  const [puanKaydediliyor, setPuanKaydediliyor] = useState(false)

  // Faz 2: kitap bilgisi düzenleme (dahili katalog düzeltmesi)
  const [duzenleModuAcik, setDuzenleModuAcik] = useState(false)
  const [duzenleTaslak, setDuzenleTaslak] = useState(null)
  const [duzenleKaydediliyor, setDuzenleKaydediliyor] = useState(false)

  const [detay, setDetay] = useState(null)
  const [saglayicilar, setSaglayicilar] = useState(null)
  const [detayYukleniyor, setDetayYukleniyor] = useState(true)
  const [hata, setHata] = useState('')

  const [favoriMi_, setFavoriMi_] = useState(false)
  const [izlenecekKaydi, setIzlenecekKaydi] = useState(null)
  const [sayfaTaslak, setSayfaTaslak] = useState(0)
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
          const url = `https://api.themoviedb.org/3/${uc}/${id}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=credits,videos,similar,images&include_image_language=null,tr,en`
          const res = await fetch(url)
          const data = await res.json()
          if (!res.ok) throw new Error(data.status_message || `HTTP ${res.status}`)
          if (iptal) return

          const yonetmenler =
            tur === 'sinema'
              ? (data.credits?.crew || []).filter((k) => k.job === 'Director').map((k) => ({ id: k.id, name: k.name }))
              : (data.created_by || []).map((k) => ({ id: k.id, name: k.name }))
          const oyuncular = (data.credits?.cast || []).slice(0, 6).map((k) => ({ id: k.id, name: k.name }))

          // Fragman: YouTube'daki resmi fragman videosu
          const fragman = (data.videos?.results || []).find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
            (data.videos?.results || []).find((v) => v.site === 'YouTube')

          // Benzer filmler/diziler
          const benzerler = (data.similar?.results || []).slice(0, 12)

          // Görsel galerisi (arka plan görselleri)
          const gorseller = (data.images?.backdrops || []).slice(0, 8)

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
            fragmanId: fragman?.key || null,
            benzerler,
            gorseller,
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
          // Faz 1: önce dahili kataloğa (Firestore) bakılır; yoksa Google Books +
          // Open Library birleştirilip kalıcı olarak yazılır. Bkz. utils/kitapKatalog.js
          const k = await kitapGetir(id)
          if (iptal) return
          setDetay({
            baslik: k.baslik,
            yazar: k.yazar,
            yil: k.yil,
            posterUrl: k.posterUrl,
            ozet: k.ozet,
            turler: k.turler,
            sayfaSayisi: k.sayfaSayisi,
            yayinevi: k.yayinevi,
            dbPuan: k.dbPuan ? Number(k.dbPuan).toFixed(1) : null,
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
        setIzlenecekKaydi(null)
        return
      }
      const [fav, izl] = await Promise.all([favoriMi(kullanici.uid, tur, id), izlenecekGetir(kullanici.uid, tur, id)])
      if (!iptal) {
        setFavoriMi_(fav)
        setIzlenecekKaydi(izl)
        if (izl?.suankiSayfa != null) setSayfaTaslak(izl.suankiSayfa)
      }
    }
    kontrolEt()
    return () => {
      iptal = true
    }
  }, [kullanici, tur, id])

  function duzenlemeyiAc() {
    setDuzenleTaslak({
      baslik: detay.baslik || '',
      yazar: detay.yazar || '',
      posterUrl: detay.posterUrl || '',
      ozet: detay.ozet || '',
      turler: detay.turler || '',
      sayfaSayisi: detay.sayfaSayisi || '',
      yayinevi: detay.yayinevi || '',
    })
    setDuzenleModuAcik(true)
  }

  async function duzenlemeyiKaydet(e) {
    e.preventDefault()
    if (!kullanici || !duzenleTaslak) return
    setDuzenleKaydediliyor(true)
    try {
      const guncellenen = await kitapGuncelle(id, duzenleTaslak, kullanici)
      setDetay((onceki) => ({
        ...onceki,
        baslik: guncellenen.baslik,
        yazar: guncellenen.yazar,
        posterUrl: guncellenen.posterUrl,
        ozet: guncellenen.ozet,
        turler: guncellenen.turler,
        sayfaSayisi: guncellenen.sayfaSayisi,
        yayinevi: guncellenen.yayinevi,
      }))
      setDuzenleModuAcik(false)
    } catch (err) {
      window.alert('Kaydedilemedi: ' + err.message)
    } finally {
      setDuzenleKaydediliyor(false)
    }
  }

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

  async function izlenecegeEkle() {
    if (!kullanici || !detay) return
    setIzlenecekIsleniyor(true)
    try {
      await izlenecekEkle(kullanici, {
        tur,
        disId: id,
        baslik: detay.baslik,
        alt: detay.yazar || '',
        posterUrl: detay.posterUrl,
        toplamSayfa: detay.sayfaSayisi || null,
      })
      setIzlenecekKaydi({ durum: 'planlanan' })
    } finally {
      setIzlenecekIsleniyor(false)
    }
  }

  // "+ Ekle" + "Okumaya Başla" iki ayrı adımını tek tıka indiren kısayol
  async function dogrudanOkumayaBasla() {
    if (!kullanici || !detay) return
    setIzlenecekIsleniyor(true)
    try {
      await izlenecekEkle(kullanici, {
        tur,
        disId: id,
        baslik: detay.baslik,
        alt: detay.yazar || '',
        posterUrl: detay.posterUrl,
        toplamSayfa: detay.sayfaSayisi || null,
        durum: 'okunuyor',
      })
      setIzlenecekKaydi({ durum: 'okunuyor', toplamSayfa: detay.sayfaSayisi || null, suankiSayfa: 0 })
    } finally {
      setIzlenecekIsleniyor(false)
    }
  }

  async function izlenecektenKaldir() {
    if (!kullanici) return
    setIzlenecekIsleniyor(true)
    try {
      await izlenecekKaldir(kullanici.uid, tur, id)
      setIzlenecekKaydi(null)
    } finally {
      setIzlenecekIsleniyor(false)
    }
  }

  async function okumayaBaslaTiklandi() {
    if (!kullanici) return
    setIzlenecekIsleniyor(true)
    try {
      await okumayaBasla(kullanici.uid, tur, id, detay?.sayfaSayisi || null)
      setIzlenecekKaydi((onceki) => ({ ...onceki, durum: 'okunuyor', toplamSayfa: detay?.sayfaSayisi || null, suankiSayfa: 0 }))
    } finally {
      setIzlenecekIsleniyor(false)
    }
  }

  async function ilerlemeyiKaydet(e) {
    e.preventDefault()
    if (!kullanici) return
    setIzlenecekIsleniyor(true)
    try {
      await ilerlemeGuncelle(kullanici.uid, tur, id, sayfaTaslak)
      setIzlenecekKaydi((onceki) => ({ ...onceki, suankiSayfa: sayfaTaslak }))
    } finally {
      setIzlenecekIsleniyor(false)
    }
  }

  async function puanGonder(e) {
    e.preventDefault()
    if (!kullanici) return
    setPuanKaydediliyor(true)
    try {
      await eserPuanla(tur, id, puanTaslak, kullanici, { baslik: detay.baslik, alt: detay.yazar || '', posterUrl: detay.posterUrl })
      puanlariYenidenYukle()
    } finally {
      setPuanKaydediliyor(false)
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
          {detay.yazar && (
            <p className="text-sm mt-1">
              <Link to={`/yazar/${encodeURIComponent(detay.yazar)}`} className="text-kraft hover:underline hover:text-deniz">
                {detay.yazar}
              </Link>
            </p>
          )}

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

          {tur === 'kitap' && kullanici && !duzenleModuAcik && (
            <button onClick={duzenlemeyiAc} className="mt-2 text-[11px] text-kraft hover:text-deniz hover:underline">
              ✏️ Bilgiyi Düzenle
            </button>
          )}

          {tur === 'kitap' && duzenleModuAcik && duzenleTaslak && (
            <form onSubmit={duzenlemeyiKaydet} className="mt-3 max-w-sm space-y-2 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
              <p className="text-xs uppercase tracking-widest text-gise">Kitap Bilgisini Düzenle</p>
              <div>
                <label className="text-[11px] text-kraft">Başlık</label>
                <input
                  value={duzenleTaslak.baslik}
                  onChange={(e) => setDuzenleTaslak((t) => ({ ...t, baslik: e.target.value }))}
                  className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div>
                <label className="text-[11px] text-kraft">Yazar</label>
                <input
                  value={duzenleTaslak.yazar}
                  onChange={(e) => setDuzenleTaslak((t) => ({ ...t, yazar: e.target.value }))}
                  className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div>
                <label className="text-[11px] text-kraft">Kapak Görseli URL'i</label>
                <input
                  value={duzenleTaslak.posterUrl}
                  onChange={(e) => setDuzenleTaslak((t) => ({ ...t, posterUrl: e.target.value }))}
                  className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div>
                <label className="text-[11px] text-kraft">Özet</label>
                <textarea
                  value={duzenleTaslak.ozet}
                  onChange={(e) => setDuzenleTaslak((t) => ({ ...t, ozet: e.target.value }))}
                  rows={4}
                  className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div>
                <label className="text-[11px] text-kraft">Tür(ler) (virgülle ayır)</label>
                <input
                  value={duzenleTaslak.turler}
                  onChange={(e) => setDuzenleTaslak((t) => ({ ...t, turler: e.target.value }))}
                  className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] text-kraft">Sayfa Sayısı</label>
                  <input
                    type="number"
                    min="0"
                    value={duzenleTaslak.sayfaSayisi}
                    onChange={(e) => setDuzenleTaslak((t) => ({ ...t, sayfaSayisi: e.target.value }))}
                    className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] text-kraft">Yayınevi</label>
                  <input
                    value={duzenleTaslak.yayinevi}
                    onChange={(e) => setDuzenleTaslak((t) => ({ ...t, yayinevi: e.target.value }))}
                    className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={duzenleKaydediliyor}
                  className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
                >
                  {duzenleKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => setDuzenleModuAcik(false)}
                  disabled={duzenleKaydediliyor}
                  className="rounded-sm bg-kagit px-3 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi disabled:opacity-40"
                >
                  Vazgeç
                </button>
              </div>
            </form>
          )}

          {kullanici && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={favoriDegistir}
                disabled={favoriIsleniyor}
                className={`rounded-sm px-3 py-1.5 font-govde text-xs ${
                  favoriMi_ ? 'bg-muhur text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
                } disabled:opacity-40`}
              >
                {favoriMi_ ? '★ Favorilerimde' : '☆ Favorilere Ekle'}
              </button>

              {!izlenecekKaydi && (
                <>
                  <button
                    onClick={izlenecegeEkle}
                    disabled={izlenecekIsleniyor}
                    className="rounded-sm bg-kagitKoyu px-3 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi disabled:opacity-40"
                  >
                    + {tur === 'kitap' ? 'Okuyacaklarıma' : 'İzleyeceklerime'} Ekle
                  </button>
                  <button
                    onClick={dogrudanOkumayaBasla}
                    disabled={izlenecekIsleniyor}
                    className="rounded-sm bg-deniz px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
                  >
                    {tur === 'kitap' ? 'Okumaya Başlıyorum' : 'İzlemeye Başlıyorum'}
                  </button>
                </>
              )}

              {izlenecekKaydi?.durum === 'planlanan' && (
                <>
                  <button
                    onClick={okumayaBaslaTiklandi}
                    disabled={izlenecekIsleniyor}
                    className="rounded-sm bg-deniz px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
                  >
                    {tur === 'kitap' ? 'Okumaya Başla' : 'İzlemeye Başla'}
                  </button>
                  <button
                    onClick={izlenecektenKaldir}
                    disabled={izlenecekIsleniyor}
                    className="rounded-sm bg-kagitKoyu px-3 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi disabled:opacity-40"
                  >
                    Kaldır
                  </button>
                </>
              )}
            </div>
          )}

          {izlenecekKaydi?.durum === 'okunuyor' && (
            <div className="mt-3 max-w-xs rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
              <p className="text-xs uppercase tracking-widest text-gise">
                {tur === 'kitap' ? 'Şu An Okuyorsun' : 'Şu An İzliyorsun'}
              </p>
              {tur === 'kitap' && izlenecekKaydi.toplamSayfa ? (
                <>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-kagit ring-1 ring-cizgi">
                    <div
                      className="h-full bg-deniz"
                      style={{
                        width: `${Math.min(100, Math.round(((izlenecekKaydi.suankiSayfa || 0) / izlenecekKaydi.toplamSayfa) * 100))}%`,
                      }}
                    />
                  </div>
                  <form onSubmit={ilerlemeyiKaydet} className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max={izlenecekKaydi.toplamSayfa}
                      value={sayfaTaslak}
                      onChange={(e) => setSayfaTaslak(Number(e.target.value))}
                      className="w-20 rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                    />
                    <span className="text-xs text-kraft">/ {izlenecekKaydi.toplamSayfa} sayfa</span>
                    <button
                      type="submit"
                      disabled={izlenecekIsleniyor}
                      className="rounded-sm bg-muhur px-2 py-1 font-govde text-[11px] text-kagit disabled:opacity-40"
                    >
                      Güncelle
                    </button>
                  </form>
                </>
              ) : (
                <p className="mt-1 text-xs text-kraft">Sayfa bilgisi yok, ilerleme takip edilemiyor.</p>
              )}
              <button onClick={izlenecektenKaldir} className="mt-2 text-[11px] text-kraft hover:text-muhur">
                Bitirdim, listeden kaldır
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

            <div className="rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
              <p className="text-xs uppercase tracking-widest text-gise">
                {kullanicininPuani != null ? 'Senin Puanın' : 'Puan Ver'}
              </p>
              {kullanici ? (
                <form onSubmit={puanGonder} className="mt-1 flex items-center gap-2">
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
                  <button
                    type="submit"
                    disabled={puanKaydediliyor}
                    className="rounded-sm bg-muhur px-3 py-1 font-govde text-xs text-kagit disabled:opacity-40"
                  >
                    {puanKaydediliyor ? 'Kaydediliyor...' : kullanicininPuani != null ? 'Güncelle' : 'Kaydet'}
                  </button>
                </form>
              ) : (
                <p className="mt-1 text-sm text-kraft">Puan vermek için giriş yap.</p>
              )}
            </div>
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

      {detay.fragmanId && (
        <div className="mt-6">
          <h2 className="font-baslik text-lg text-murekkep mb-2">Fragman</h2>
          <div className="aspect-video w-full overflow-hidden rounded-sm ring-1 ring-cizgi">
            <iframe
              src={`https://www.youtube.com/embed/${detay.fragmanId}`}
              title="Fragman"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {detay.gorseller?.length > 0 && (
        <div className="mt-6">
          <h2 className="font-baslik text-lg text-murekkep mb-2">Görseller</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {detay.gorseller.map((g, i) => (
              <img
                key={i}
                src={`https://image.tmdb.org/t/p/w300${g.file_path}`}
                alt=""
                className="h-24 w-40 shrink-0 rounded-sm object-cover ring-1 ring-cizgi"
              />
            ))}
          </div>
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

      {detay.benzerler?.length > 0 && (
        <div className="mt-6">
          <h2 className="font-baslik text-lg text-murekkep mb-2">Benzer {tur === 'dizi' ? 'Diziler' : 'Filmler'}</h2>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {detay.benzerler.map((b) => (
              <Link key={b.id} to={`/${tur === 'dizi' ? 'dizi' : 'film'}/${b.id}`} className="block">
                <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                  {b.poster_path && (
                    <img
                      src={`https://image.tmdb.org/t/p/w300${b.poster_path}`}
                      alt={b.title || b.name}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-murekkep">{b.title || b.name}</p>
              </Link>
            ))}
          </div>
        </div>
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

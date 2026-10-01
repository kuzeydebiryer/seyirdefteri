import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { FESTIVALLER } from '../data/festivaller.js'
import {
  festivalSezonOlustur,
  festivalSezonlariniGetir,
  festivalSezonSil,
  festivalFilmleriGetir,
  festivalFilmSil,
  festivalOduluGuncelle,
  festivalBanneriGetir,
  festivalBanneriGuncelle,
  festivalSeanslariniGetir,
  festivalSeansiSec,
  festivalSecimimiKaldir,
  festivalSecimlerimiGetir,
  secimCakismalariniBul,
  ciftSeanslariTemizle,
} from '../utils/festival.js'
import FestivalFilmIceAktar from '../components/FestivalFilmIceAktar.jsx'
import FestivalSeansIceAktar from '../components/FestivalSeansIceAktar.jsx'
import SohbetPaneli from '../components/SohbetPaneli.jsx'

// "Ne zaman/nerede gösteriliyor" + "benim planım" — festivalplanner.co'dan
// esinlenen özellik (kullanıcı geri bildirimi). Seans tarihini kısa Türkçe
// biçimde göstermek için (ör. "8 Eki") — tarih YYYY-MM-DD saklanıyor.
function seansTarihKisa(tarihISO) {
  const [yil, ay, gun] = tarihISO.split('-').map(Number)
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(yil, ay - 1, gun))
}

export default function Festivaller() {
  const { kullanici } = useAuth()
  const [seciliFestival, setSeciliFestival] = useState(FESTIVALLER[0].id)
  const [sezonlar, setSezonlar] = useState([])
  const [seciliSezonId, setSeciliSezonId] = useState(null)
  const [filmler, setFilmler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yeniYil, setYeniYil] = useState(String(new Date().getFullYear()))
  const [iceAktarAcik, setIceAktarAcik] = useState(false)
  const [oduluDuzenlenenFilmId, setOduluDuzenlenenFilmId] = useState(null)
  const [odulTaslak, setOdulTaslak] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [bannerDuzenleAcik, setBannerDuzenleAcik] = useState(false)
  const [bannerTaslak, setBannerTaslak] = useState('')
  const [bannerKaydediliyor, setBannerKaydediliyor] = useState(false)

  const [seanslar, setSeanslar] = useState([])
  const [seansIceAktarAcik, setSeansIceAktarAcik] = useState(false)
  const [ciftTemizleniyor, setCiftTemizleniyor] = useState(false)
  const [ciftTemizlemeSonucu, setCiftTemizlemeSonucu] = useState('')
  const [secimlerim, setSecimlerim] = useState([])
  const [planAcik, setPlanAcik] = useState(false)

  const festival = FESTIVALLER.find((f) => f.id === seciliFestival)

  async function sezonlariYukle() {
    setYukleniyor(true)
    const liste = await festivalSezonlariniGetir(seciliFestival)
    setSezonlar(liste)
    const hedefSezon = liste.find((s) => s.id === seciliSezonId) || liste[0] || null
    setSeciliSezonId(hedefSezon?.id || null)
    setYukleniyor(false)
  }

  useEffect(() => {
    setSeciliSezonId(null)
    setFilmler([])
    sezonlariYukle()
    setBannerDuzenleAcik(false)
    festivalBanneriGetir(seciliFestival).then((url) => {
      setBannerUrl(url)
      setBannerTaslak(url)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seciliFestival])

  useEffect(() => {
    if (!seciliSezonId) {
      setSeanslar([])
      setSecimlerim([])
      return
    }
    festivalFilmleriGetir(seciliSezonId).then(setFilmler)
    // .catch ile konsola yazdırıyoruz — ÖNCEDEN burada hiç hata yakalama
    // yoktu, bu yüzden eksik bir Firestore indeksi (bkz. firestore.indexes.json)
    // sorguyu sessizce başarısız kılıyordu ve seanslar/planım hiçbir zaman
    // görünmüyordu, kullanıcıya hiçbir iz bırakmadan.
    festivalSeanslariniGetir(seciliSezonId)
      .then(setSeanslar)
      .catch((err) => console.error('Festival seansları yüklenemedi:', err))
    festivalSecimlerimiGetir(kullanici, seciliSezonId)
      .then(setSecimlerim)
      .catch((err) => console.error('Festival seçimlerim yüklenemedi:', err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seciliSezonId, kullanici?.uid])

  const seanslarByFilm = useMemo(() => {
    const harita = new Map()
    seanslar.forEach((s) => {
      if (!harita.has(s.filmId)) harita.set(s.filmId, [])
      harita.get(s.filmId).push(s)
    })
    return harita
  }, [seanslar])

  const secimByFilm = useMemo(() => new Map(secimlerim.map((s) => [s.filmId, s])), [secimlerim])
  const cakisanSecimIdler = useMemo(() => secimCakismalariniBul(secimlerim), [secimlerim])

  async function seansTiklandi(seans) {
    if (!kullanici) return
    const zatenSecili = secimByFilm.get(seans.filmId)?.seansId === seans.id
    if (zatenSecili) {
      await festivalSecimimiKaldir(kullanici, seans.filmId)
      setSecimlerim((liste) => liste.filter((s) => s.filmId !== seans.filmId))
    } else {
      const film = filmler.find((f) => f.id === seans.filmId)
      await festivalSeansiSec(kullanici, seciliSezonId, { ...seans, posterUrl: film?.posterUrl })
      setSecimlerim((liste) => [...liste.filter((s) => s.filmId !== seans.filmId), { ...seans, posterUrl: film?.posterUrl }])
    }
  }

  async function ciftleriTemizle() {
    setCiftTemizleniyor(true)
    setCiftTemizlemeSonucu('')
    try {
      const silinen = await ciftSeanslariTemizle(seciliSezonId)
      setCiftTemizlemeSonucu(silinen > 0 ? `✅ ${silinen} çift kayıt silindi.` : 'Çift kayıt bulunamadı.')
      setSeanslar(await festivalSeanslariniGetir(seciliSezonId))
    } finally {
      setCiftTemizleniyor(false)
    }
  }

  async function sezonOlusturTiklandi(e) {
    e.preventDefault()
    if (!yeniYil.trim() || !kullanici) return
    const sezonId = await festivalSezonOlustur(kullanici, { festivalId: seciliFestival, festivalAdi: festival.ad, yil: yeniYil.trim() })
    await sezonlariYukle()
    setSeciliSezonId(sezonId)
  }

  async function bannerKaydet(e) {
    e.preventDefault()
    if (!kullanici) return
    setBannerKaydediliyor(true)
    try {
      await festivalBanneriGuncelle(seciliFestival, bannerTaslak.trim(), kullanici)
      setBannerUrl(bannerTaslak.trim())
      setBannerDuzenleAcik(false)
    } finally {
      setBannerKaydediliyor(false)
    }
  }

  async function sezonSilTiklandi() {
    if (!seciliSezonId) return
    if (!window.confirm('Bu sezonu ve tüm filmlerini silmek istediğine emin misin?')) return
    await festivalSezonSil(seciliSezonId)
    await sezonlariYukle()
  }

  async function filmSilTiklandi(filmId) {
    await festivalFilmSil(filmId)
    setFilmler((liste) => liste.filter((f) => f.id !== filmId))
  }

  async function oduluKaydet(filmId) {
    await festivalOduluGuncelle(filmId, odulTaslak.trim())
    setFilmler((liste) => liste.map((f) => (f.id === filmId ? { ...f, odul: odulTaslak.trim() } : f)))
    setOduluDuzenlenenFilmId(null)
    setOdulTaslak('')
  }

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep mb-6">Festival</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {FESTIVALLER.map((f) => (
          <button
            key={f.id}
            onClick={() => setSeciliFestival(f.id)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              seciliFestival === f.id ? 'bg-murekkep text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
            }`}
          >
            {f.ad}
          </button>
        ))}
      </div>

      {bannerUrl && !bannerDuzenleAcik && (
        <div className="relative mb-6">
          <img src={bannerUrl} alt={festival.ad} className="h-32 w-full rounded-sm object-cover ring-1 ring-cizgi sm:h-48" />
          {kullanici && (
            <button
              onClick={() => setBannerDuzenleAcik(true)}
              className="absolute right-2 top-2 rounded-sm bg-kagit/90 px-2 py-1 text-[11px] text-kraft ring-1 ring-cizgi hover:text-murekkep"
            >
              Banner'ı Değiştir
            </button>
          )}
        </div>
      )}

      {!bannerUrl && kullanici && !bannerDuzenleAcik && (
        <button
          onClick={() => setBannerDuzenleAcik(true)}
          className="mb-6 flex h-24 w-full items-center justify-center rounded-sm bg-kagitKoyu text-sm text-kraft ring-1 ring-dashed ring-cizgi hover:text-murekkep"
        >
          + {festival.ad} için Banner Görseli Ekle
        </button>
      )}

      {bannerDuzenleAcik && (
        <form onSubmit={bannerKaydet} className="mb-6 flex gap-2">
          <input
            type="text"
            value={bannerTaslak}
            onChange={(e) => setBannerTaslak(e.target.value)}
            placeholder="Banner görseli URL'i..."
            className="flex-1 rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
          <button type="submit" disabled={bannerKaydediliyor} className="rounded-sm bg-muhur px-3 py-2 font-govde text-xs text-kagit disabled:opacity-40">
            Kaydet
          </button>
          <button
            type="button"
            onClick={() => {
              setBannerDuzenleAcik(false)
              setBannerTaslak(bannerUrl)
            }}
            className="rounded-sm bg-kagitKoyu px-3 py-2 font-govde text-xs text-kraft ring-1 ring-cizgi"
          >
            Vazgeç
          </button>
        </form>
      )}

      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}

      {!yukleniyor && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {sezonlar.map((s) => (
              <button
                key={s.id}
                onClick={() => setSeciliSezonId(s.id)}
                className={`rounded-sm px-3 py-1.5 font-govde text-xs ${
                  seciliSezonId === s.id ? 'bg-muhur text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
                }`}
              >
                {s.yil}
              </button>
            ))}
            {kullanici && (
              <form onSubmit={sezonOlusturTiklandi} className="flex items-center gap-1">
                <input
                  type="text"
                  value={yeniYil}
                  onChange={(e) => setYeniYil(e.target.value)}
                  className="w-20 rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
                />
                <button type="submit" className="rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-kraft ring-1 ring-cizgi hover:text-murekkep">
                  + Yeni Yıl Ekle
                </button>
              </form>
            )}
          </div>

          {!seciliSezonId && <p className="text-sm text-kraft">{festival.ad} için henüz bir sezon oluşturulmadı.</p>}

          {seciliSezonId && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-baslik text-lg text-murekkep">
                  {festival.ad} {sezonlar.find((s) => s.id === seciliSezonId)?.yil}
                </h2>
                {kullanici && (
                  <button onClick={sezonSilTiklandi} className="text-[11px] text-kraft hover:text-muhur">
                    Sezonu Sil
                  </button>
                )}
              </div>

              <SohbetPaneli konumId={`festival_${seciliSezonId}`} baslik="💬 Festival Sohbeti" />

              {kullanici && (
                <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
                  <button
                    onClick={() => setIceAktarAcik((a) => !a)}
                    className="text-xs text-kraft hover:text-deniz hover:underline"
                  >
                    {iceAktarAcik ? '▲ Toplu İçe Aktarmayı Gizle' : '📋 Letterboxd Listesinden Toplu İçe Aktar'}
                  </button>
                  {filmler.length > 0 && (
                    <button
                      onClick={() => setSeansIceAktarAcik((a) => !a)}
                      className="text-xs text-kraft hover:text-deniz hover:underline"
                    >
                      {seansIceAktarAcik ? '▲ Seans İçe Aktarmayı Gizle' : '🗓️ Seansları Toplu Ekle'}
                    </button>
                  )}
                  {seanslar.length > 0 && (
                    <button
                      onClick={ciftleriTemizle}
                      disabled={ciftTemizleniyor}
                      title="Aynı film+tarih+saat+salon için birden fazla kayıt varsa (ör. çift tıklama yüzünden) fazlalıkları siler"
                      className="text-xs text-kraft hover:text-deniz hover:underline disabled:opacity-40"
                    >
                      {ciftTemizleniyor ? 'Temizleniyor...' : '🧹 Çift Seans Kayıtlarını Temizle'}
                    </button>
                  )}
                  {ciftTemizlemeSonucu && <p className="w-full text-[11px] text-kraft">{ciftTemizlemeSonucu}</p>}
                  {iceAktarAcik && (
                    <div className="mt-2 w-full">
                      <FestivalFilmIceAktar
                        sezonId={seciliSezonId}
                        mevcutFilmSayisi={filmler.length}
                        onTamamlandi={async () => {
                          setIceAktarAcik(false)
                          setFilmler(await festivalFilmleriGetir(seciliSezonId))
                        }}
                      />
                    </div>
                  )}
                  {seansIceAktarAcik && (
                    <div className="mt-2 w-full">
                      <FestivalSeansIceAktar
                        sezonId={seciliSezonId}
                        filmler={filmler}
                        onTamamlandi={async (tamamenBittiMi) => {
                          // Kısmi bir içe aktarmada bile (bazı satırlar
                          // hata verse de) kaydedilenler hemen görünsün
                          // diye liste HER ZAMAN yenileniyor; panel ise
                          // sadece hiç hata kalmayınca kapanıyor.
                          if (tamamenBittiMi) setSeansIceAktarAcik(false)
                          setSeanslar(await festivalSeanslariniGetir(seciliSezonId))
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {secimlerim.length > 0 && (
                <div className="mb-4">
                  <button onClick={() => setPlanAcik((a) => !a)} className="text-xs text-deniz hover:underline">
                    {planAcik ? '▲ Planımı Gizle' : `🗓️ Planım (${secimlerim.length})`}
                  </button>
                  {planAcik && (
                    <div className="mt-2 space-y-1.5 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
                      {[...secimlerim]
                        .sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat))
                        .map((s) => (
                          <div
                            key={s.filmId}
                            className={`flex items-center justify-between rounded-sm px-2 py-1.5 text-xs ${
                              cakisanSecimIdler.has(s.id) ? 'bg-muhur/10 ring-1 ring-muhur' : 'bg-kagit'
                            }`}
                          >
                            <span className="text-murekkep">
                              {cakisanSecimIdler.has(s.id) && '⚠️ '}
                              <strong>{seansTarihKisa(s.tarih)} {s.saat}</strong> · {s.filmBasligi} — {s.salon}, {s.sehir}
                            </span>
                            <button onClick={() => seansTiklandi(s)} className="shrink-0 pl-2 text-[10px] text-kraft hover:text-muhur">
                              ✕ Kaldır
                            </button>
                          </div>
                        ))}
                      {cakisanSecimIdler.size > 0 && (
                        <p className="pt-1 text-[11px] text-muhur">
                          ⚠️ İşaretli seçimler aynı gün birbirine çok yakın saatlerde — ikisini birden yetiştiremeyebilirsin.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {filmler.length === 0 && <p className="text-sm text-kraft">Bu sezonda henüz film yok.</p>}

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {filmler.map((f) => (
                  <div key={f.id} className="group relative">
                    <Link to={`/film/${f.tmdbId}`}>
                      <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                        {f.posterUrl && <img src={f.posterUrl} alt={f.filmBasligi} className="h-full w-full object-cover" />}
                      </div>
                      <p className="mt-1 truncate text-xs text-murekkep">{f.filmBasligi}</p>
                    </Link>
                    {f.odul && <p className="truncate text-[11px] text-gise">🏆 {f.odul}</p>}
                    {seanslarByFilm.get(f.id)?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-0.5">
                        {seanslarByFilm.get(f.id).map((s) => {
                          const secili = secimByFilm.get(f.id)?.seansId === s.id
                          return (
                            <button
                              key={s.id}
                              onClick={() => seansTiklandi(s)}
                              disabled={!kullanici}
                              title={`${s.salon}, ${s.sehir}${kullanici ? ' — seçmek/vazgeçmek için tıkla' : ''}`}
                              className={`rounded-sm px-1 py-0.5 text-[9px] ${
                                secili
                                  ? 'bg-muhur text-kagit'
                                  : 'bg-kagit text-kraft ring-1 ring-cizgi hover:text-murekkep disabled:hover:text-kraft'
                              }`}
                            >
                              {seansTarihKisa(s.tarih)} {s.saat}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {kullanici && (
                      <>
                        {oduluDuzenlenenFilmId === f.id ? (
                          <div className="mt-1 flex gap-1">
                            <input
                              type="text"
                              value={odulTaslak}
                              onChange={(e) => setOdulTaslak(e.target.value)}
                              placeholder="ör. Altın Palmiye"
                              className="w-full rounded-sm bg-kagit px-1 py-0.5 text-[10px] text-murekkep ring-1 ring-cizgi"
                            />
                            <button onClick={() => oduluKaydet(f.id)} className="shrink-0 text-[10px] text-deniz">
                              ✓
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setOduluDuzenlenenFilmId(f.id)
                              setOdulTaslak(f.odul || '')
                            }}
                            className="mt-0.5 text-[10px] text-kraft opacity-0 hover:text-deniz group-hover:opacity-100"
                          >
                            {f.odul ? 'Ödülü Düzenle' : '+ Ödül Ekle'}
                          </button>
                        )}
                        <button
                          onClick={() => filmSilTiklandi(f.id)}
                          className="absolute right-1 top-1 rounded-full bg-kagit/90 px-1.5 py-0.5 text-[10px] text-kraft opacity-0 ring-1 ring-cizgi transition-opacity hover:text-muhur group-hover:opacity-100"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

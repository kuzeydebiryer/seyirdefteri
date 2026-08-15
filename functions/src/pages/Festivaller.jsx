import { useEffect, useState } from 'react'
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
} from '../utils/festival.js'
import FestivalFilmIceAktar from '../components/FestivalFilmIceAktar.jsx'
import SohbetPaneli from '../components/SohbetPaneli.jsx'

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
    if (!seciliSezonId) return
    festivalFilmleriGetir(seciliSezonId).then(setFilmler)
  }, [seciliSezonId])

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
                <div className="mb-4">
                  <button
                    onClick={() => setIceAktarAcik((a) => !a)}
                    className="text-xs text-kraft hover:text-deniz hover:underline"
                  >
                    {iceAktarAcik ? '▲ Toplu İçe Aktarmayı Gizle' : '📋 Letterboxd Listesinden Toplu İçe Aktar'}
                  </button>
                  {iceAktarAcik && (
                    <div className="mt-2">
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

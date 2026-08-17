import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { haberEkle, haberSil } from '../utils/haber.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w185'
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
const SAYFA_BASI = 5

const ESER_KATEGORILERI = [
  { id: 'sinema', etiket: 'Film' },
  { id: 'dizi', etiket: 'Dizi' },
  { id: 'kitap', etiket: 'Kitap' },
]

function tarihGoster(deger) {
  if (!deger) return ''
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  if (isNaN(d.getTime())) return ''
  const bugun = new Date()
  const ayniGun = d.toDateString() === bugun.toDateString()
  if (ayniGun) return `Bugün ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function youtubeIdCikar(girdi) {
  if (!girdi) return ''
  const temiz = girdi.trim()
  const eslesme = temiz.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  if (eslesme) return eslesme[1]
  if (/^[a-zA-Z0-9_-]{11}$/.test(temiz)) return temiz
  return temiz
}

const eserLink = (tur, disId) => (tur === 'dizi' ? `/dizi/${disId}` : tur === 'kitap' ? `/kitap/${disId}` : `/film/${disId}`)

function HaberSatiri({ haber, acikMi, ac, kullanici, sil }) {
  const kucukGorsel = haber.gorselUrl || haber.ilgiliPosterUrl

  return (
    <li className="rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
      <button onClick={ac} className="flex w-full gap-3 p-3 text-left">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi sm:h-20 sm:w-28">
          {kucukGorsel ? (
            <img src={kucukGorsel} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg text-kraft">📰</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-govde text-sm font-medium text-murekkep line-clamp-2">{haber.baslik}</p>
          {haber.icerik && !acikMi && <p className="mt-0.5 line-clamp-1 text-xs text-kraft">{haber.icerik}</p>}
          <p className="mt-1 text-[11px] text-kraft">
            {haber.ekleyenAdi} · {tarihGoster(haber.tarih)}
          </p>
        </div>
      </button>

      {acikMi && (
        <div className="border-t border-cizgi px-3 pb-3 pt-2">
          {haber.icerik && <p className="text-sm text-murekkep/90">{haber.icerik}</p>}

          {haber.gorselUrl && (
            <img src={haber.gorselUrl} alt="" className="mt-2 max-h-64 w-full rounded-sm object-cover ring-1 ring-cizgi" />
          )}

          {haber.ilgiliBaslik && (
            <Link
              to={eserLink(haber.ilgiliTur, haber.ilgiliDisId)}
              className="mt-2 flex w-fit items-center gap-2 rounded-sm bg-kagit p-2 ring-1 ring-cizgi hover:ring-deniz"
            >
              {haber.ilgiliPosterUrl && <img src={haber.ilgiliPosterUrl} alt="" className="h-14 w-10 rounded-sm object-cover" />}
              <span className="text-xs text-murekkep">{haber.ilgiliBaslik}</span>
            </Link>
          )}

          {haber.fragmanId && (
            <div className="mt-2 aspect-video max-w-md overflow-hidden rounded-sm ring-1 ring-cizgi">
              <iframe
                src={`https://www.youtube.com/embed/${haber.fragmanId}`}
                title="Fragman"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {kullanici?.uid === haber.ekleyenId && (
            <button onClick={() => sil(haber.id)} className="mt-2 text-xs text-kraft hover:text-muhur">
              Sil
            </button>
          )}
        </div>
      )}
    </li>
  )
}

export default function HaberBolumu({ kategori, haberler, yenidenYukle }) {
  const { kullanici } = useAuth()
  const [formuAcik, setFormuAcik] = useState(false)
  const [baslik, setBaslik] = useState('')
  const [icerik, setIcerik] = useState('')
  const [gorselUrl, setGorselUrl] = useState('')
  const [fragmanGirdi, setFragmanGirdi] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const [eserFormuAcik, setEserFormuAcik] = useState(false)
  const [eserKategori, setEserKategori] = useState(kategori === 'dizi' ? 'dizi' : 'sinema')
  const [eserArama, setEserArama] = useState('')
  const [eserSonuclari, setEserSonuclari] = useState([])
  const [secilenEser, setSecilenEser] = useState(null)

  const [acikId, setAcikId] = useState(null)
  const [gosterilecekSayi, setGosterilecekSayi] = useState(SAYFA_BASI)

  async function eserAra(e) {
    e.preventDefault()
    if (!eserArama.trim()) return
    if (eserKategori === 'kitap') {
      const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(eserArama)}&maxResults=10${anahtarParcasi}`
      const res = await fetch(url)
      const data = await res.json()
      setEserSonuclari(data.items || [])
      return
    }
    if (!TMDB_API_KEY) return
    const uc = eserKategori === 'sinema' ? 'movie' : 'tv'
    const url = `https://api.themoviedb.org/3/search/${uc}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(eserArama)}`
    const res = await fetch(url)
    const data = await res.json()
    setEserSonuclari(data.results || [])
  }

  function eserSec(item) {
    if (eserKategori === 'kitap') {
      const v = item.volumeInfo || {}
      setSecilenEser({
        tur: 'kitap',
        disId: item.id,
        baslik: v.title || '',
        posterUrl: (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://'),
      })
    } else {
      setSecilenEser({
        tur: eserKategori,
        disId: item.id,
        baslik: eserKategori === 'sinema' ? item.title : item.name,
        posterUrl: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '',
      })
    }
    setEserSonuclari([])
    setEserArama('')
    setEserFormuAcik(false)
  }

  async function gonder(e) {
    e.preventDefault()
    if (!baslik.trim() || !kullanici) return
    setKaydediliyor(true)
    try {
      await haberEkle({
        kategori,
        baslik: baslik.trim(),
        icerik,
        gorselUrl,
        fragmanId: youtubeIdCikar(fragmanGirdi),
        ilgiliTur: secilenEser?.tur,
        ilgiliDisId: secilenEser?.disId,
        ilgiliBaslik: secilenEser?.baslik,
        ilgiliPosterUrl: secilenEser?.posterUrl,
        kullanici,
      })
      setBaslik('')
      setIcerik('')
      setGorselUrl('')
      setFragmanGirdi('')
      setSecilenEser(null)
      setFormuAcik(false)
      yenidenYukle()
    } finally {
      setKaydediliyor(false)
    }
  }

  async function sil(id) {
    if (!window.confirm('Bu haberi silmek istediğine emin misin?')) return
    await haberSil(id)
    yenidenYukle()
  }

  const gosterilenler = haberler.slice(0, gosterilecekSayi)

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">Haberler</h2>
        {kullanici && (
          <button
            onClick={() => setFormuAcik((a) => !a)}
            className={`rounded-full px-3 py-1 font-govde text-xs ${formuAcik ? 'bg-kagitKoyu text-kraft ring-1 ring-cizgi' : 'bg-gise text-kagit'}`}
          >
            {formuAcik ? 'Vazgeç' : '+ Haber Ekle'}
          </button>
        )}
      </div>

      {formuAcik && (
        <form onSubmit={gonder} className="mb-4 space-y-3 rounded-sm bg-kagitKoyu p-5 ring-1 ring-cizgi max-w-2xl">
          <input
            type="text"
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            required
            placeholder="Haber başlığı"
            className="w-full rounded-sm bg-kagit px-3 py-2.5 text-base text-murekkep ring-1 ring-cizgi"
          />
          <textarea
            value={icerik}
            onChange={(e) => setIcerik(e.target.value)}
            rows={4}
            placeholder="Kısa içerik (opsiyonel)"
            className="w-full rounded-sm bg-kagit px-3 py-2.5 text-sm text-murekkep ring-1 ring-cizgi"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-kraft mb-1">Görsel URL (opsiyonel)</label>
              <input
                type="text"
                value={gorselUrl}
                onChange={(e) => setGorselUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-kraft mb-1">
                Fragman linki/ID (opsiyonel)
              </label>
              <input
                type="text"
                value={fragmanGirdi}
                onChange={(e) => setFragmanGirdi(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-kraft mb-1">
              İlgili Film/Dizi/Kitap Kartı (opsiyonel)
            </label>
            {secilenEser ? (
              <div className="flex items-center gap-3 rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
                {secilenEser.posterUrl && <img src={secilenEser.posterUrl} alt="" className="h-16 w-11 rounded-sm object-cover" />}
                <p className="flex-1 text-sm text-murekkep">{secilenEser.baslik}</p>
                <button type="button" onClick={() => setSecilenEser(null)} className="text-xs text-kraft hover:text-muhur">
                  Kaldır
                </button>
              </div>
            ) : eserFormuAcik ? (
              <div className="space-y-2 rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
                <div className="flex gap-2">
                  {ESER_KATEGORILERI.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => {
                        setEserKategori(k.id)
                        setEserSonuclari([])
                      }}
                      className={`rounded-sm px-3 py-1 text-xs ${eserKategori === k.id ? 'bg-deniz text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'}`}
                    >
                      {k.etiket}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={eserArama}
                    onChange={(e) => setEserArama(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        eserAra(e)
                      }
                    }}
                    placeholder="Ara..."
                    className="flex-1 rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                  />
                  <button onClick={eserAra} type="button" className="rounded-sm bg-deniz px-3 py-2 text-xs text-kagit">
                    Ara
                  </button>
                </div>
                {eserSonuclari.length > 0 && (
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
                    {eserSonuclari.slice(0, 14).map((item) => {
                      const gorselVeAd =
                        eserKategori === 'kitap'
                          ? {
                              url: (item.volumeInfo?.imageLinks?.thumbnail || '').replace('http://', 'https://'),
                              ad: item.volumeInfo?.title,
                            }
                          : { url: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '', ad: item.title || item.name }
                      return (
                        <button key={item.id} type="button" onClick={() => eserSec(item)} className="text-left">
                          <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                            {gorselVeAd.url && <img src={gorselVeAd.url} alt="" className="h-full w-full object-cover" />}
                          </div>
                          <p className="mt-1 truncate text-[10px] text-murekkep">{gorselVeAd.ad}</p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEserFormuAcik(true)}
                className="rounded-sm bg-kagit px-3 py-1.5 text-xs text-kraft ring-1 ring-cizgi"
              >
                + Film/Dizi/Kitap Ekle
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={kaydediliyor}
            className="rounded-sm bg-muhur px-5 py-2 font-govde text-sm text-kagit disabled:opacity-40"
          >
            {kaydediliyor ? 'Ekleniyor...' : 'Paylaş'}
          </button>
        </form>
      )}

      {haberler.length === 0 ? (
        <p className="text-sm text-kraft">Henüz haber yok.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {gosterilenler.map((h) => (
              <HaberSatiri
                key={h.id}
                haber={h}
                acikMi={acikId === h.id}
                ac={() => setAcikId((onceki) => (onceki === h.id ? null : h.id))}
                kullanici={kullanici}
                sil={sil}
              />
            ))}
          </ul>
          {haberler.length > gosterilecekSayi && (
            <button
              onClick={() => setGosterilecekSayi((n) => n + SAYFA_BASI)}
              className="mt-3 rounded-sm bg-kagitKoyu px-4 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi hover:text-murekkep"
            >
              Daha Fazla Haber Göster ({haberler.length - gosterilecekSayi} kaldı)
            </button>
          )}
        </>
      )}
    </div>
  )
}

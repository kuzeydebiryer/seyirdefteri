import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { haberEkle, haberSil } from '../utils/haber.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w185'

function tarihGoster(deger) {
  if (!deger) return ''
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Kullanıcı tam bir YouTube linki de yapıştırabilir, sadece video ID'sini çıkarıyoruz.
function youtubeIdCikar(girdi) {
  if (!girdi) return ''
  const temiz = girdi.trim()
  const eslesme = temiz.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  if (eslesme) return eslesme[1]
  if (/^[a-zA-Z0-9_-]{11}$/.test(temiz)) return temiz
  return temiz
}

export default function HaberBolumu({ kategori, haberler, yenidenYukle }) {
  const { kullanici } = useAuth()
  const [formuAcik, setFormuAcik] = useState(false)
  const [baslik, setBaslik] = useState('')
  const [icerik, setIcerik] = useState('')
  const [gorselUrl, setGorselUrl] = useState('')
  const [fragmanGirdi, setFragmanGirdi] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  // Film/Dizi kartı ekleme
  const [eserFormuAcik, setEserFormuAcik] = useState(false)
  const [eserKategori, setEserKategori] = useState(kategori === 'dizi' ? 'dizi' : 'sinema')
  const [eserArama, setEserArama] = useState('')
  const [eserSonuclari, setEserSonuclari] = useState([])
  const [secilenEser, setSecilenEser] = useState(null)

  async function eserAra(e) {
    e.preventDefault()
    if (!eserArama.trim() || !TMDB_API_KEY) return
    const uc = eserKategori === 'sinema' ? 'movie' : 'tv'
    const url = `https://api.themoviedb.org/3/search/${uc}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(eserArama)}`
    const res = await fetch(url)
    const data = await res.json()
    setEserSonuclari(data.results || [])
  }

  function eserSec(item) {
    setSecilenEser({
      tur: eserKategori,
      disId: item.id,
      baslik: eserKategori === 'sinema' ? item.title : item.name,
      posterUrl: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '',
    })
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

  const eserLink = (tur, disId) => (tur === 'dizi' ? `/dizi/${disId}` : tur === 'kitap' ? `/kitap/${disId}` : `/film/${disId}`)

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">Haberler</h2>
        {kullanici && (
          <button
            onClick={() => setFormuAcik((a) => !a)}
            className="rounded-sm bg-kagitKoyu px-3 py-1 font-govde text-xs text-kraft ring-1 ring-cizgi"
          >
            {formuAcik ? 'Vazgeç' : '+ Haber Ekle'}
          </button>
        )}
      </div>

      {formuAcik && (
        <form onSubmit={gonder} className="mb-4 space-y-2 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <input
            type="text"
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            required
            placeholder="Haber başlığı"
            className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
          <textarea
            value={icerik}
            onChange={(e) => setIcerik(e.target.value)}
            rows={2}
            placeholder="Kısa içerik (opsiyonel)"
            className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />

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

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-kraft mb-1">
              İlgili Film/Dizi Kartı (opsiyonel)
            </label>
            {secilenEser ? (
              <div className="flex items-center gap-2 rounded-sm bg-kagit p-2 ring-1 ring-cizgi">
                {secilenEser.posterUrl && <img src={secilenEser.posterUrl} alt="" className="h-12 w-8 rounded-sm object-cover" />}
                <p className="flex-1 text-xs text-murekkep">{secilenEser.baslik}</p>
                <button type="button" onClick={() => setSecilenEser(null)} className="text-[11px] text-kraft hover:text-muhur">
                  Kaldır
                </button>
              </div>
            ) : eserFormuAcik ? (
              <div className="space-y-2 rounded-sm bg-kagit p-2 ring-1 ring-cizgi">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEserKategori('sinema')}
                    className={`rounded-sm px-2 py-1 text-[11px] ${eserKategori === 'sinema' ? 'bg-deniz text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'}`}
                  >
                    Film
                  </button>
                  <button
                    type="button"
                    onClick={() => setEserKategori('dizi')}
                    className={`rounded-sm px-2 py-1 text-[11px] ${eserKategori === 'dizi' ? 'bg-deniz text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'}`}
                  >
                    Dizi
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={eserArama}
                    onChange={(e) => setEserArama(e.target.value)}
                    placeholder="Ara..."
                    className="flex-1 rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                  />
                  <button onClick={eserAra} type="button" className="rounded-sm bg-deniz px-2 py-1 text-[11px] text-kagit">
                    Ara
                  </button>
                </div>
                {eserSonuclari.length > 0 && (
                  <div className="grid grid-cols-5 gap-1">
                    {eserSonuclari.slice(0, 10).map((item) => (
                      <button key={item.id} type="button" onClick={() => eserSec(item)} className="text-left">
                        <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                          {item.poster_path && (
                            <img src={`${TMDB_POSTER}${item.poster_path}`} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEserFormuAcik(true)}
                className="rounded-sm bg-kagit px-3 py-1.5 text-xs text-kraft ring-1 ring-cizgi"
              >
                + Film/Dizi Ekle
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={kaydediliyor}
            className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {kaydediliyor ? 'Ekleniyor...' : 'Paylaş'}
          </button>
        </form>
      )}

      {haberler.length === 0 ? (
        <p className="text-sm text-kraft">Henüz haber yok.</p>
      ) : (
        <ul className="space-y-3">
          {haberler.map((h) => (
            <li key={h.id} className="rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-govde text-sm text-murekkep">{h.baslik}</p>
                  <p className="text-[11px] text-kraft">
                    {h.ekleyenAdi} · {tarihGoster(h.tarih)}
                  </p>
                  {h.icerik && <p className="mt-1 text-sm text-murekkep/90">{h.icerik}</p>}

                  {h.gorselUrl && (
                    <img src={h.gorselUrl} alt="" className="mt-2 max-h-64 w-full rounded-sm object-cover ring-1 ring-cizgi" />
                  )}

                  {h.ilgiliBaslik && (
                    <Link
                      to={eserLink(h.ilgiliTur, h.ilgiliDisId)}
                      className="mt-2 flex items-center gap-2 rounded-sm bg-kagit p-2 ring-1 ring-cizgi hover:ring-deniz w-fit"
                    >
                      {h.ilgiliPosterUrl && <img src={h.ilgiliPosterUrl} alt="" className="h-14 w-10 rounded-sm object-cover" />}
                      <span className="text-xs text-murekkep">{h.ilgiliBaslik}</span>
                    </Link>
                  )}

                  {h.fragmanId && (
                    <div className="mt-2 aspect-video max-w-md overflow-hidden rounded-sm ring-1 ring-cizgi">
                      <iframe
                        src={`https://www.youtube.com/embed/${h.fragmanId}`}
                        title="Fragman"
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
                {kullanici?.uid === h.ekleyenId && (
                  <button onClick={() => sil(h.id)} className="shrink-0 text-xs text-kraft hover:text-muhur">
                    Sil
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

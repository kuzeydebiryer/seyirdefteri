import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { tavsiyeEkle, tavsiyeGuncelle, tavsiyeSil } from '../utils/tavsiye.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w342'
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

export default function TavsiyeBolumu({ tur, tavsiyeler, yenidenYukle }) {
  const { kullanici } = useAuth()
  const [formuAcik, setFormuAcik] = useState(false)
  const [arama, setArama] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [secili, setSecili] = useState(null)
  const [not_, setNot_] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [duzenlenenId, setDuzenlenenId] = useState(null)
  const [duzenlemeUrl, setDuzenlemeUrl] = useState('')

  async function ara(e) {
    e.preventDefault()
    if (!arama.trim()) return
    if (tur === 'kitap') {
      const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(arama)}&maxResults=12${anahtarParcasi}`
      const res = await fetch(url)
      const data = await res.json()
      setSonuclar(data.items || [])
      return
    }
    if (!TMDB_API_KEY) return
    const uc = tur === 'sinema' ? 'movie' : 'tv'
    const url = `https://api.themoviedb.org/3/search/${uc}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(arama)}`
    const res = await fetch(url)
    const data = await res.json()
    setSonuclar(data.results || [])
  }

  function sec(item) {
    if (tur === 'kitap') {
      const v = item.volumeInfo || {}
      setSecili({
        disId: item.id,
        baslik: v.title || '',
        alt: (v.authors || []).join(', '),
        posterUrl: (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://'),
      })
    } else {
      setSecili({
        disId: item.id,
        baslik: tur === 'sinema' ? item.title : item.name,
        posterUrl: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '',
      })
    }
    setSonuclar([])
    setArama('')
  }

  async function gonder(e) {
    e.preventDefault()
    if (!secili || !kullanici) return
    setKaydediliyor(true)
    try {
      await tavsiyeEkle({ tur, ...secili, not: not_, kullanici })
      setSecili(null)
      setNot_('')
      setFormuAcik(false)
      yenidenYukle()
    } finally {
      setKaydediliyor(false)
    }
  }

  async function sil(id) {
    if (!window.confirm('Bu tavsiyeyi kaldırmak istediğine emin misin?')) return
    await tavsiyeSil(id)
    yenidenYukle()
  }

  function duzenlemeyiAc(t) {
    setDuzenlenenId(t.id)
    setDuzenlemeUrl(t.posterUrl || '')
  }

  async function duzenlemeyiKaydet(id) {
    await tavsiyeGuncelle(id, { posterUrl: duzenlemeUrl })
    setDuzenlenenId(null)
    yenidenYukle()
  }

  const esereLink = (disId) => (tur === 'dizi' ? `/dizi/${disId}` : tur === 'kitap' ? `/kitap/${disId}` : `/film/${disId}`)

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">Seyirdefteri Tavsiyeleri</h2>
        {kullanici && (
          <button
            onClick={() => setFormuAcik((a) => !a)}
            className="rounded-sm bg-kagitKoyu px-3 py-1 font-govde text-xs text-kraft ring-1 ring-cizgi"
          >
            {formuAcik ? 'Vazgeç' : '+ Tavsiye Ekle'}
          </button>
        )}
      </div>

      {formuAcik && (
        <div className="mb-4 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          {secili ? (
            <form onSubmit={gonder} className="space-y-2">
              <div className="flex items-center gap-2">
                {secili.posterUrl && <img src={secili.posterUrl} alt="" className="h-16 w-11 rounded-sm object-cover" />}
                <div className="flex-1">
                  <p className="text-sm text-murekkep">{secili.baslik}</p>
                  {secili.alt && <p className="text-xs text-kraft">{secili.alt}</p>}
                </div>
                <button type="button" onClick={() => setSecili(null)} className="text-xs text-kraft hover:text-muhur">
                  Değiştir
                </button>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">
                  Kapak URL {!secili.posterUrl && '(bulunamadı, elle ekleyebilirsin)'}
                </label>
                <input
                  type="text"
                  value={secili.posterUrl}
                  onChange={(e) => setSecili((onceki) => ({ ...onceki, posterUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <textarea
                value={not_}
                onChange={(e) => setNot_(e.target.value)}
                rows={2}
                placeholder="Neden tavsiye ediyorsun? (opsiyonel)"
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
              <button
                type="submit"
                disabled={kaydediliyor}
                className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
              >
                {kaydediliyor ? 'Ekleniyor...' : 'Tavsiye Et'}
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={ara} className="flex gap-2">
                <input
                  type="text"
                  value={arama}
                  onChange={(e) => setArama(e.target.value)}
                  placeholder={tur === 'sinema' ? 'Film ara...' : tur === 'kitap' ? 'Kitap ara...' : 'Dizi ara...'}
                  className="flex-1 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
                <button type="submit" className="rounded-sm bg-deniz px-3 py-2 text-xs text-kagit">
                  Ara
                </button>
              </form>
              {sonuclar.length > 0 && (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {sonuclar.slice(0, 12).map((item) => {
                    const gorselVeAd =
                      tur === 'kitap'
                        ? {
                            url: (item.volumeInfo?.imageLinks?.thumbnail || '').replace('http://', 'https://'),
                            ad: item.volumeInfo?.title,
                          }
                        : { url: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '', ad: item.title || item.name }
                    return (
                      <button key={item.id} type="button" onClick={() => sec(item)} className="text-left">
                        <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                          {gorselVeAd.url && <img src={gorselVeAd.url} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <p className="mt-1 truncate text-[11px] text-murekkep">{gorselVeAd.ad}</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tavsiyeler.length === 0 ? (
        <p className="text-sm text-kraft">Henüz tavsiye yok.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {tavsiyeler.map((t) => (
            <div key={t.id} className="group relative">
              {duzenlenenId === t.id ? (
                <div className="rounded-sm bg-kagit p-2 ring-1 ring-cizgi">
                  <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu">
                    {duzenlemeUrl && <img src={duzenlemeUrl} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <input
                    type="text"
                    value={duzenlemeUrl}
                    onChange={(e) => setDuzenlemeUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 w-full rounded-sm bg-kagitKoyu px-1.5 py-1 text-[10px] text-murekkep ring-1 ring-cizgi"
                  />
                  <div className="mt-1 flex gap-1">
                    <button
                      onClick={() => duzenlemeyiKaydet(t.id)}
                      className="flex-1 rounded-sm bg-muhur py-1 text-[10px] text-kagit"
                    >
                      Kaydet
                    </button>
                    <button
                      onClick={() => setDuzenlenenId(null)}
                      className="rounded-sm bg-kagitKoyu px-2 py-1 text-[10px] text-kraft ring-1 ring-cizgi"
                    >
                      Vazgeç
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Link to={esereLink(t.disId)} className="block">
                    <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                      {t.posterUrl && <img src={t.posterUrl} alt={t.baslik} className="h-full w-full object-cover" />}
                      {t.not && (
                        <div className="absolute inset-x-0 bottom-0 max-h-full overflow-hidden bg-murekkep/85 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <p className="line-clamp-4 text-[10px] leading-tight text-kagit">{t.not}</p>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-murekkep">{t.baslik}</p>
                    {t.alt && <p className="truncate text-[11px] text-kraft">{t.alt}</p>}
                    <p className="truncate text-[11px] text-kraft">{t.ekleyenAdi} tavsiye etti</p>
                  </Link>
                  {kullanici?.uid === t.ekleyenId && (
                    <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {tur === 'kitap' && (
                        <button
                          onClick={() => duzenlemeyiAc(t)}
                          className="rounded-full bg-kagit/90 px-1.5 py-0.5 text-[10px] text-kraft ring-1 ring-cizgi hover:text-deniz"
                          title="Kapak URL'ini düzenle"
                        >
                          ✎
                        </button>
                      )}
                      <button
                        onClick={() => sil(t.id)}
                        className="rounded-full bg-kagit/90 px-1.5 py-0.5 text-[10px] text-kraft ring-1 ring-cizgi hover:text-muhur"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

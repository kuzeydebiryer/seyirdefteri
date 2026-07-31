import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { tavsiyeEkle, tavsiyeSil } from '../utils/tavsiye.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w342'

export default function TavsiyeBolumu({ tur, tavsiyeler, yenidenYukle }) {
  const { kullanici } = useAuth()
  const [formuAcik, setFormuAcik] = useState(false)
  const [arama, setArama] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [secili, setSecili] = useState(null)
  const [not_, setNot_] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  async function ara(e) {
    e.preventDefault()
    if (!arama.trim() || !TMDB_API_KEY) return
    const uc = tur === 'sinema' ? 'movie' : 'tv'
    const url = `https://api.themoviedb.org/3/search/${uc}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(arama)}`
    const res = await fetch(url)
    const data = await res.json()
    setSonuclar(data.results || [])
  }

  function sec(item) {
    setSecili({
      disId: item.id,
      baslik: tur === 'sinema' ? item.title : item.name,
      posterUrl: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '',
    })
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

  const esereLink = (disId) => (tur === 'dizi' ? `/dizi/${disId}` : `/film/${disId}`)

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
                <p className="flex-1 text-sm text-murekkep">{secili.baslik}</p>
                <button type="button" onClick={() => setSecili(null)} className="text-xs text-kraft hover:text-muhur">
                  Değiştir
                </button>
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
                  placeholder={tur === 'sinema' ? 'Film ara...' : 'Dizi ara...'}
                  className="flex-1 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
                <button type="submit" className="rounded-sm bg-deniz px-3 py-2 text-xs text-kagit">
                  Ara
                </button>
              </form>
              {sonuclar.length > 0 && (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {sonuclar.slice(0, 12).map((item) => (
                    <button key={item.id} type="button" onClick={() => sec(item)} className="text-left">
                      <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                        {item.poster_path && (
                          <img src={`${TMDB_POSTER}${item.poster_path}`} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                    </button>
                  ))}
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
            <div key={t.id} className="relative">
              <Link to={esereLink(t.disId)} className="block">
                <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                  {t.posterUrl && <img src={t.posterUrl} alt={t.baslik} className="h-full w-full object-cover" />}
                </div>
                <p className="mt-1 truncate text-xs text-murekkep">{t.baslik}</p>
                <p className="truncate text-[11px] text-kraft">{t.ekleyenAdi} tavsiye etti</p>
              </Link>
              {kullanici?.uid === t.ekleyenId && (
                <button
                  onClick={() => sil(t.id)}
                  className="absolute right-1 top-1 rounded-full bg-kagit/90 px-1.5 py-0.5 text-[10px] text-kraft ring-1 ring-cizgi hover:text-muhur"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { yapimAra } from '../../utils/odaEkrani.js'

// Film/dizi arama kutusu (TMDB). Her sonuçta tek bir eylem düğmesi (Yansıt / Aday ekle).
export default function YapimArama({ eylemEtiketi, onSec, yerTutucu = 'Film ya da dizi ara…' }) {
  const [sorgu, setSorgu] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [araniyor, setAraniyor] = useState(false)
  const [mesgulId, setMesgulId] = useState(null)

  useEffect(() => {
    if (sorgu.trim().length < 2) return setSonuclar([])
    let iptal = false
    setAraniyor(true)
    const t = setTimeout(() => {
      yapimAra(sorgu)
        .then((l) => !iptal && setSonuclar(l))
        .catch(() => !iptal && setSonuclar([]))
        .finally(() => !iptal && setAraniyor(false))
    }, 350)
    return () => {
      iptal = true
      clearTimeout(t)
    }
  }, [sorgu])

  async function sec(e) {
    setMesgulId(e.eserTmdbId)
    try {
      await onSec(e)
      setSorgu('')
      setSonuclar([])
    } finally {
      setMesgulId(null)
    }
  }

  return (
    <div>
      <input
        type="search"
        value={sorgu}
        onChange={(e) => setSorgu(e.target.value)}
        placeholder={yerTutucu}
        className="w-full rounded-sm bg-white/10 px-3 py-2 text-sm text-white placeholder-[#b9b2a3] ring-1 ring-white/20 focus:outline-none focus:ring-[#C9A227]"
      />
      {araniyor && <p className="mt-1 text-[11px] text-[#b9b2a3]">Aranıyor…</p>}
      {sonuclar.length > 0 && (
        <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
          {sonuclar.map((e) => (
            <li key={`${e.eserTur}-${e.eserTmdbId}`} className="flex items-center gap-2 rounded-sm bg-white/5 p-1.5 ring-1 ring-white/10">
              {e.eserPosterUrl ? (
                <img src={e.eserPosterUrl} alt="" className="h-12 w-8 shrink-0 rounded-sm object-cover" />
              ) : (
                <div className="flex h-12 w-8 shrink-0 items-center justify-center rounded-sm bg-white/10 text-xs">🎬</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-white">{e.eserBaslik}</p>
                <p className="text-[10px] text-[#b9b2a3]">
                  {e.eserTur === 'dizi' ? 'Dizi' : 'Film'}
                  {e.eserYil && ` · ${e.eserYil}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => sec(e)}
                disabled={mesgulId != null}
                className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold text-[#0b0b10] disabled:opacity-50"
                style={{ background: '#C9A227' }}
              >
                {mesgulId === e.eserTmdbId ? '…' : eylemEtiketi}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

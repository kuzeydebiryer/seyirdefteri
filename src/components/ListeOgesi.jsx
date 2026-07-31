import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ogePuanla } from '../utils/liste.js'
import YildizPuan from './YildizPuan.jsx'

const YILDIZ_SECENEKLERI = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

function tarihGoster(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ListeOgesi({ topluluklId, listeId, oge }) {
  const { kullanici } = useAuth()
  const [puanlar, setPuanlar] = useState(oge.puanlar || {})
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const degerler = Object.values(puanlar)
  const ortalama = degerler.length ? degerler.reduce((a, b) => a + b, 0) / degerler.length : null
  const benimPuanim = kullanici ? puanlar[kullanici.uid] : null

  async function puanVer(e) {
    const yeniPuan = Number(e.target.value)
    if (!kullanici) return
    setKaydediliyor(true)
    setPuanlar((onceki) => ({ ...onceki, [kullanici.uid]: yeniPuan }))
    try {
      await ogePuanla(oge.id, kullanici.uid, yeniPuan)
    } finally {
      setKaydediliyor(false)
    }
  }

  const esereGit = oge.tmdbId || oge.googleBooksId ? `/${oge.tur === 'kitap' ? 'kitap' : oge.tur === 'dizi' ? 'dizi' : 'film'}/${oge.tmdbId || oge.googleBooksId}` : null

  return (
    <div className="flex items-center gap-4 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
      <div className="h-20 w-14 shrink-0 overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
        {oge.posterUrl && <img src={oge.posterUrl} alt={oge.baslik} className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        {esereGit ? (
          <Link to={esereGit} className="font-govde text-sm text-murekkep hover:underline">
            {oge.baslik} {oge.yil && <span className="text-kraft">({oge.yil})</span>}
          </Link>
        ) : (
          <p className="font-govde text-sm text-murekkep">
            {oge.baslik} {oge.yil && <span className="text-kraft">({oge.yil})</span>}
          </p>
        )}
        {oge.yazar && <p className="text-xs text-kraft">{oge.yazar}</p>}
        {oge.etkinlikTarihi && <p className="text-xs text-kraft">{tarihGoster(oge.etkinlikTarihi)}</p>}
        <div className="mt-1 flex items-center gap-3">
          {ortalama != null ? (
            <div className="flex items-center gap-1">
              <YildizPuan puan={Math.round(ortalama * 2) / 2} boyut="text-xs" />
              <span className="text-[11px] text-kraft">({degerler.length})</span>
            </div>
          ) : (
            <span className="text-xs text-kraft">Henüz puanlanmadı</span>
          )}
        </div>
      </div>
      <select
        value={benimPuanim || ''}
        onChange={puanVer}
        disabled={!kullanici || kaydediliyor}
        className="rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi disabled:opacity-40"
      >
        <option value="" disabled>
          Puan ver
        </option>
        {YILDIZ_SECENEKLERI.map((s) => (
          <option key={s} value={s}>
            {s} ★
          </option>
        ))}
      </select>
    </div>
  )
}

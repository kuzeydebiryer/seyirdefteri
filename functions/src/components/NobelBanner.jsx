import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { nobelEdebiyatYazarlariniGetir, wikipediaFotoGetir } from '../utils/nobelYazarlar.js'

const ONIZLEME_SAYISI = 5

// KitaplarKesfet.jsx'in en üstündeki Nobel banner'ı — sade bir metin şeridi
// yerine, o an rastgele seçilen birkaç yazarın portresini göstererek "içeride
// kimler var" hissi veriyor. Ayrı bir "Günün Yazarı" kartı açmak yerine (zaten
// Günün Kitabı + Meydan Okuma var, üçüncü bir kutu kalabalık ederdi) mevcut
// banner'ı zenginleştirmeyi tercih ettik.
export default function NobelBanner() {
  const [onizleme, setOnizleme] = useState([])
  const [fotolar, setFotolar] = useState({})

  useEffect(() => {
    let iptal = false
    nobelEdebiyatYazarlariniGetir()
      .then((liste) => {
        if (iptal || liste.length === 0) return
        const karisik = [...liste].sort(() => Math.random() - 0.5).slice(0, ONIZLEME_SAYISI)
        setOnizleme(karisik)
        karisik.forEach(async (l) => {
          const foto = await wikipediaFotoGetir(l.isim)
          if (!iptal) setFotolar((onceki) => ({ ...onceki, [l.isim]: foto }))
        })
      })
      .catch(() => {}) // banner süslemesi — başarısız olursa sessizce sade haliyle kalsın
    return () => {
      iptal = true
    }
  }, [])

  return (
    <Link
      to="/nobel-yazarlari"
      className="mb-4 flex items-center justify-between gap-3 rounded-sm bg-gise/15 px-4 py-3 ring-1 ring-gise/40 hover:bg-gise/25"
    >
      <span className="flex min-w-0 items-center gap-2 text-sm text-murekkep">
        <span className="text-xl">🏅</span>
        <span className="truncate">Nobel Ödüllü Yazarlar — 1901'den bugüne tüm kazananlar</span>
      </span>

      <div className="flex shrink-0 items-center gap-3">
        {onizleme.length > 0 && (
          <div className="hidden sm:flex -space-x-2">
            {onizleme.map((l) => (
              <div
                key={l.isim}
                title={`${l.isim} (${l.yil})`}
                className="h-8 w-8 overflow-hidden rounded-full bg-kagit ring-2 ring-kagit"
              >
                {fotolar[l.isim] ? (
                  <img src={fotolar[l.isim]} alt={l.isim} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-kraft">{l.isim[0]}</div>
                )}
              </div>
            ))}
          </div>
        )}
        <span className="shrink-0 rounded-full bg-gise px-3 py-1 font-govde text-xs text-kagit">Keşfet →</span>
      </div>
    </Link>
  )
}

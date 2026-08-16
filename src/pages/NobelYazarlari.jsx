import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const SAYFA_BOYUTU = 10

function isimAnahtari(isim) {
  return isim.trim()
}

export default function NobelYazarlari() {
  const [laureatlar, setLaureatlar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')
  const [sayfa, setSayfa] = useState(0)
  const [fotoOnbellek, setFotoOnbellek] = useState({})

  // Nobel'in resmi ücretsiz API'si — isim/yıl için güvenilir tek kaynak.
  // Fotoğraf döndürmüyor, o yüzden görsel için ayrıca Wikipedia'nın özet
  // API'sini kullanıyoruz (aşağıda, sadece o an görünen sayfa için).
  useEffect(() => {
    let iptal = false
    async function getir() {
      try {
        const res = await fetch('https://api.nobelprize.org/2.1/laureates?nobelPrizeCategory=lit&limit=200&sort=desc')
        if (!res.ok) throw new Error('Nobel API yanıt vermedi')
        const data = await res.json()
        const liste = (data.laureates || [])
          .map((l) => {
            const odul = (l.nobelPrizes || []).find((p) => p.category?.en === 'Literature') || l.nobelPrizes?.[0]
            const isim = l.knownName?.en || [l.givenName?.en, l.familyName?.en].filter(Boolean).join(' ')
            return { isim, yil: odul?.awardYear ? Number(odul.awardYear) : null }
          })
          .filter((l) => l.isim && l.yil)
          .sort((a, b) => b.yil - a.yil)
        if (!iptal) setLaureatlar(liste)
      } catch (e) {
        if (!iptal) setHata('Nobel listesi yüklenemedi: ' + e.message)
      } finally {
        if (!iptal) setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [])

  const toplamSayfa = Math.ceil(laureatlar.length / SAYFA_BOYUTU)
  const gosterilenler = laureatlar.slice(sayfa * SAYFA_BOYUTU, (sayfa + 1) * SAYFA_BOYUTU)

  // Sadece o an görünen 10 kişi için fotoğraf aranıyor — hepsi için baştan
  // arama yapmak (120+ kişi) hem yavaş hem gereksiz olurdu. Sayfa değişince
  // tekrar aranmasın diye önbelleğe alınıyor.
  useEffect(() => {
    if (gosterilenler.length === 0) return
    let iptal = false
    gosterilenler.forEach(async (l) => {
      const anahtar = isimAnahtari(l.isim)
      if (fotoOnbellek[anahtar] !== undefined) return
      try {
        const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(l.isim.replace(/ /g, '_'))}`)
        if (!res.ok) throw new Error('yok')
        const data = await res.json()
        const foto = data.thumbnail?.source || null
        if (!iptal) setFotoOnbellek((onceki) => ({ ...onceki, [anahtar]: foto }))
      } catch {
        if (!iptal) setFotoOnbellek((onceki) => ({ ...onceki, [anahtar]: null }))
      }
    })
    return () => {
      iptal = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sayfa, laureatlar])

  return (
    <div>
      <div className="mb-6 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
        <p className="text-xs uppercase tracking-widest text-gise">🏅 Nobel Edebiyat Ödülü</p>
        <h1 className="mt-1 font-baslik text-2xl text-murekkep">Nobel Ödüllü Yazarlar</h1>
        <p className="mt-1 text-sm text-kraft">1901'den bugüne ödülü kazanan tüm yazarlar.</p>
      </div>

      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {hata && <p className="text-sm text-muhur">{hata}</p>}

      {!yukleniyor && !hata && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {gosterilenler.map((l) => {
              const foto = fotoOnbellek[isimAnahtari(l.isim)]
              return (
                <Link key={`${l.isim}-${l.yil}`} to={`/yazar/${encodeURIComponent(l.isim)}`} className="text-center">
                  <div className="mx-auto aspect-square w-full max-w-[140px] overflow-hidden rounded-full bg-kagitKoyu ring-1 ring-cizgi">
                    {foto ? (
                      <img src={foto} alt={l.isim} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl text-kraft">
                        {foto === undefined ? '…' : l.isim[0]}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 truncate text-sm text-murekkep">{l.isim}</p>
                  <p className="font-baslik text-lg text-gise">{l.yil}</p>
                </Link>
              )
            })}
          </div>

          {toplamSayfa > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setSayfa((s) => Math.max(0, s - 1))}
                disabled={sayfa === 0}
                className="rounded-full h-8 w-8 text-xs text-kraft ring-1 ring-cizgi disabled:opacity-30"
              >
                ‹
              </button>
              {Array.from({ length: toplamSayfa }, (_, i) => i)
                .filter((i) => i === 0 || i === toplamSayfa - 1 || Math.abs(i - sayfa) <= 1)
                .map((i, idx, arr) => (
                  <span key={i} className="flex items-center gap-2">
                    {idx > 0 && arr[idx - 1] !== i - 1 && <span className="text-kraft">…</span>}
                    <button
                      onClick={() => setSayfa(i)}
                      className={`h-8 w-8 rounded-full text-xs ${
                        sayfa === i ? 'bg-murekkep text-kagit' : 'text-kraft ring-1 ring-cizgi hover:text-murekkep'
                      }`}
                    >
                      {i + 1}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setSayfa((s) => Math.min(toplamSayfa - 1, s + 1))}
                disabled={sayfa === toplamSayfa - 1}
                className="rounded-full h-8 w-8 text-xs text-kraft ring-1 ring-cizgi disabled:opacity-30"
              >
                ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { SAHNE_ALANLARI, kisiselNotGetir, kisiselNotKaydet } from '../../utils/incelemeDefteri.js'
import { zamanFormatla } from '../../utils/altyazi.js'

// 📝 Notlarım: konuşurken/dinlerken kameranın yanında açılan, YALNIZCA sahibinin gördüğü kart.
// "Konuşma notum" defterdeki Kişisel Notlar ile aynı kayıttır (kendiliğinden kaydedilir).
// Altında kendi Yakın Okuma kartın ve an notların durur. Sabit koyu palet.
export default function NotlarimKarti({ etkinlikId, benimUid, defter, kapat }) {
  const [metin, setMetin] = useState('')
  const [yuklendi, setYuklendi] = useState(false)
  const [durum, setDurum] = useState('')
  const [olcek, setOlcek] = useState(1)
  const zamanlayici = useRef(null)

  useEffect(() => {
    let iptal = false
    kisiselNotGetir(etkinlikId, benimUid)
      .then((m) => !iptal && setMetin(m))
      .catch(() => {})
      .finally(() => !iptal && setYuklendi(true))
    return () => {
      iptal = true
    }
  }, [etkinlikId, benimUid])

  function degisti(v) {
    setMetin(v)
    setDurum('yazılıyor…')
    clearTimeout(zamanlayici.current)
    zamanlayici.current = setTimeout(() => {
      kisiselNotKaydet(etkinlikId, benimUid, v)
        .then(() => setDurum('✓ kaydedildi'))
        .catch(() => setDurum('kaydedilemedi'))
    }, 900)
  }
  useEffect(() => () => clearTimeout(zamanlayici.current), [])

  const sahnem = defter.sahneKayitlari.find((k) => k.id === benimUid)
  const anlarim = defter.anNotlari.filter((n) => n.kullaniciId === benimUid)
  const yazi = { fontSize: `${0.9 * olcek}rem`, lineHeight: 1.5 }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-md bg-[#121219]/95 ring-1 ring-[#C9A227]/40 backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="whitespace-nowrap font-baslik text-base text-white">📝 Notlarım</span>
        <span className="hidden text-[10px] uppercase tracking-wider text-[#b9b2a3] sm:inline">yalnızca sen görürsün</span>
        <span className="ml-auto flex gap-1">
          <button type="button" onClick={() => setOlcek((o) => Math.max(0.8, +(o - 0.1).toFixed(1)))} className="rounded-sm bg-white/15 px-2 py-0.5 text-xs text-white">
            A−
          </button>
          <button type="button" onClick={() => setOlcek((o) => Math.min(1.8, +(o + 0.1).toFixed(1)))} className="rounded-sm bg-white/15 px-2 py-0.5 text-xs text-white">
            A+
          </button>
          <button type="button" onClick={kapat} className="rounded-sm bg-white/15 px-2 py-0.5 text-xs text-white" title="Kapat">
            ✕
          </button>
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C9A227]">Konuşma notum</p>
            <p className="text-[10px] text-[#b9b2a3]">{durum}</p>
          </div>
          <textarea
            value={metin}
            onChange={(e) => degisti(e.target.value)}
            disabled={!yuklendi}
            rows={7}
            placeholder={yuklendi ? 'Söyleyeceklerini madde madde yaz…' : 'Yükleniyor…'}
            className="w-full resize-y rounded-sm bg-black/40 p-2 text-white placeholder-[#8f887a] ring-1 ring-white/15 focus:outline-none focus:ring-[#C9A227]"
            style={yazi}
          />
        </div>

        {sahnem && SAHNE_ALANLARI.some((a) => sahnem[a.id]) && (
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#C9A227]">Yakın Okuma kartım</p>
            <div className="space-y-2 rounded-sm bg-white/5 p-2 ring-1 ring-white/10">
              {SAHNE_ALANLARI.filter((a) => sahnem[a.id]).map((a) => (
                <div key={a.id}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#ffd84d]">{a.etiket}</p>
                  <p className="whitespace-pre-wrap text-white" style={yazi}>
                    {sahnem[a.id]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {anlarim.length > 0 && (
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#C9A227]">An notlarım ({anlarim.length})</p>
            <ul className="space-y-2">
              {anlarim.map((n) => (
                <li key={n.id} className="rounded-sm bg-white/5 p-2 ring-1 ring-white/10">
                  <p className="font-mono text-xs text-[#ffd84d]">⏱ {zamanFormatla(n.hedefMs)}</p>
                  {n.replik && (
                    <p className="italic text-white" style={yazi}>
                      “{n.replik}”
                    </p>
                  )}
                  {n.yorum && (
                    <p className="mt-1 whitespace-pre-wrap text-[#e8e2d4]" style={yazi}>
                      {n.yorum}
                    </p>
                  )}
                  {n.soru && (
                    <p className="mt-1 text-[#ffd84d]" style={yazi}>
                      💬 {n.soru}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!sahnem && anlarim.length === 0 && (
          <p className="text-xs text-[#b9b2a3]">İnceleme Defteri’ndeki Yakın Okuma kartın ve an notların da burada görünür.</p>
        )}
      </div>
    </div>
  )
}

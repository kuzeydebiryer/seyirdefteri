import { useEffect, useMemo, useState } from 'react'
import {
  benimOyumuGetir,
  ortalamaHesapla,
  ortalamayiKaydet,
  oyVer,
  puanimiFilmeIsle,
  puanYaz,
  yildizaCevir,
} from '../../utils/sinemaOdasiCanli.js'

// ⭐ Canlı Puanlama Töreni
// bos → (moderatör başlatır) → oylama: herkes gizli oy verir, kimin verdiği "?" kartıyla görünür
// → (moderatör "Puanları Aç") → acik: kartlar sırayla döner, kulüp ortalaması sayarak belirir.
// Sabit koyu sinema paleti.

const ALTIN = '#C9A227'
const SARI = '#ffd84d'

const STIL = `
@keyframes sdKartAc { 0% { transform: perspective(600px) rotateY(90deg) scale(.92); opacity: 0 } 100% { transform: perspective(600px) rotateY(0) scale(1); opacity: 1 } }
@keyframes sdNabiz { 0%,100% { transform: scale(1) } 50% { transform: scale(1.06) } }
.sd-kart-ac { animation: sdKartAc .65s cubic-bezier(.2,.8,.2,1) both }
.sd-nabiz { animation: sdNabiz 1.6s ease-in-out infinite }
@media (prefers-reduced-motion: reduce) { .sd-kart-ac, .sd-nabiz { animation: none } }
`

function SayanOrtalama({ hedef, gecikmeMs }) {
  const [deger, setDeger] = useState(0)
  useEffect(() => {
    if (hedef == null) return
    let r
    let bas = null
    const t = setTimeout(() => {
      const adim = (zaman) => {
        if (bas == null) bas = zaman
        const ilerleme = Math.min(1, (zaman - bas) / 1400)
        setDeger(hedef * (1 - Math.pow(1 - ilerleme, 3)))
        if (ilerleme < 1) r = requestAnimationFrame(adim)
      }
      r = requestAnimationFrame(adim)
    }, gecikmeMs)
    return () => {
      clearTimeout(t)
      cancelAnimationFrame(r)
    }
  }, [hedef, gecikmeMs])
  return <>{puanYaz(Math.round(deger * 100) / 100, 2)}</>
}

function Dugme({ children, onClick, disabled, birincil, tehlike }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-4 py-2 text-sm font-bold transition disabled:opacity-40 ${
        birincil ? 'text-[#0b0b10] hover:brightness-110' : tehlike ? 'bg-white/10 text-[#ffb4b4] ring-1 ring-white/20' : 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20'
      }`}
      style={birincil ? { background: ALTIN } : undefined}
    >
      {children}
    </button>
  )
}

export default function PuanlamaToreni({ etkinlik, puanlama, oyVerenler, oylar, benimUid, adim, moderatorMu, durumYaz, kucult }) {
  const { durum, turId } = puanlama
  const [benimOyum, setBenimOyum] = useState(null)
  const [secilen, setSecilen] = useState(7)
  const [mesgul, setMesgul] = useState(false)
  const [hata, setHata] = useState('')
  const [isledim, setIsledim] = useState(false)
  const [arsivlendi, setArsivlendi] = useState(false)

  // Yeni turda kendi (gizli) oyumu yükle.
  useEffect(() => {
    setIsledim(false)
    setArsivlendi(false)
    setHata('')
    if (!turId || !benimUid) return setBenimOyum(null)
    let iptal = false
    benimOyumuGetir(etkinlik.id, benimUid)
      .then((o) => {
        if (iptal) return
        const gecerli = o && o.turId === turId ? o : null
        setBenimOyum(gecerli)
        if (gecerli) setSecilen(gecerli.puan)
      })
      .catch(() => {})
    return () => {
      iptal = true
    }
  }, [etkinlik.id, benimUid, turId])

  const verenler = useMemo(() => oyVerenler.filter((o) => o.turId === turId).sort((a, b) => a.ad.localeCompare(b.ad, 'tr')), [oyVerenler, turId])
  const acilanlar = useMemo(() => [...oylar].filter((o) => o.turId === turId).sort((a, b) => a.ad.localeCompare(b.ad, 'tr')), [oylar, turId])
  const ortalama = ortalamaHesapla(acilanlar)

  async function islem(fn) {
    setMesgul(true)
    setHata('')
    try {
      await fn()
    } catch (e) {
      setHata(e?.message?.includes('permission') ? 'Bu işlem için yetkin yok ya da oylama kapandı.' : e?.message || 'İşlem yapılamadı.')
    } finally {
      setMesgul(false)
    }
  }

  const gonder = () =>
    islem(async () => {
      await oyVer(etkinlik.id, benimUid, adim, secilen, turId)
      setBenimOyum({ puan: secilen, turId })
    })

  let govde
  if (durum === 'bos') {
    govde = (
      <div className="text-center">
        <p className="text-5xl">⭐</p>
        <h3 className="mt-2 font-baslik text-2xl text-white">Puanlama Töreni</h3>
        {moderatorMu ? (
          <>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[#d9d2c3]">
              Başlatınca herkesin ekranında gizli oy penceresi açılır. Puanlar sen “Puanları Aç” diyene kadar kimseye görünmez.
            </p>
            <div className="mt-4">
              <Dugme birincil disabled={mesgul} onClick={() => islem(() => durumYaz({ puanlama: { durum: 'oylama', turId: Date.now() } }))}>
                ⭐ Puanlamayı Başlat
              </Dugme>
            </div>
          </>
        ) : (
          <p className="mx-auto mt-2 max-w-sm text-sm text-[#d9d2c3]">Moderatör puanlamayı başlatınca burada gizli oyunu vereceksin.</p>
        )}
      </div>
    )
  } else if (durum === 'oylama') {
    govde = (
      <div>
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: SARI }}>
          Gizli oylama sürüyor
        </p>
        <h3 className="mt-1 text-center font-baslik text-2xl text-white">{etkinlik.eserBaslik} kaç puan?</h3>

        <div className="mt-4 rounded-md bg-white/5 p-4 ring-1 ring-white/10">
          <p className="text-center font-baslik leading-none" style={{ color: SARI, fontSize: '4rem' }}>
            {puanYaz(secilen)}
            <span className="text-2xl text-[#b9b2a3]">/10</span>
          </p>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={secilen}
            onChange={(e) => setSecilen(Number(e.target.value))}
            className="mt-3 w-full"
            style={{ accentColor: ALTIN }}
            aria-label="Puan"
          />
          <div className="mt-2 grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSecilen(n)}
                className={`rounded-sm py-1.5 text-sm font-bold ${Math.floor(secilen) === n ? 'text-[#0b0b10]' : 'bg-white/10 text-white'}`}
                style={Math.floor(secilen) === n ? { background: ALTIN } : undefined}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-2 flex justify-center gap-2">
            <button type="button" onClick={() => setSecilen((s) => Math.max(1, s - 0.5))} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white">
              − 0,5
            </button>
            <button type="button" onClick={() => setSecilen((s) => Math.min(10, s + 0.5))} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white">
              + 0,5
            </button>
          </div>
          <div className="mt-4 text-center">
            <Dugme birincil disabled={mesgul || benimOyum?.puan === secilen} onClick={gonder}>
              {benimOyum ? '🔒 Oyumu Güncelle' : '🔒 Gizli Gönder'}
            </Dugme>
            {benimOyum && (
              <p className="mt-2 text-xs text-[#d9d2c3]">
                ✓ Oyun gizli olarak kaydedildi ({puanYaz(benimOyum.puan)}). Açılana kadar değiştirebilirsin.
              </p>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-[#b9b2a3]">{verenler.length} kişi oy verdi</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {verenler.map((o) => (
            <div key={o.uid} className="w-20 rounded-md bg-[#1f1f2e] p-2 text-center ring-2 ring-[#f5f0e1]/70">
              <p className="sd-nabiz font-baslik text-3xl" style={{ color: SARI }}>
                ?
              </p>
              <p className="truncate text-[11px] text-white">{o.ad}</p>
            </div>
          ))}
        </div>

        {moderatorMu && (
          <div className="mt-5 flex flex-wrap justify-center gap-2 border-t border-white/10 pt-4">
            <Dugme birincil disabled={mesgul || verenler.length === 0} onClick={() => islem(() => durumYaz({ puanlama: { durum: 'acik', turId } }))}>
              🎉 Puanları Aç
            </Dugme>
            <Dugme tehlike disabled={mesgul} onClick={() => islem(() => durumYaz({ puanlama: { durum: 'bos', turId: 0 } }))}>
              İptal
            </Dugme>
          </div>
        )}
      </div>
    )
  } else {
    const gecikme = acilanlar.length * 280 + 300
    const enYuksek = acilanlar.length ? Math.max(...acilanlar.map((o) => o.puan)) : null
    const enDusuk = acilanlar.length ? Math.min(...acilanlar.map((o) => o.puan)) : null
    govde = (
      <div>
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: SARI }}>
          Puanlar açıldı
        </p>
        <h3 className="mt-1 text-center font-baslik text-2xl text-white">{etkinlik.eserBaslik}</h3>

        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {acilanlar.map((o, i) => (
            <div
              key={o.uid}
              className="sd-kart-ac w-24 rounded-md bg-[#1f1f2e] p-3 text-center ring-2 ring-[#f5f0e1]"
              style={{ animationDelay: `${i * 280}ms` }}
            >
              <p className="font-baslik leading-none" style={{ color: SARI, fontSize: '2.4rem' }}>
                {puanYaz(o.puan)}
              </p>
              <p className="mt-1 truncate text-[11px] text-white">{o.ad}</p>
            </div>
          ))}
        </div>

        {ortalama != null ? (
          <div className="mt-6 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#d9d2c3]">Kulüp ortalaması</p>
            <p className="font-baslik leading-none" style={{ color: SARI, fontSize: '4.5rem' }}>
              <SayanOrtalama hedef={ortalama} gecikmeMs={gecikme} />
            </p>
            <p className="mt-1 text-xs text-[#b9b2a3]">
              {acilanlar.length} oy · en yüksek {puanYaz(enYuksek)} · en düşük {puanYaz(enDusuk)}
            </p>
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-[#d9d2c3]">Puanlar yükleniyor…</p>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-2 border-t border-white/10 pt-4">
          {benimOyum && etkinlik.eserTmdbId && (
            <Dugme
              disabled={mesgul || isledim}
              onClick={() =>
                islem(async () => {
                  await puanimiFilmeIsle(etkinlik, benimUid, benimOyum.puan)
                  setIsledim(true)
                })
              }
            >
              {isledim ? '✓ Film sayfana işlendi' : `★ Puanımı film sayfama işle (${puanYaz(yildizaCevir(benimOyum.puan))}/5)`}
            </Dugme>
          )}
          {moderatorMu && (
            <>
              <Dugme
                birincil
                disabled={mesgul || arsivlendi || ortalama == null}
                onClick={() =>
                  islem(async () => {
                    await ortalamayiKaydet(etkinlik.id, ortalama, acilanlar.length)
                    setArsivlendi(true)
                  })
                }
              >
                {arsivlendi ? '✓ Arşive kaydedildi' : '💾 Ortalamayı arşive kaydet'}
              </Dugme>
              <Dugme disabled={mesgul} onClick={() => islem(() => durumYaz({ puanlama: { durum: 'oylama', turId: Date.now() } }))}>
                🔄 Yeni tur
              </Dugme>
              <Dugme tehlike disabled={mesgul} onClick={() => islem(() => durumYaz({ puanlama: { durum: 'bos', turId: 0 } }))}>
                Töreni bitir
              </Dugme>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <style>{STIL}</style>
      {kucult && (
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={kucult} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white ring-1 ring-white/20">
            ▾ Küçült
          </button>
        </div>
      )}
      {govde}
      {hata && <p className="mt-3 rounded-sm bg-[#9b1c1c]/80 px-3 py-2 text-center text-sm text-white">{hata}</p>}
    </div>
  )
}

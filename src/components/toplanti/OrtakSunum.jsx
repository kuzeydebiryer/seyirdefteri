import { useEffect, useMemo, useState } from 'react'
import { SlaytGovdesi, slaytlariKur } from '../TartismaModu.jsx'

// 🎞️ Senkron Tartışma Modu: moderatör slaytı değiştirince herkesin ekranında aynı slayt açılır.
// Slaytlar defterin canlı verisinden kurulur (Yakın Okuma, kareler, kesitler, anlar, bölümler,
// sorular, puanlar). Slayt anahtarla eşlenir (ör. "sahne:<uid>") — biri bu sırada yeni not
// eklese bile herkes aynı slaytta kalır. Yazı boyutu kişiseldir.
export default function OrtakSunum({ etkinlik, kunye, veri, sunum, moderatorMu, durumYaz }) {
  const [olcek, setOlcek] = useState(0.85)
  const slaytlar = useMemo(
    () => slaytlariKur({ etkinlik, sahneKayitlari: veri.sahneKayitlari, bolumler: veri.bolumler, medya: veri.medya, anNotlari: veri.anNotlari }),
    [etkinlik, veri.sahneKayitlari, veri.bolumler, veri.medya, veri.anNotlari]
  )
  const bulunan = slaytlar.findIndex((s) => s.anahtar === sunum.anahtar)
  const sira = bulunan >= 0 ? bulunan : Math.max(0, Math.min(slaytlar.length - 1, sunum.sira || 0))
  const slayt = slaytlar[sira]

  const git = (n) => {
    if (!moderatorMu) return
    const i = Math.max(0, Math.min(slaytlar.length - 1, n))
    durumYaz({ sunum: { anahtar: slaytlar[i].anahtar, sira: i } }).catch(() => {})
  }

  useEffect(() => {
    if (!moderatorMu) return
    function tus(e) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') git(sira + 1)
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') git(sira - 1)
    }
    window.addEventListener('keydown', tus)
    return () => window.removeEventListener('keydown', tus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moderatorMu, sira, slaytlar])

  const yorumAc = (id) => {
    if (moderatorMu) durumYaz({ sunum: { acikYorumlar: { [id]: true } } }).catch(() => {})
  }

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: '#0a0a10' }}>
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5 text-xs text-white">
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0b0b10]" style={{ background: '#C9A227' }}>
          Ortak ekran
        </span>
        <span className="truncate text-[#d9d2c3]">
          {sira + 1}/{slaytlar.length} · {slayt?.etiket}
        </span>
        <span className="ml-auto flex shrink-0 gap-1">
          <button type="button" onClick={() => setOlcek((o) => Math.max(0.6, +(o - 0.1).toFixed(1)))} className="rounded-sm bg-white/15 px-2 py-0.5" title="Yazıyı küçült">
            A−
          </button>
          <button type="button" onClick={() => setOlcek((o) => Math.min(1.6, +(o + 0.1).toFixed(1)))} className="rounded-sm bg-white/15 px-2 py-0.5" title="Yazıyı büyüt">
            A+
          </button>
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-8">
        <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center">
          {slayt && (
            <SlaytGovdesi
              slayt={slayt}
              etkinlik={etkinlik}
              kunye={kunye}
              medya={veri.medya}
              puanlar={veri.puanlar}
              olcek={olcek}
              acikYorumlar={sunum.acikYorumlar || {}}
              yorumAc={moderatorMu ? yorumAc : undefined}
            />
          )}
        </div>
      </div>

      {moderatorMu ? (
        <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2">
          <button type="button" onClick={() => git(sira - 1)} disabled={sira === 0} className="rounded-sm bg-white/15 px-3 py-1.5 text-xs text-white disabled:opacity-40">
            ← Önceki
          </button>
          <div className="flex flex-1 items-center justify-center gap-1 overflow-x-auto">
            {slaytlar.map((s, i) => (
              <button
                key={s.anahtar}
                type="button"
                onClick={() => git(i)}
                title={s.etiket}
                className={`h-2 shrink-0 rounded-full transition-all ${i === sira ? 'w-6 bg-[#ffd84d]' : 'w-2 bg-white/30 hover:bg-white/60'}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => git(sira + 1)}
            disabled={sira === slaytlar.length - 1}
            className="rounded-sm px-3 py-1.5 text-xs font-bold text-[#0b0b10] disabled:opacity-40"
            style={{ background: '#ffd84d' }}
          >
            Sonraki →
          </button>
        </div>
      ) : (
        <p className="border-t border-white/10 px-3 py-1.5 text-center text-[11px] text-[#b9b2a3]">Slaytları moderatör yönetiyor.</p>
      )}
    </div>
  )
}

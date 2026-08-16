import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBildirimler } from '../context/BildirimContext.jsx'

function zamanGoster(tarih) {
  const ms = tarih?.toMillis?.()
  if (!ms) return ''
  const farkDk = Math.floor((Date.now() - ms) / 60000)
  if (farkDk < 1) return 'az önce'
  if (farkDk < 60) return `${farkDk} dk önce`
  const farkSaat = Math.floor(farkDk / 60)
  if (farkSaat < 24) return `${farkSaat} sa önce`
  return new Date(ms).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

// Uygulama içi bildirim merkezi — zil ikonuna tıklayınca son 30 bildirimi
// (okunmuş/okunmamış ayrımıyla) gösteren açılır bir panel. Veri BildirimContext
// üzerinden geliyor (uygulama kökünde tek seferlik çekiliyor, bkz. o dosyadaki not).
export default function BildirimZili() {
  const { bildirimler, okunmamisSayisi, yenile, birTaneOkunduIsaretle, hepsiniOkunduIsaretle } = useBildirimler()
  const [acik, setAcik] = useState(false)
  const navigate = useNavigate()

  function ac() {
    const yeniDurum = !acik
    setAcik(yeniDurum)
    if (yeniDurum) yenile()
  }

  async function tiklandi(b) {
    if (!b.okunduMu) await birTaneOkunduIsaretle(b.id)
    setAcik(false)
    navigate(b.url)
  }

  return (
    <div className="relative">
      <button onClick={ac} className="relative text-kraft hover:text-murekkep" title="Bildirimler">
        <span className="text-lg">🔔</span>
        {okunmamisSayisi > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-muhur px-1 text-[9px] font-medium text-kagit">
            {okunmamisSayisi > 9 ? '9+' : okunmamisSayisi}
          </span>
        )}
      </button>

      {acik && (
        <>
          {/* Panel dışına tıklayınca kapatmak için görünmez bir kaplama */}
          <div className="fixed inset-0 z-40" onClick={() => setAcik(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[85vw] rounded-sm bg-kagit shadow-lg ring-1 ring-cizgi">
            <div className="flex items-center justify-between border-b border-cizgi px-3 py-2">
              <p className="font-baslik text-sm text-murekkep">Bildirimler</p>
              {okunmamisSayisi > 0 && (
                <button onClick={hepsiniOkunduIsaretle} className="text-[11px] text-kraft hover:text-deniz hover:underline">
                  Tümünü okundu işaretle
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {bildirimler.length === 0 && <p className="p-4 text-center text-xs text-kraft">Henüz bildirim yok.</p>}
              {bildirimler.map((b) => (
                <button
                  key={b.id}
                  onClick={() => tiklandi(b)}
                  className={`block w-full border-b border-cizgi px-3 py-2 text-left last:border-0 hover:bg-kagitKoyu ${
                    b.okunduMu ? '' : 'bg-kagitKoyu'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs ${b.okunduMu ? 'text-kraft' : 'font-medium text-murekkep'}`}>{b.baslik}</p>
                    {!b.okunduMu && <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muhur" />}
                  </div>
                  <p className="truncate text-xs text-kraft">{b.govde}</p>
                  <p className="mt-0.5 text-[10px] text-kraft/70">{zamanGoster(b.olusturmaTarihi)}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

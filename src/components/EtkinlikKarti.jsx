import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { etkinligeKatil, etkinliktenAyril } from '../utils/etkinlik.js'

function tarihSaatGoster(iso) {
  if (!iso) return 'Tarih belirlenmedi'
  const d = new Date(iso)
  return d.toLocaleString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

export default function EtkinlikKarti({ etkinlik, gonderiBasligi }) {
  const { kullanici } = useAuth()
  const [katilimcilar, setKatilimcilar] = useState(etkinlik.katilimcilar || [])
  const katiliyorMu = kullanici && katilimcilar.includes(kullanici.uid)

  async function degistir() {
    if (!kullanici) return
    const yeni = katiliyorMu ? katilimcilar.filter((u) => u !== kullanici.uid) : [...katilimcilar, kullanici.uid]
    setKatilimcilar(yeni)
    if (katiliyorMu) await etkinliktenAyril(etkinlik.id, kullanici.uid)
    else await etkinligeKatil(etkinlik.id, kullanici.uid)
  }

  return (
    <div className="rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-govde text-sm text-murekkep">
            {etkinlik.baslik}
            {gonderiBasligi && (
              <>
                {' '}
                ·{' '}
                <Link to={`/gonderi/${etkinlik.gonderiId}`} className="text-kraft hover:underline">
                  {gonderiBasligi}
                </Link>
              </>
            )}
          </p>
          <p className="text-xs text-kraft mt-0.5">{tarihSaatGoster(etkinlik.tarih)}</p>
          {etkinlik.aciklama && <p className="mt-1 text-xs text-murekkep/90">{etkinlik.aciklama}</p>}
          <p className="mt-1 text-xs text-kraft">{katilimcilar.length} kişi katılıyor</p>
        </div>
        <button
          onClick={degistir}
          disabled={!kullanici}
          className={`shrink-0 rounded-sm px-3 py-1.5 font-govde text-xs ${
            katiliyorMu ? 'bg-kagit text-kraft ring-1 ring-cizgi' : 'bg-muhur text-kagit'
          } disabled:opacity-40`}
        >
          {katiliyorMu ? 'Katılıyorsun' : 'Katıl'}
        </button>
      </div>
    </div>
  )
}

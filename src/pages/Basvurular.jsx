import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { bekleyenBasvurulariGetir, basvuruOnayla, basvuruReddet } from '../utils/uyelikBasvuru.js'

// Ayrı bir "yönetici" rolü yok — herhangi bir üye, kendi davet hakkı varsa
// bir başvuruyu onaylayıp kod üretebiliyor. Bu, sitenin zaten var olan
// akran-daveti (peer-invite) kültürüyle tutarlı.
export default function Basvurular() {
  const { kullanici, profil } = useAuth()
  const [basvurular, setBasvurular] = useState(null)
  const [islenenId, setIslenenId] = useState(null)
  const [uretilenKodlar, setUretilenKodlar] = useState({})

  useEffect(() => {
    bekleyenBasvurulariGetir().then(setBasvurular)
  }, [])

  async function onaylaTiklandi(basvuru) {
    if (!kullanici) return
    setIslenenId(basvuru.id)
    try {
      const kod = await basvuruOnayla(basvuru, kullanici.uid, profil?.adSoyad || kullanici.displayName)
      setUretilenKodlar((onceki) => ({ ...onceki, [basvuru.id]: kod }))
      setBasvurular((liste) => liste.filter((b) => b.id !== basvuru.id))
    } catch (err) {
      window.alert(err.message)
    } finally {
      setIslenenId(null)
    }
  }

  async function reddetTiklandi(basvuru) {
    if (!window.confirm(`${basvuru.ad} adlı başvuruyu reddetmek istediğine emin misin?`)) return
    setIslenenId(basvuru.id)
    try {
      await basvuruReddet(basvuru.id)
      setBasvurular((liste) => liste.filter((b) => b.id !== basvuru.id))
    } finally {
      setIslenenId(null)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-baslik text-2xl text-murekkep mb-1">Üyelik Başvuruları</h1>
      <p className="text-sm text-kraft mb-6">
        Onayladığın başvuru için senin davet kotandan bir kod üretilir (kalan hakkın: {profil?.kalanDavetHakki ?? '—'}) — kodu
        başvurana e-posta ile iletmen gerekiyor.
      </p>

      {Object.keys(uretilenKodlar).length > 0 && (
        <div className="mb-6 space-y-2 rounded-sm bg-gise/15 p-3 ring-1 ring-gise">
          {Object.entries(uretilenKodlar).map(([id, kod]) => (
            <p key={id} className="text-sm text-murekkep">
              Üretilen kod: <span className="font-mono font-bold tracking-widest">{kod}</span> — bunu başvurana iletmeyi unutma.
            </p>
          ))}
        </div>
      )}

      {basvurular === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {basvurular?.length === 0 && <p className="text-sm text-kraft">Bekleyen başvuru yok.</p>}

      <ul className="space-y-3">
        {basvurular?.map((b) => (
          <li key={b.id} className="rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
            <p className="font-medium text-murekkep">{b.ad}</p>
            <p className="text-xs text-kraft">{b.eposta}</p>
            {b.mesaj && <p className="mt-2 text-sm text-murekkep leading-relaxed">{b.mesaj}</p>}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => onaylaTiklandi(b)}
                disabled={islenenId === b.id}
                className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
              >
                {islenenId === b.id ? 'İşleniyor...' : 'Onayla'}
              </button>
              <button
                onClick={() => reddetTiklandi(b)}
                disabled={islenenId === b.id}
                className="rounded-sm bg-kagit px-3 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi disabled:opacity-40"
              >
                Reddet
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

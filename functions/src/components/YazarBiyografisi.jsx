import { useEffect, useState } from 'react'
import { yazarBiyografisiGetir } from '../utils/wikipedia.js'

const KISALTMA_UZUNLUGU = 500

export default function YazarBiyografisi({ yazarAdi }) {
  const [bilgi, setBilgi] = useState(null)
  const [acik, setAcik] = useState(false)

  useEffect(() => {
    let iptal = false
    setBilgi(null)
    setAcik(false)
    yazarBiyografisiGetir(yazarAdi).then((sonuc) => {
      if (!iptal) setBilgi(sonuc)
    })
    return () => {
      iptal = true
    }
  }, [yazarAdi])

  if (!bilgi) return null

  const uzunMu = bilgi.tamMetin.length > KISALTMA_UZUNLUGU
  const gosterilenMetin = acik || !uzunMu ? bilgi.tamMetin : bilgi.tamMetin.slice(0, KISALTMA_UZUNLUGU).trim() + '...'

  return (
    <div className="flex gap-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      {bilgi.gorselUrl && (
        <img src={bilgi.gorselUrl} alt={bilgi.baslik} className="h-24 w-24 shrink-0 rounded-sm object-cover ring-1 ring-cizgi" />
      )}
      <div className="min-w-0">
        <p className="font-baslik text-base text-murekkep">{bilgi.baslik}</p>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-kraft">{gosterilenMetin}</p>
        <div className="mt-2 flex items-center gap-3">
          {uzunMu && (
            <button onClick={() => setAcik((a) => !a)} className="text-xs text-kraft hover:text-deniz hover:underline">
              {acik ? '↑ Daha Az Göster' : 'Devamını Oku →'}
            </button>
          )}
          <a href={bilgi.link} target="_blank" rel="noreferrer" className="text-[11px] text-deniz hover:underline">
            Wikipedia'da oku →
          </a>
        </div>
      </div>
    </div>
  )
}

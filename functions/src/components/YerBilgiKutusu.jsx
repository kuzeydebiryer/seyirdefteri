import { useEffect, useState } from 'react'
import { yerOzetiGetir } from '../utils/wikipedia.js'

export default function YerBilgiKutusu({ yer }) {
  const [bilgi, setBilgi] = useState(null)

  useEffect(() => {
    let iptal = false
    setBilgi(null)
    yerOzetiGetir(yer).then((sonuc) => {
      if (!iptal) setBilgi(sonuc)
    })
    return () => {
      iptal = true
    }
  }, [yer])

  if (!bilgi) return null

  return (
    <div className="mt-3 flex gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
      {bilgi.gorselUrl && (
        <img src={bilgi.gorselUrl} alt={bilgi.baslik} className="h-20 w-20 shrink-0 rounded-sm object-cover ring-1 ring-cizgi" />
      )}
      <div className="min-w-0">
        <a href={bilgi.link} target="_blank" rel="noreferrer" className="font-baslik text-sm text-murekkep hover:underline">
          {bilgi.baslik}
        </a>
        {bilgi.ozet && <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-kraft">{bilgi.ozet}</p>}
        <a href={bilgi.link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] text-deniz hover:underline">
          Wikipedia'da oku →
        </a>
      </div>
    </div>
  )
}

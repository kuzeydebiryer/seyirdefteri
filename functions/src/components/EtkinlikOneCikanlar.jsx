import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { oneCikanlariGetir, etkinligiKaldir } from '../utils/etkinlikOneCikan.js'

function tarihFormatla(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) + ' — ' +
      new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function EtkinlikOneCikanlar({ yenidenYukle, onSayiDegisti }) {
  const { kullanici } = useAuth()
  const [liste, setListe] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  async function yukle() {
    setYukleniyor(true)
    const l = await oneCikanlariGetir()
    setListe(l)
    onSayiDegisti?.(l.length)
    setYukleniyor(false)
  }

  useEffect(() => {
    yukle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yenidenYukle])

  async function kaldir(docId) {
    await etkinligiKaldir(docId)
    setListe((l) => {
      const yeni = l.filter((e) => e.id !== docId)
      onSayiDegisti?.(yeni.length)
      return yeni
    })
  }

  if (yukleniyor) return null
  if (liste.length === 0) return null

  return (
    <div className="mb-10 grid gap-4 sm:grid-cols-3">
      {liste.map((e) => (
        <div key={e.id} className="overflow-hidden rounded-sm ring-1 ring-cizgi">
          <div className="relative">
            {e.gorselUrl ? (
              <img src={e.gorselUrl} alt={e.baslik} className="h-36 w-full object-cover" />
            ) : (
              <div className="flex h-36 w-full items-center justify-center bg-kagitKoyu text-3xl">🎟️</div>
            )}
            {e.kategori && (
              <span className="absolute left-2 top-2 rounded-sm bg-murekkep/90 px-2 py-1 text-[10px] font-medium text-kagit">
                {e.kategori}
              </span>
            )}
            {kullanici && (
              <button
                onClick={() => kaldir(e.id)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-kagit/90 text-xs text-kraft hover:text-muhur"
                title="Öne çıkanlardan kaldır"
              >
                ✕
              </button>
            )}
          </div>
          <div className="bg-kagitKoyu p-3">
            <p className="font-baslik text-base text-murekkep">{e.baslik}</p>
            <p className="mt-1 text-xs text-kraft">{tarihFormatla(e.baslangic)}</p>
            {(e.mekan || e.sehir) && <p className="text-xs text-kraft">{[e.mekan, e.sehir].filter(Boolean).join(', ')}</p>}
            <a
              href={e.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit hover:opacity-90"
            >
              Bilet Al / Detaylar →
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

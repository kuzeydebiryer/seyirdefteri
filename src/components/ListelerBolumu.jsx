import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { turdekiListeleriGetir } from '../utils/kisiselListe.js'

export default function ListelerBolumu({ tur }) {
  const [listeler, setListeler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    let iptal = false
    async function getir() {
      const l = await turdekiListeleriGetir(tur, 6)
      if (!iptal) {
        setListeler(l)
        setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [tur])

  if (yukleniyor || listeler.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="font-baslik text-lg text-murekkep mb-3">Listeler</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {listeler.map((l) => (
          <Link key={l.id} to={`/liste/${l.id}`} className="block">
            <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
              {l.kapakUrl && <img src={l.kapakUrl} alt={l.baslik} className="h-full w-full object-cover" />}
            </div>
            <p className="mt-1 truncate text-xs font-medium text-murekkep">{l.baslik}</p>
            <p className="text-[11px] text-kraft">{l.ogeSayisi || 0} eser</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

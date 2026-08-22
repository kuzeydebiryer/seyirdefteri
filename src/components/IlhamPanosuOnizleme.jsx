import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ilhamlariGetir } from '../utils/ilhamPanosu.js'
import InstagramGomulusu from './InstagramGomulusu.jsx'
import IliskiliEserRozeti from './IliskiliEserRozeti.jsx'

// Film/Dizi/Kitap/Gezi sayfalarında — o kategoriye özel en son 2 İlham
// Panosu paylaşımının önizlemesi. Hiç paylaşım yoksa hiçbir şey göstermez
// (boş bir bölüm başlığı sarkıp durmasın diye).
export default function IlhamPanosuOnizleme({ kategori }) {
  const [ilhamlar, setIlhamlar] = useState(null)

  useEffect(() => {
    let iptal = false
    setIlhamlar(null)
    ilhamlariGetir(kategori, 2).then((liste) => {
      if (!iptal) setIlhamlar(liste)
    })
    return () => {
      iptal = true
    }
  }, [kategori])

  if (ilhamlar === null || ilhamlar.length === 0) return null

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">📌 İlham Panosu</h2>
        <Link to={`/ilham-panosu?kategori=${kategori}`} className="shrink-0 whitespace-nowrap text-sm text-kraft hover:text-deniz">
          Tümünü Gör ›
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {ilhamlar.map((i) => (
          <div key={i.id} className="rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
            <IliskiliEserRozeti ilham={i} />
            <InstagramGomulusu url={i.url} paylasanAdi={i.paylasanAdi} />
            {i.not && <p className="mt-2 text-sm text-murekkep">{i.not}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

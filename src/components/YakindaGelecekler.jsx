import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { yakindaGelecekleriGetir, yakindaGelenSil } from '../utils/yakindaGelecek.js'
import { useAuth } from '../context/AuthContext.jsx'

function gunSayisi(cikisTarihi) {
  const fark = new Date(cikisTarihi) - new Date(new Date().toISOString().slice(0, 10))
  return Math.round(fark / (1000 * 60 * 60 * 24))
}

// Platformlar sayfasının en üstünde — geleceğe dönük duyurular, en yakın
// tarihten en uzağa sıralı. Çıkış tarihi geldiğinde bir Cloud Function
// (yakindaGelenleriGecisYap) bunu otomatik olarak ilgili listeye
// (platformYeniEklenenler ya da dijitalYeniCikanlar) taşıyıp buradan
// kaldırıyor — elle silmeye gerek kalmıyor.
export default function YakindaGelecekler({ yenilemeTetik }) {
  const { kullanici } = useAuth()
  const [liste, setListe] = useState(null)

  useEffect(() => {
    yakindaGelecekleriGetir().then(setListe)
  }, [yenilemeTetik])

  async function silTiklandi(id) {
    if (!window.confirm('Bu duyuruyu silmek istediğine emin misin?')) return
    await yakindaGelenSil(id)
    setListe((l) => l.filter((k) => k.id !== id))
  }

  if (liste !== null && liste.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="mb-3 font-baslik text-lg text-murekkep">📅 Yakında Geliyor</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {liste?.map((k) => {
          const gun = gunSayisi(k.cikisTarihi)
          return (
            <div key={k.id} className="shrink-0" style={{ width: 110 }}>
              <Link to={`/${k.tur === 'sinema' ? 'film' : 'dizi'}/${k.disId}`}>
                <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                  {k.posterUrl ? (
                    <img src={k.posterUrl} alt={k.baslik} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">🎬</div>
                  )}
                  <span className="absolute bottom-1 left-1 rounded-full bg-murekkep/85 px-1.5 py-0.5 text-[9px] text-kagit">
                    {k.hedefTuru === 'platform' ? k.platformAdi : '💻 Dijital'}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-murekkep">{k.baslik}</p>
              </Link>
              <p className="text-[10px] text-gise">{gun === 0 ? 'Bugün! 🎉' : gun === 1 ? 'Yarın' : `${gun} gün sonra`}</p>
              {kullanici?.uid === k.ekleyenId && (
                <button onClick={() => silTiklandi(k.id)} className="text-[10px] text-kraft hover:text-muhur">
                  Sil
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

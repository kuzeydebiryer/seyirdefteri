import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { oneCikanlariGetir } from '../utils/etkinlikOneCikan.js'
import { aktifSezonuGetir } from '../utils/oscar.js'
import OscarHeykelIkon from './ikonlar/OscarHeykelIkon.jsx'

// Anasayfanın en üstünde, tüm siteye yayılmış "önemli şeyler"i (öne çıkan
// etkinlikler + açık Oscar sezonu) tek satırlık kompakt bir şeritte özetler.
// Kullanıcı bu sayfaları ziyaret etmeden haberi olmasın diye var — hiçbir
// yeni veri kaynağı gerekmiyor, zaten kurulu altyapıyı yeniden kullanıyor.
export default function OneCikanlarSeridi() {
  const [etkinlikler, setEtkinlikler] = useState([])
  const [oscarSezonu, setOscarSezonu] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    let iptal = false
    Promise.all([oneCikanlariGetir().catch(() => []), aktifSezonuGetir().catch(() => null)]).then(
      ([etkinlikListesi, sezon]) => {
        if (iptal) return
        setEtkinlikler(etkinlikListesi.slice(0, 3))
        setOscarSezonu(sezon && !sezon.bittiMi ? sezon : null)
        setYukleniyor(false)
      }
    )
    return () => {
      iptal = true
    }
  }, [])

  if (yukleniyor) return null
  if (etkinlikler.length === 0 && !oscarSezonu) return null

  return (
    <div className="mb-6 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {oscarSezonu && (
        <Link
          to="/oscar"
          title={`${oscarSezonu.ad} açık — tahminini ver`}
          className="flex shrink-0 items-center justify-center rounded-full bg-murekkep p-2 text-kagit hover:opacity-90"
        >
          <OscarHeykelIkon boyut={18} />
        </Link>
      )}
      {etkinlikler.map((e) => (
        <a
          key={e.id}
          href={e.url}
          target="_blank"
          rel="noreferrer"
          className="flex shrink-0 items-center gap-2 rounded-sm bg-kagitKoyu px-3 py-2 font-govde text-xs text-murekkep ring-1 ring-cizgi hover:text-muhur"
        >
          <span>🎟️</span>
          <span className="whitespace-nowrap">{e.baslik}</span>
        </a>
      ))}
    </div>
  )
}

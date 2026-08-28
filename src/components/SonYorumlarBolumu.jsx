import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sonYorumlariGetir } from '../utils/yorum.js'
import YatayKaydirma from './YatayKaydirma.jsx'

const esereLink = (tur, disId) => (tur === 'dizi' ? `/dizi/${disId}` : tur === 'kitap' ? `/kitap/${disId}` : `/film/${disId}`)

// Film/dizi/kitap sayfalarındaki yorumları anasayfada da görünür kılıyor —
// önceden bu yorumlar sadece o eserin kendi sayfasında görülebiliyordu,
// yeni yazılan bir yorumun keşfedilme şansı yoktu. Kompakt tutmak için sadece
// poster + yazar + yorumun ilk birkaç kelimesi (line-clamp) gösteriliyor,
// tam yorum metni için esere (ya da /son-yorumlar sayfasına) gitmek gerekiyor.
export default function SonYorumlarBolumu() {
  const [yorumlar, setYorumlar] = useState(null)

  useEffect(() => {
    sonYorumlariGetir(['sinema', 'dizi', 'kitap'], 12).then(setYorumlar)
  }, [])

  if (yorumlar !== null && yorumlar.length === 0) return null

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">💬 Son Yorumlar</h2>
        <Link to="/son-yorumlar" className="shrink-0 whitespace-nowrap text-sm text-kraft hover:text-deniz">
          Tümünü Gör ›
        </Link>
      </div>
      {yorumlar === null ? (
        <p className="text-sm text-kraft">Yükleniyor...</p>
      ) : (
        <YatayKaydirma>
          {yorumlar.map((y) => (
            <Link key={y.id} to={esereLink(y.eserTur, y.eserDisId)} className="shrink-0" style={{ width: 130 }}>
              <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                {y.eserPosterUrl ? (
                  <img src={y.eserPosterUrl} alt={y.eserBaslik} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">💬</div>
                )}
              </div>
              <p className="mt-1 truncate text-[11px] font-medium text-murekkep">{y.yazarAdi}</p>
              <p className="line-clamp-2 text-[11px] text-kraft">{y.metin}</p>
            </Link>
          ))}
        </YatayKaydirma>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import YatayKaydirma from './YatayKaydirma.jsx'

// platformYeniEklenenleriTespitEt Cloud Function'ının (functions/index.js)
// günlük doldurduğu koleksiyondan besleniyor. Film ve dizi ayrı sorgularla
// çekiliyor (film önce, dizi sonra) — tek bir tespitTarihi'ne göre sıralı
// sorgu, günün akışına göre ikisini rastgele karıştırıyordu, film önce
// gelsin isteniyor. Her ikisinin İÇİNDE de elle eklenenler (elleEklendiMi)
// otomatik tespit edilenlerin önüne alınıyor — birileri özellikle vakit
// ayırıp eklediyse, bunun öne çıkması daha değerli.
export default function PlatformYeniGelenlerBolumu() {
  const [gelenler, setGelenler] = useState(null)

  useEffect(() => {
    const filmSorgu = query(collection(db, 'platformYeniEklenenler'), where('tur', '==', 'sinema'), orderBy('tespitTarihi', 'desc'), limit(15))
    const diziSorgu = query(collection(db, 'platformYeniEklenenler'), where('tur', '==', 'dizi'), orderBy('tespitTarihi', 'desc'), limit(15))
    Promise.all([getDocs(filmSorgu), getDocs(diziSorgu)]).then(([filmSnap, diziSnap]) => {
      const oncelikSirala = (liste) => [...liste].sort((a, b) => (b.elleEklendiMi ? 1 : 0) - (a.elleEklendiMi ? 1 : 0))
      const filmler = oncelikSirala(filmSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
      const diziler = oncelikSirala(diziSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setGelenler([...filmler, ...diziler].slice(0, 15))
    })
  }, [])

  if (gelenler !== null && gelenler.length === 0) return null

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">🆕 Platformlarda Yeni</h2>
        <Link to="/platformlar" className="shrink-0 whitespace-nowrap text-sm text-kraft hover:text-deniz">
          Tümünü Gör ›
        </Link>
      </div>
      <YatayKaydirma>
        {gelenler?.map((g) => (
          <Link key={g.id} to={`/${g.tur === 'sinema' ? 'film' : 'dizi'}/${g.disId}`} className="shrink-0" style={{ width: 104 }}>
            <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
              {g.posterUrl ? (
                <img src={g.posterUrl} alt={g.baslik} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">🎬</div>
              )}
              <span className="absolute bottom-1 left-1 rounded-full bg-murekkep/85 px-1.5 py-0.5 text-[9px] text-kagit">
                {g.platformAdi}
              </span>
            </div>
            <p className="mt-1 truncate text-[11px] text-murekkep">{g.baslik}</p>
          </Link>
        ))}
      </YatayKaydirma>
    </div>
  )
}

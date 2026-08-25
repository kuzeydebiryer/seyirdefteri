import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase.js'

// platformYeniEklenenleriTespitEt Cloud Function'ının (functions/index.js)
// günlük doldurduğu koleksiyondan besleniyor — kullanıcı girdisi yok, sadece
// otomatik gösterim. Tüm takip edilen platformlar karışık, en yeni tespit
// edilenden başlayarak. Veri henüz yeterince birikmemişse (koleksiyon yeni)
// hiçbir şey göstermiyor, boş bir kutu olarak sayfada yer kaplamasın.
export default function PlatformYeniGelenlerBolumu() {
  const [gelenler, setGelenler] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'platformYeniEklenenler'), orderBy('tespitTarihi', 'desc'), limit(15))
    getDocs(q).then((snap) => setGelenler(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  if (gelenler !== null && gelenler.length === 0) return null

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">🆕 Platformlara Yeni Gelenler</h2>
        <Link to="/platformlar" className="shrink-0 whitespace-nowrap text-sm text-kraft hover:text-deniz">
          Tümünü Gör ›
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
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
      </div>
    </div>
  )
}

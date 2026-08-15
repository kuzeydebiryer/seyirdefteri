import { useEffect, useState } from 'react'
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// Bir listenin en son (etkinlik tarihine göre) N öğesini poster şeridi olarak gösterir —
// topluluk sayfasındaki "Geçmiş Etkinlikler" kartlarında hızlı bir önizleme sağlamak için.
export default function ListeOnizleme({ topluluklId, listeId, adet = 10 }) {
  const [ogeler, setOgeler] = useState([])

  useEffect(() => {
    let iptal = false
    async function getir() {
      try {
        const q = query(
          collection(db, 'listeOgeleri'),
          where('topluluklId', '==', topluluklId),
          where('listeId', '==', listeId),
          orderBy('sira', 'asc'),
          limit(adet)
        )
        const snap = await getDocs(q)
        if (!iptal) setOgeler(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } catch (e) {
        console.error('ListeOnizleme hata:', e.code, e.message, e)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [topluluklId, listeId, adet])

  if (ogeler.length === 0) return null

  return (
    <div className="mt-2 flex gap-1.5 overflow-x-auto">
      {ogeler.map((oge) => (
        <div key={oge.id} className="h-16 w-11 shrink-0 overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
          {oge.posterUrl && <img src={oge.posterUrl} alt={oge.baslik} className="h-full w-full object-cover" />}
        </div>
      ))}
    </div>
  )
}

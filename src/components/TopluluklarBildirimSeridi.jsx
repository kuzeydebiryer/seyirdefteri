import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'

const ON_DORT_GUN_MS = 14 * 24 * 60 * 60 * 1000

function parcala(dizi, boyut) {
  const parcalar = []
  for (let i = 0; i < dizi.length; i += boyut) parcalar.push(dizi.slice(i, i + boyut))
  return parcalar
}

// TavsiyeBildirimSeridi ile aynı fikir: tam liste değil, "gitmeye değer" sinyali.
// Üyesi olunan topluluklarda önümüzdeki 14 gün içinde etkinlik varsa haber
// verir — üye olmayan topluluklardaki etkinlikler burada görünmez (o zaten
// ilgisiz gürültü olurdu).
export default function TopluluklarBildirimSeridi() {
  const { kullanici } = useAuth()
  const [yaklasanlar, setYaklasanlar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    if (!kullanici) {
      setYukleniyor(false)
      return
    }
    let iptal = false
    async function getir() {
      // Üyesi olduğu topluluk id'leri artık kendi profilinde (tek okuma) —
      // eskiden sitedeki HER topluluğu tek tek kontrol ediyorduk (N okuma,
      // her anasayfa ziyaretinde). Bkz. utils/topluluk.js.
      const profilSnap = await getDoc(doc(db, 'kullanicilar', kullanici.uid))
      const uyeIdler = profilSnap.exists() ? profilSnap.data().uyeOlduklarim || [] : []
      if (uyeIdler.length === 0) {
        if (!iptal) setYukleniyor(false)
        return
      }

      const simdi = new Date().toISOString()
      const ondortGunSonra = new Date(Date.now() + ON_DORT_GUN_MS).toISOString()
      const parcalar = parcala(uyeIdler, 10) // Firestore 'in' limiti 10
      const sonuclar = await Promise.all(
        parcalar.map((parca) =>
          getDocs(
            query(
              collection(db, 'gelecekEtkinlikler'),
              where('topluluklId', 'in', parca),
              where('tarih', '>=', simdi),
              where('tarih', '<=', ondortGunSonra)
            )
          ).catch(() => ({ docs: [] }))
        )
      )
      if (iptal) return
      const hepsi = sonuclar.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })))
      hepsi.sort((a, b) => new Date(a.tarih) - new Date(b.tarih))
      setYaklasanlar(hepsi)
      setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [kullanici])

  if (yukleniyor || yaklasanlar.length === 0) return null

  return (
    <div className="mb-10 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-sm bg-kagitKoyu px-3 py-2 text-xs ring-1 ring-cizgi">
      <span className="text-kraft">Topluluklarında yaklaşan:</span>
      {yaklasanlar.slice(0, 3).map((e) => (
        <Link key={e.id} to={`/topluluk/${e.topluluklId}`} className="text-murekkep hover:text-deniz hover:underline">
          🏛 {e.topluluklAd} — {e.baslik} →
        </Link>
      ))}
    </div>
  )
}

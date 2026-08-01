import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

const KATEGORILER = [
  { tur: 'sinema', ikon: '🎬', etiket: 'Film', link: '/filmler' },
  { tur: 'dizi', ikon: '📺', etiket: 'Dizi', link: '/diziler' },
  { tur: 'kitap', ikon: '📚', etiket: 'Kitap', link: '/kitaplar' },
]

const YEDI_GUN_MS = 7 * 24 * 60 * 60 * 1000

// Tam liste yerine sadece "bu hafta eklenen tavsiye var mı" sayısını gösteren
// tek satırlık şerit. Tavsiyelerin kendisi hâlâ kendi sayfalarında (Film/Dizi/
// Kitap) yaşıyor — burası sadece "gitmeye değer" sinyali veriyor.
export default function TavsiyeBildirimSeridi() {
  const [sayilar, setSayilar] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    let iptal = false
    async function getir() {
      const cutoff = Date.now() - YEDI_GUN_MS
      const sonuc = await Promise.all(
        KATEGORILER.map(async (k) => {
          const snap = await getDocs(query(collection(db, 'tavsiyeler'), where('tur', '==', k.tur)))
          const sayi = snap.docs.filter((d) => (d.data().tarih?.toMillis?.() || 0) >= cutoff).length
          return { ...k, sayi }
        })
      )
      if (!iptal) {
        setSayilar(sonuc.filter((s) => s.sayi > 0))
        setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [])

  if (yukleniyor || !sayilar || sayilar.length === 0) return null

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-sm bg-kagitKoyu px-3 py-2 text-xs ring-1 ring-cizgi">
      <span className="text-kraft">Bu hafta:</span>
      {sayilar.map((s) => (
        <Link key={s.tur} to={s.link} className="text-murekkep hover:text-deniz hover:underline">
          {s.ikon} {s.sayi} yeni {s.etiket.toLowerCase()} tavsiyesi →
        </Link>
      ))}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { topluluktaSuankiOkunanlariGetir } from '../utils/izlenecek.js'
import Avatar from './Avatar.jsx'

// Kitap Dünyası widget'ının dizi karşılığı — topluluğun o an "izliyorum"
// (durum: 'okunuyor') olarak işaretlediği dizileri, kim izlediği ve hangi
// sezon/bölümde olduğu bilgisiyle gösterir. Toplam bölüm sayısı izlenecek
// kaydında tutulmadığı için (sadece mevcutSezon/mevcutBolum) yüzdelik bir
// ilerleme çubuğu yerine sade "Sezon X · Bölüm Y" metni kullanılıyor — bu,
// her kart için ayrı bir TMDB isteği atmaktan kaçınıyor.
const VURGU_RENKLERI = [
  { arka: 'bg-muhur/10', dolu: 'bg-muhur' },
  { arka: 'bg-deniz/10', dolu: 'bg-deniz' },
  { arka: 'bg-gise/10', dolu: 'bg-gise' },
]

export default function DiziDunyasiWidget() {
  const [diziler, setDiziler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    let iptal = false
    async function getir() {
      const liste = await topluluktaSuankiOkunanlariGetir('dizi', 6)

      const profilOnbellek = {}
      const zenginlestirilmis = await Promise.all(
        liste.map(async (k) => {
          if (!profilOnbellek[k.kullaniciId]) {
            const snap = await getDoc(doc(db, 'kullanicilar', k.kullaniciId))
            profilOnbellek[k.kullaniciId] = snap.exists() ? snap.data() : {}
          }
          const profil = profilOnbellek[k.kullaniciId]
          return { ...k, kullaniciAdi: profil.adSoyad || 'Biri', kullaniciAvatarUrl: profil.avatarUrl || '' }
        })
      )

      if (!iptal) {
        setDiziler(zenginlestirilmis)
        setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [])

  if (yukleniyor || diziler.length === 0) return null

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">📺 Dizi Dünyası</h2>
      </div>

      <div className="space-y-3">
        {diziler.map((d, i) => {
          const renk = VURGU_RENKLERI[i % VURGU_RENKLERI.length]
          return (
            <Link
              key={d.id}
              to={`/dizi/${d.disId}`}
              className={`flex items-center gap-3 rounded-sm ${renk.arka} p-3 ring-1 ring-cizgi transition hover:ring-murekkep/30`}
            >
              {d.posterUrl && <img src={d.posterUrl} alt={d.baslik} className="h-14 w-10 shrink-0 rounded-sm object-cover ring-1 ring-cizgi" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Avatar adSoyad={d.kullaniciAdi} avatarUrl={d.kullaniciAvatarUrl} boyut="h-4 w-4" />
                  <span className="truncate text-[11px] text-kraft">{d.kullaniciAdi} izliyor</span>
                </div>
                <p className="truncate text-sm font-medium text-murekkep">{d.baslik}</p>
                {d.mevcutSezon != null && (
                  <p className="text-xs text-kraft">
                    Sezon {d.mevcutSezon} · Bölüm {d.mevcutBolum || 0}
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

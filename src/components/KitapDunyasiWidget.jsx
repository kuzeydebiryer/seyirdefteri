import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { gorunenAdGetir } from '../utils/gorunenAd.js'
import { topluluktaSuankiOkunanlariGetir } from '../utils/izlenecek.js'
import Avatar from './Avatar.jsx'

// Sırayla dönen kart renkleri — referans görseldeki gibi her karta farklı bir
// vurgu rengi verir ama site paletinden (muhur/deniz/gise) taşmaz.
const VURGU_RENKLERI = [
  { arka: 'bg-muhur/10', dolu: 'bg-muhur', yuzde: 'text-muhur' },
  { arka: 'bg-deniz/10', dolu: 'bg-deniz', yuzde: 'text-deniz' },
  { arka: 'bg-gise/10', dolu: 'bg-gise', yuzde: 'text-gise' },
]

export default function KitapDunyasiWidget() {
  const [kitaplar, setKitaplar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    let iptal = false
    async function getir() {
      const liste = await topluluktaSuankiOkunanlariGetir('kitap', 6)

      // Her kayıt sadece kullaniciId taşıyor; isim/avatar için kullanıcı
      // profillerini tek tek (tekrar edenler hariç) çekip eşliyoruz.
      const profilOnbellek = {}
      const zenginlestirilmis = await Promise.all(
        liste.map(async (k) => {
          if (!profilOnbellek[k.kullaniciId]) {
            const snap = await getDoc(doc(db, 'kullanicilar', k.kullaniciId))
            profilOnbellek[k.kullaniciId] = snap.exists() ? snap.data() : {}
          }
          const profil = profilOnbellek[k.kullaniciId]
          return { ...k, kullaniciAdi: gorunenAdGetir(profil, 'Bir okur'), kullaniciAvatarUrl: profil.avatarUrl || '' }
        })
      )

      if (!iptal) {
        setKitaplar(zenginlestirilmis)
        setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [])

  if (yukleniyor || kitaplar.length === 0) return null

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">📖 Kitap Dünyası</h2>
        <Link to="/kitaplar" className="shrink-0 whitespace-nowrap rounded-full bg-kagitKoyu px-3 py-1 font-govde text-xs text-kraft ring-1 ring-cizgi">
          Tümünü Gör →
        </Link>
      </div>

      <div className="space-y-3">
        {kitaplar.map((k, i) => {
          const renk = VURGU_RENKLERI[i % VURGU_RENKLERI.length]
          const yuzde = k.toplamSayfa ? Math.min(100, Math.round(((k.suankiSayfa || 0) / k.toplamSayfa) * 100)) : null

          return (
            <Link
              key={k.id}
              to={`/kitap/${k.disId}`}
              className={`flex items-center gap-3 rounded-sm ${renk.arka} p-3 ring-1 ring-cizgi transition hover:ring-murekkep/30`}
            >
              {k.posterUrl && <img src={k.posterUrl} alt={k.baslik} className="h-14 w-10 shrink-0 rounded-sm object-cover ring-1 ring-cizgi" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Avatar adSoyad={k.kullaniciAdi} avatarUrl={k.kullaniciAvatarUrl} boyut="h-4 w-4" />
                  <span className="truncate text-[11px] text-kraft">{k.kullaniciAdi} okuyor</span>
                </div>
                <p className="truncate text-sm font-medium text-murekkep">{k.baslik}</p>
                {k.alt && <p className="truncate text-xs text-kraft">{k.alt}</p>}
                {k.toplamSayfa && (
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-kagit">
                    <div className={`h-full ${renk.dolu}`} style={{ width: `${yuzde}%` }} />
                  </div>
                )}
              </div>
              {yuzde != null && <span className={`shrink-0 font-baslik text-xl ${renk.yuzde}`}>%{yuzde}</span>}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

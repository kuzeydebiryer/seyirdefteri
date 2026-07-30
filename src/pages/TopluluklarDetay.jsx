import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { topluluğaKatil, topluluktanAyril } from '../utils/topluluk.js'
import Avatar from '../components/Avatar.jsx'

export default function TopluluklarDetay() {
  const { id } = useParams()
  const { kullanici } = useAuth()

  const [topluluk, setTopluluk] = useState(null)
  const [uyeler, setUyeler] = useState([])
  const [uyeMi, setUyeMi] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [isleniyor, setIsleniyor] = useState(false)

  useEffect(() => {
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const snap = await getDoc(doc(db, 'topluluklar', id))
      if (!iptal && snap.exists()) setTopluluk({ id: snap.id, ...snap.data() })

      const uyelerSnap = await getDocs(collection(db, 'topluluklar', id, 'uyeler'))
      if (iptal) return
      const uyeIdler = uyelerSnap.docs.map((d) => d.id)
      setUyeMi(kullanici ? uyeIdler.includes(kullanici.uid) : false)

      // Üye profillerini getir (isim/avatar göstermek için)
      const profiller = await Promise.all(
        uyeIdler.map(async (uyeId) => {
          const pSnap = await getDoc(doc(db, 'kullanicilar', uyeId))
          return pSnap.exists() ? { id: uyeId, ...pSnap.data() } : { id: uyeId, adSoyad: 'Bilinmeyen' }
        })
      )
      if (!iptal) {
        setUyeler(profiller)
        setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [id, kullanici])

  async function degistir() {
    if (!kullanici) return
    setIsleniyor(true)
    try {
      if (uyeMi) {
        await topluluktanAyril(id, kullanici.uid)
        setUyeler((onceki) => onceki.filter((u) => u.id !== kullanici.uid))
      } else {
        await topluluğaKatil(id, kullanici.uid)
        setUyeler((onceki) => [...onceki, { id: kullanici.uid, adSoyad: 'Sen' }])
      }
      setUyeMi(!uyeMi)
      setTopluluk((onceki) => ({ ...onceki, uyeSayisi: (onceki.uyeSayisi || 0) + (uyeMi ? -1 : 1) }))
    } finally {
      setIsleniyor(false)
    }
  }

  if (yukleniyor) return <p className="text-kraft text-sm">Yükleniyor...</p>
  if (!topluluk) return <p className="text-kraft text-sm">Topluluk bulunamadı.</p>

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <span className="rounded-full bg-kagitKoyu px-2 py-0.5 text-[10px] uppercase tracking-wide text-kraft ring-1 ring-cizgi">
            {topluluk.tur}
          </span>
          <h1 className="font-baslik text-2xl text-murekkep mt-2">{topluluk.ad}</h1>
          <p className="text-xs text-kraft mt-1">
            {topluluk.kurucuAdi} tarafından kuruldu · {topluluk.uyeSayisi || 0} üye
          </p>
          {topluluk.aciklama && <p className="mt-2 text-sm text-murekkep">{topluluk.aciklama}</p>}
        </div>
        <button
          onClick={degistir}
          disabled={isleniyor}
          className={`shrink-0 rounded-sm px-3 py-1.5 font-govde text-xs ${
            uyeMi ? 'bg-kagitKoyu text-kraft ring-1 ring-cizgi' : 'bg-muhur text-kagit'
          } disabled:opacity-40`}
        >
          {uyeMi ? 'Üyesin' : 'Katıl'}
        </button>
      </div>

      <div className="defter-cizgi my-6" />

      <h2 className="font-baslik text-lg text-murekkep mb-3">Üyeler</h2>
      <ul className="space-y-2">
        {uyeler.map((u) => (
          <li key={u.id}>
            <Link to={`/profil/${u.id}`} className="flex items-center gap-3 rounded-sm bg-kagitKoyu p-2 ring-1 ring-cizgi">
              <Avatar adSoyad={u.adSoyad} avatarUrl={u.avatarUrl} boyut="h-8 w-8" />
              <div>
                <p className="text-sm text-murekkep">{u.adSoyad}</p>
                {u.kullaniciAdi && <p className="text-xs text-kraft">@{u.kullaniciAdi}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

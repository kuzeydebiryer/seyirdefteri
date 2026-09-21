import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, limit, orderBy, query, startAt, endAt } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useTakip } from '../hooks/useTakip.js'
import { takipEt, takipBirak } from '../utils/takip.js'
import Avatar from '../components/Avatar.jsx'
import { gorunenAdGetir } from '../utils/gorunenAd.js'

function KullaniciSatiri({ kullaniciData, benUid }) {
  const { takipEdiyorMu, setTakipEdiyorMu } = useTakip(kullaniciData.id, benUid)
  const [isleniyor, setIsleniyor] = useState(false)

  async function degistir() {
    setIsleniyor(true)
    try {
      if (takipEdiyorMu) await takipBirak(benUid, kullaniciData.id)
      else await takipEt(benUid, kullaniciData.id)
      setTakipEdiyorMu(!takipEdiyorMu)
    } finally {
      setIsleniyor(false)
    }
  }

  return (
    <li className="flex items-center justify-between rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
      <Link to={`/profil/${kullaniciData.id}`} className="flex items-center gap-3">
        <Avatar adSoyad={gorunenAdGetir(kullaniciData)} avatarUrl={kullaniciData.avatarUrl} boyut="h-9 w-9" />
        <div>
          <p className="text-sm font-medium text-murekkep">{gorunenAdGetir(kullaniciData)}</p>
          {/* Kullanıcı adıyla görünmeyi seçtiyse gerçek adı ikinci satırda da
              sızdırılmasın diye burada tekrar gösterilmiyor (bkz. Profil.jsx'teki
              aynı mantık). */}
          {kullaniciData.gorunumTercihi !== 'kullaniciAdi' && <p className="text-xs text-kraft">@{kullaniciData.kullaniciAdi}</p>}
        </div>
      </Link>
      {kullaniciData.id !== benUid && (
        <button
          onClick={degistir}
          disabled={isleniyor}
          className={`rounded-sm px-3 py-1 font-govde text-xs ${
            takipEdiyorMu ? 'bg-kagit text-kraft ring-1 ring-cizgi' : 'bg-muhur text-kagit'
          } disabled:opacity-40`}
        >
          {takipEdiyorMu ? 'Takip Ediliyor' : 'Takip Et'}
        </button>
      )}
    </li>
  )
}

export default function Kullanicilar() {
  const { kullanici } = useAuth()
  const [arama, setArama] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const terim = arama.trim().toLowerCase()
      const q = terim
        ? query(collection(db, 'kullanicilar'), orderBy('kullaniciAdi'), startAt(terim), endAt(terim + '\uf8ff'), limit(20))
        : query(collection(db, 'kullanicilar'), orderBy('olusturmaTarihi', 'desc'), limit(20))
      const snap = await getDocs(q)
      if (iptal) return
      setSonuclar(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setYukleniyor(false)
    }
    const zamanlayici = setTimeout(getir, 250) // yazarken her tuşta sorgu atmamak için küçük gecikme
    return () => {
      iptal = true
      clearTimeout(zamanlayici)
    }
  }, [arama])

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep mb-4">Keşfet</h1>
      <input
        type="text"
        value={arama}
        onChange={(e) => setArama(e.target.value)}
        placeholder="Kullanıcı adına göre ara..."
        aria-label="Kullanıcı adına göre ara"
        className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi mb-6"
      />

      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {!yukleniyor && sonuclar.length === 0 && <p className="text-sm text-kraft">Kimse bulunamadı.</p>}

      <ul className="space-y-2">
        {sonuclar.map((k) => (
          <KullaniciSatiri key={k.id} kullaniciData={k} benUid={kullanici.uid} />
        ))}
      </ul>
    </div>
  )
}

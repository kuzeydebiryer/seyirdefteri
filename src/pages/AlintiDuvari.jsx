import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from '../components/Avatar.jsx'
import { alintiBegenDegistir, sonAlintilariGetir } from '../utils/alinti.js'

export default function AlintiDuvari() {
  const { kullanici } = useAuth()
  const [alintilar, setAlintilar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    let iptal = false
    async function getir() {
      const liste = await sonAlintilariGetir(40)
      if (!iptal) {
        setAlintilar(liste)
        setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [])

  async function begenTiklandi(alinti) {
    if (!kullanici) return
    const begeniyorMu = (alinti.begenenler || []).includes(kullanici.uid)
    setAlintilar((liste) =>
      liste.map((a) =>
        a.id === alinti.id
          ? { ...a, begenenler: begeniyorMu ? a.begenenler.filter((u) => u !== kullanici.uid) : [...(a.begenenler || []), kullanici.uid] }
          : a
      )
    )
    await alintiBegenDegistir(alinti.id, kullanici.uid, begeniyorMu)
  }

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep mb-1">💬 Alıntı Duvarı</h1>
      <p className="mb-6 text-sm text-kraft">Topluluğun kitaplardan paylaştığı en son alıntılar.</p>

      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {!yukleniyor && alintilar.length === 0 && <p className="text-sm text-kraft">Henüz kimse alıntı paylaşmadı.</p>}

      <ul className="space-y-3">
        {alintilar.map((a) => {
          const begeniyorMu = kullanici && (a.begenenler || []).includes(kullanici.uid)
          return (
            <li key={a.id} className="rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
              <p className="font-baslik text-sm italic text-murekkep">"{a.metin}"</p>
              <Link to={`/kitap/${a.kitapId}`} className="mt-1 block text-xs text-kraft hover:text-deniz hover:underline">
                {a.kitapBaslik}{a.kitapYazar && ` · ${a.kitapYazar}`}{a.sayfa && ` · s. ${a.sayfa}`}
              </Link>
              <div className="mt-2 flex items-center gap-2 text-xs text-kraft">
                <Link to={`/profil/${a.kullaniciId}`} className="flex items-center gap-2">
                  <Avatar adSoyad={a.kullaniciAdi} avatarUrl={a.kullaniciAvatarUrl} boyut="h-5 w-5" />
                  <span className="font-medium text-murekkep">{a.kullaniciAdi}</span>
                </Link>
                <button
                  onClick={() => begenTiklandi(a)}
                  disabled={!kullanici}
                  className={`ml-auto ${begeniyorMu ? 'text-muhur' : 'text-kraft hover:text-muhur'}`}
                >
                  {begeniyorMu ? '♥' : '♡'} {(a.begenenler || []).length || ''}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

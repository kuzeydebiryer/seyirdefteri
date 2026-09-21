import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { alintiBegenDegistir, sonAlintilariGetir } from '../utils/alinti.js'
import AlintiKarti from './AlintiKarti.jsx'

export default function SonAlintilarBolumu({ limitSayisi = 5, baslik = '💬 Son Alıntılar' }) {
  const { kullanici } = useAuth()
  const [alintilar, setAlintilar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    let iptal = false
    async function getir() {
      const liste = await sonAlintilariGetir(limitSayisi)
      if (!iptal) {
        setAlintilar(liste)
        setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [limitSayisi])

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

  if (yukleniyor || alintilar.length === 0) return null

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">{baslik}</h2>
        <Link to="/alintilar" className="shrink-0 whitespace-nowrap rounded-full bg-kagitKoyu px-3 py-1 font-govde text-xs text-kraft ring-1 ring-cizgi">
          Tümünü Gör →
        </Link>
      </div>
      <ul className="space-y-3">
        {alintilar.map((a) => (
          <AlintiKarti key={a.id} alinti={a} kullanici={kullanici} onBegenTiklandi={begenTiklandi} />
        ))}
      </ul>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { geziHavaDurumuGetir } from '../utils/openMeteo.js'

export default function HavaDurumuOzeti({ enlem, boylem, baslangicTarihi, bitisTarihi }) {
  const [hava, setHava] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    let iptal = false
    setYukleniyor(true)
    geziHavaDurumuGetir(enlem, boylem, baslangicTarihi, bitisTarihi).then((sonuc) => {
      if (!iptal) {
        setHava(sonuc)
        setYukleniyor(false)
      }
    })
    return () => {
      iptal = true
    }
  }, [enlem, boylem, baslangicTarihi, bitisTarihi])

  if (yukleniyor || !hava) return null

  return (
    <p className="mt-1 text-xs text-kraft">
      🌤️ O günlerin havası: {Math.round(hava.enDusuk)}°C – {Math.round(hava.enYuksek)}°C
      {hava.yagisliGunSayisi > 0 && ` · ${hava.toplamGun} günün ${hava.yagisliGunSayisi}'inde yağış vardı`}
    </p>
  )
}

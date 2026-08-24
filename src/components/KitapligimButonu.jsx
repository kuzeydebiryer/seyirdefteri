import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { kitaplikDurumuGetir, kitapligimdaDegistir } from '../utils/raf.js'
import { girisGerekiyorsaYonlendir } from '../utils/girisYonlendir.js'

// Favori butonuyla aynı sırada duran, "buna sahibim / elimde var" sinyali.
// Arkada var olan Raflar altyapısını kullanıyor (kitapligimdaDegistir),
// bu yüzden işaretlenen kitaplar otomatik olarak "Raflarım" sekmesindeki
// "Kitaplığım" rafında da görünüyor — ayrı bir gösterim kodu gerekmiyor.
export default function KitapligimButonu({ disId, baslik, alt, posterUrl }) {
  const { kullanici } = useAuth()
  const navigate = useNavigate()
  const [kitaplikta, setKitaplikta] = useState(false)
  const [isleniyor, setIsleniyor] = useState(false)

  useEffect(() => {
    if (!kullanici) {
      setKitaplikta(false)
      return
    }
    let iptal = false
    kitaplikDurumuGetir(kullanici.uid, disId).then((deger) => {
      if (!iptal) setKitaplikta(deger)
    })
    return () => {
      iptal = true
    }
  }, [kullanici, disId])

  async function tiklandi() {
    if (girisGerekiyorsaYonlendir(kullanici, navigate)) return
    setIsleniyor(true)
    try {
      const yeniDurum = await kitapligimdaDegistir(kullanici, { disId, baslik, alt, posterUrl })
      setKitaplikta(yeniDurum)
    } finally {
      setIsleniyor(false)
    }
  }

  return (
    <button onClick={tiklandi} disabled={isleniyor} className="flex flex-col items-center gap-1 disabled:opacity-40">
      <span className={kitaplikta ? 'text-gise' : 'text-cizgi'} style={{ fontSize: 26, lineHeight: 1 }}>
        📚
      </span>
      <span className="text-[10px] uppercase tracking-wide text-kraft">{kitaplikta ? 'Kitaplığımda' : 'Kitaplığıma Ekle'}</span>
    </button>
  )
}

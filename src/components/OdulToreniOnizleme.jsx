import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { aktifSezonuGetir } from '../utils/oscar.js'

function gunSayisi(torenTarihi) {
  if (!torenTarihi) return null
  const fark = new Date(torenTarihi) - new Date()
  return Math.ceil(fark / (1000 * 60 * 60 * 24))
}

// Anasayfada, Film & Kitap Kulübü'nün ÜSTÜNDE — yaklaşan ödül töreninin
// (şimdilik Oscar Yolculuğu'ndaki aktif sezon) geri sayımı. Tören geçmişse
// hiçbir şey göstermiyor.
export default function OdulToreniOnizleme() {
  const [sezon, setSezon] = useState(null)

  useEffect(() => {
    aktifSezonuGetir().then(setSezon)
  }, [])

  if (!sezon?.torenTarihi) return null
  const gun = gunSayisi(sezon.torenTarihi)
  if (gun == null || gun < 0) return null

  return (
    <Link
      to="/oscar"
      className="mb-10 flex items-center justify-between rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi transition hover:ring-deniz/50"
    >
      <div>
        <p className="text-xs uppercase tracking-widest text-gise">🏆 Yaklaşan Ödül Töreni</p>
        <p className="mt-1 font-baslik text-lg text-murekkep">{sezon.ad}</p>
        <p className="text-xs text-kraft">
          {new Date(sezon.torenTarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
      <div className="text-right">
        <p className="font-baslik text-3xl text-murekkep">{gun}</p>
        <p className="text-xs text-kraft">gün kaldı</p>
      </div>
    </Link>
  )
}

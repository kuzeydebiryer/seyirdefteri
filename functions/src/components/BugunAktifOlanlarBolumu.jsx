import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { bugunAktifOlanlariGetir } from '../utils/aktifKullanicilar.js'
import { gorunenAdGetir } from '../utils/gorunenAd.js'
import Avatar from './Avatar.jsx'

// Gerçek zamanlı "şu an online" değil — 15 dakikada bir güncellenen bir
// "son görülme" damgasına dayanan, çok daha hafif bir "bugün aktif olanlar"
// göstergesi. Küçük bir topluluk için yeterli ve maliyeti önemsiz.
export default function BugunAktifOlanlarBolumu() {
  const [kullanicilar, setKullanicilar] = useState(null)

  useEffect(() => {
    bugunAktifOlanlariGetir().then(setKullanicilar)
  }, [])

  if (kullanicilar === null || kullanicilar.length === 0) return null

  return (
    <div className="mb-10">
      <p className="mb-2 text-xs uppercase tracking-widest text-kraft">🟢 Bugün Aktif Olanlar</p>
      <div className="flex flex-wrap gap-3">
        {kullanicilar.map((k) => (
          <Link key={k.id} to={`/profil/${k.id}`} className="flex items-center gap-1.5 rounded-full bg-kagitKoyu py-1 pl-1 pr-3 ring-1 ring-cizgi hover:ring-deniz/50">
            <Avatar adSoyad={gorunenAdGetir(k)} avatarUrl={k.avatarUrl} boyut="h-6 w-6" />
            <span className="text-xs text-murekkep">{gorunenAdGetir(k)}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

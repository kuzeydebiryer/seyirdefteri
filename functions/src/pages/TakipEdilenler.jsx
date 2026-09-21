import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { takipEdilenProfilleriGetir } from '../hooks/useTakip.js'
import Avatar from '../components/Avatar.jsx'

// Profildeki kompakt "Takip Ettikleri" kartının gittiği yer — önceden o
// kart sadece ilk 12 kişiyi gösteriyordu, tam listeyi görecek bir yer yoktu.
export default function TakipEdilenler() {
  const { uid } = useParams()
  const [liste, setListe] = useState(null)

  useEffect(() => {
    takipEdilenProfilleriGetir(uid, 500).then(setListe)
  }, [uid])

  return (
    <div>
      <Link to={`/profil/${uid}`} className="text-xs text-kraft hover:text-deniz">
        ← Profile Dön
      </Link>
      <h1 className="mt-1 mb-6 font-baslik text-2xl text-murekkep">🔗 Takip Ettikleri</h1>

      {liste === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {liste !== null && liste.length === 0 && <p className="text-sm text-kraft">Henüz kimseyi takip etmiyor.</p>}

      <div className="space-y-1">
        {liste?.map((p) => (
          <Link key={p.uid} to={`/profil/${p.uid}`} className="flex items-center gap-3 rounded-sm p-2 hover:bg-kagitKoyu">
            <Avatar adSoyad={p.adSoyad} avatarUrl={p.avatarUrl} boyut="h-10 w-10" />
            <p className="text-sm text-murekkep">{p.adSoyad}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

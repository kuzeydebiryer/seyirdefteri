import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { tumHavuzuGetir, konuSil } from '../utils/dusunceHavuzu.js'

// Bu sayfa herkese açık (route seviyesinde giriş kontrolü OzelRota ile
// zaten var) ama İÇERİĞİ sadece profil.yonetici === true olan hesaplara
// gösteriliyor — asıl güvenlik Firestore kuralında (silme işlemi orada da
// aynı kontrolü yapıyor), burası sadece arayüz tarafı.
export default function DusunceHavuzuYonetim() {
  const { profil } = useAuth()
  const [konular, setKonular] = useState(null)
  const [silinenId, setSilinenId] = useState(null)

  useEffect(() => {
    if (profil?.yonetici) tumHavuzuGetir().then(setKonular)
  }, [profil?.yonetici])

  async function silTiklandi(konu) {
    if (!window.confirm(`Bu konuyu havuzdan kalıcı olarak silmek istediğine emin misin?\n\n"${konu.konu}"`)) return
    setSilinenId(konu.id)
    try {
      await konuSil(konu.id)
      setKonular((liste) => liste.filter((k) => k.id !== konu.id))
    } finally {
      setSilinenId(null)
    }
  }

  if (!profil) return null

  if (!profil.yonetici) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-sm text-kraft">Bu sayfa sadece yöneticiye açık.</p>
        <Link to="/" className="mt-2 inline-block text-xs text-deniz hover:underline">
          ← Anasayfa
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link to="/" className="text-xs text-kraft hover:text-deniz">
        ← Anasayfa
      </Link>
      <h1 className="mt-1 font-baslik text-2xl text-murekkep mb-1">🛠 Düşünce Havuzu Yönetimi</h1>
      <p className="mb-6 text-sm text-kraft">
        Havuzdaki tüm konular — {konular?.length ?? '…'} tanesi. Uygunsuz, tekrar eden ya da hatalı bir konu görürsen silebilirsin.
      </p>

      {konular === null && <p className="text-sm text-kraft">Yükleniyor...</p>}

      <ul className="space-y-2">
        {konular?.map((k) => (
          <li key={k.id} className="flex items-start justify-between gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-murekkep">{k.konu}</p>
              <p className="mt-1 text-[11px] text-kraft">
                {k.kaynak === 'topluluk' ? '👤 Topluluk önerisi' : k.kaynak === 'dalga2' ? '🎭 İkinci dalga' : '🌱 Başlangıç havuzu'}
              </p>
            </div>
            <button
              onClick={() => silTiklandi(k)}
              disabled={silinenId === k.id}
              className="shrink-0 rounded-sm bg-kagit px-2 py-1 text-xs text-kraft ring-1 ring-cizgi hover:text-muhur disabled:opacity-40"
            >
              {silinenId === k.id ? '...' : 'Sil'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

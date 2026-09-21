import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { gecmisKonulariGetir } from '../utils/dusunceHavuzu.js'

function KonuSatiri({ kayit }) {
  return (
    <li className="rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      <p className="text-xs text-kraft">
        {new Date(kayit.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
        {kayit.gunSayisi ? ` · ${kayit.gunSayisi} gün yayında kaldı` : ''}
      </p>
      <p className="mt-1 font-baslik text-lg text-murekkep">{kayit.konu}</p>
      <Link to={`/dusunce/${encodeURIComponent(kayit.konu)}`} className="mt-2 inline-block text-xs text-deniz hover:underline">
        Yazıları gör →
      </Link>
    </li>
  )
}

// Serbest Düşünce Havuzu'nun geçmişi — daha önce gerçekten gösterilmiş
// (gununKonulari'na kaydedilmiş) dönemler, en yeniden eskiye. Her satır,
// o konuya kimlerin ne yazdığını tek bir sayfada topluca gösteren "konu
// sayfasına" (DusunceKonuSayfasi.jsx) yönlendiriyor.
export default function DusunceArsivi() {
  const [kayitlar, setKayitlar] = useState(null)

  useEffect(() => {
    gecmisKonulariGetir(30).then(setKayitlar)
  }, [])

  return (
    <div className="mx-auto max-w-xl">
      <Link to="/" className="text-xs text-kraft hover:text-deniz">
        ← Anasayfa
      </Link>
      <h1 className="mt-1 font-baslik text-2xl text-murekkep mb-1">💭 Düşünce Arşivi</h1>
      <p className="mb-6 text-sm text-kraft">Serbest Düşünce Havuzu'ndan gelmiş geçmiş dönemlerin konuları.</p>

      {kayitlar === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {kayitlar?.length === 0 && <p className="text-sm text-kraft">Henüz bir arşiv oluşmadı — ilk dönem şimdi başlıyor.</p>}

      <ul className="space-y-3">
        {kayitlar?.map((k) => (
          <KonuSatiri key={k.id} kayit={k} />
        ))}
      </ul>
    </div>
  )
}

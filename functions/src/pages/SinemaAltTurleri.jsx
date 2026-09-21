import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { anaTurleriGetir } from '../utils/sinemaTurleri.js'
import SinemaTuruEkleFormu from '../components/SinemaTuruEkleFormu.jsx'

// Platformlar.jsx ile aynı desen — hub sayfası, her ana tür kendi kartına
// tıklanınca detay sayfasına gidiyor (bkz. SinemaAnaTuruDetay.jsx). Üst
// menüye eklenmedi (kasıtlı) — Filmler sayfasındaki küçük kart grubundan
// erişiliyor. Önceden sabit kodlanmış tek bir tür (Korku Sineması) vardı;
// artık Firestore'dan geliyor, yönetici kod değişikliği olmadan yeni tür
// ekleyebiliyor (bkz. SinemaTuruEkleFormu.jsx).
export default function SinemaAltTurleri() {
  const { profil } = useAuth()
  const [anaTurler, setAnaTurler] = useState(null)
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    anaTurleriGetir().then(setAnaTurler)
  }, [yenile])

  return (
    <div>
      <Link to="/filmler" className="text-xs text-kraft hover:text-deniz">
        ← Filmler
      </Link>
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">🎭 Sinemasal Alt Türler</h1>
      <p className="mb-6 text-sm text-kraft">
        Ana türlerin altındaki incelikli akımlar — Folk Horror'dan Giallo'ya, film ve dizi dünyasının alt kültürleri.
      </p>

      {profil?.yonetici && anaTurler && <SinemaTuruEkleFormu anaTurler={anaTurler} onEklendi={() => setYenile((n) => n + 1)} />}

      {anaTurler === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {anaTurler !== null && anaTurler.length === 0 && <p className="text-sm text-kraft">Henüz hiç tür eklenmemiş.</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {anaTurler?.map((anaTur) => (
          <Link
            key={anaTur.id}
            to={`/sinema-turu/${anaTur.id}`}
            className="flex flex-col items-center gap-2 rounded-sm bg-kagitKoyu p-4 text-center ring-1 ring-cizgi transition hover:ring-deniz/50"
          >
            <span className="text-2xl">{anaTur.ikon}</span>
            <p className="font-baslik text-base text-murekkep">{anaTur.ad}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

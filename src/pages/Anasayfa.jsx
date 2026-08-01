import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useGonderiler } from '../hooks/useGonderiler.js'
import { takipEdilenUidleriGetir } from '../hooks/useTakip.js'
import GonderiKarti from '../components/GonderiKarti.jsx'
import SonAlintilarBolumu from '../components/SonAlintilarBolumu.jsx'
import KitapDunyasiWidget from '../components/KitapDunyasiWidget.jsx'
import TavsiyeBildirimSeridi from '../components/TavsiyeBildirimSeridi.jsx'
import Logo from '../components/Logo.jsx'

export default function Anasayfa() {
  const { kullanici } = useAuth()
  const [sekme, setSekme] = useState('takip') // 'takip' | 'herkes'
  const [takipEdilenler, setTakipEdilenler] = useState(null) // null = henüz yüklenmedi
  const [takipListesiYukleniyor, setTakipListesiYukleniyor] = useState(true)

  useEffect(() => {
    if (!kullanici) return
    let iptal = false
    setTakipListesiYukleniyor(true)
    takipEdilenUidleriGetir(kullanici.uid).then((uidler) => {
      if (iptal) return
      setTakipEdilenler(uidler)
      if (uidler.length === 0) setSekme('herkes') // kimseyi takip etmiyorsa direkt genel akışı göster
      setTakipListesiYukleniyor(false)
    })
    return () => {
      iptal = true
    }
  }, [kullanici])

  // Takip listesi henüz yüklenmeden "takip" sorgusunu boş listeyle tetiklememek için
  // (aksi halde bir an için "kimseyi takip etmiyorsun" mesajı yanlışlıkla görünüyordu)
  const takipHazirMi = takipEdilenler !== null
  const takipFiltresi = takipHazirMi ? [...takipEdilenler, kullanici.uid] : []
  const sorguAktifMi = sekme === 'herkes' || takipHazirMi

  const { gonderiler, yukleniyor, hata } = useGonderiler(
    !sorguAktifMi ? undefined : sekme === 'takip' ? { yazarIdListesi: takipFiltresi } : {}
  )

  const gercektenYukleniyor = !sorguAktifMi || (sekme === 'takip' && takipListesiYukleniyor) || yukleniyor

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Logo sadeceIkon boyut={22} />
        <p className="font-baslik text-sm text-murekkep">
          Seyirdefteri <span className="font-govde italic text-kraft">— Kültür hayatının ortak günlüğü.</span>
        </p>
      </div>

      <TavsiyeBildirimSeridi />

      <div className="flex items-center justify-between mb-4">
        <h1 className="font-baslik text-2xl text-murekkep">Akış</h1>
        <Link to="/gonderi-ekle" className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-sm text-kagit">
          + Günce Ekle
        </Link>
      </div>

      <div className="mb-6 flex gap-4 text-sm font-govde">
        <button
          onClick={() => setSekme('takip')}
          className={sekme === 'takip' ? 'text-muhur font-medium' : 'text-kraft hover:text-murekkep'}
        >
          Takip Ettiklerim
        </button>
        <button
          onClick={() => setSekme('herkes')}
          className={sekme === 'herkes' ? 'text-muhur font-medium' : 'text-kraft hover:text-murekkep'}
        >
          Herkes
        </button>
      </div>

      <KitapDunyasiWidget />

      <SonAlintilarBolumu limitSayisi={5} />

      {gercektenYukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {hata && <p className="text-sm text-muhur">Bir hata oldu: {hata}</p>}

      {!gercektenYukleniyor && gonderiler.length === 0 && sekme === 'takip' && (
        <p className="text-sm text-kraft">
          Henüz kimseyi takip etmiyorsun. <button onClick={() => setSekme('herkes')} className="text-muhur">Herkes</button> sekmesinden
          keşfedip takip edebilirsin.
        </p>
      )}
      {!gercektenYukleniyor && gonderiler.length === 0 && sekme === 'herkes' && (
        <p className="text-sm text-kraft">
          Henüz hiç günce yok. İlk paylaşımı sen yap: <Link to="/gonderi-ekle" className="text-muhur">Günce Ekle</Link>
        </p>
      )}

      {!gercektenYukleniyor && (
        <div className="space-y-4">
          {gonderiler.map((g, i) => (
            <div key={g.id}>
              <GonderiKarti gonderi={g} />
              {i < gonderiler.length - 1 && <div className="defter-cizgi mt-4" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

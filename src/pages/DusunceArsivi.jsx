import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { gecmisKonulariGetir, gununYazilariniGetir } from '../utils/dusunceHavuzu.js'

function KonuSatiri({ kayit }) {
  const [yazilar, setYazilar] = useState(null)
  const [acik, setAcik] = useState(false)

  function ac() {
    setAcik((a) => !a)
    if (!yazilar) gununYazilariniGetir(kayit.konu).then(setYazilar)
  }

  return (
    <li className="rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      <p className="text-xs text-kraft">
        {new Date(kayit.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
      <p className="mt-1 font-baslik text-lg text-murekkep">{kayit.konu}</p>
      <button onClick={ac} className="mt-2 text-xs text-deniz hover:underline">
        {acik ? '▲ Gizle' : `▼ ${yazilar ? `${yazilar.length} yazı` : 'Yazıları gör'}`}
      </button>
      {acik && yazilar && (
        <ul className="mt-2 space-y-1 border-t border-cizgi pt-2">
          {yazilar.length === 0 && <p className="text-xs text-kraft">Bu konuya kimse yazmamış.</p>}
          {yazilar.map((y) => (
            <li key={y.id}>
              <Link to={`/gonderi/${y.id}`} className="text-xs text-murekkep hover:text-deniz hover:underline">
                {y.yazarAdi}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

// Serbest Düşünce Havuzu'nun geçmişi — daha önce gerçekten gösterilmiş
// (gununKonulari'na kaydedilmiş) dönemler, en yeniden eskiye.
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
          <KonuSatiri key={k.tarih} kayit={k} />
        ))}
      </ul>
    </div>
  )
}

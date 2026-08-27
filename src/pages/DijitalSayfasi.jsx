import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TavsiyeBolumu from '../components/TavsiyeBolumu.jsx'
import YatayKaydirma from '../components/YatayKaydirma.jsx'
import { useTavsiyeler } from '../hooks/useTavsiyeler.js'
import { yakindaGelecekleriGetir } from '../utils/yakindaGelecek.js'

function gunSayisi(cikisTarihi) {
  const fark = new Date(cikisTarihi) - new Date(new Date().toISOString().slice(0, 10))
  return Math.round(fark / (1000 * 60 * 60 * 24))
}

// Gerçek bir TMDB platformu değil — "belirli bir platformda değil ama
// dijital VOD (kiralık/satın alma ya da genel dijital) ile evde izlenebilir"
// anlamına gelen, kendi oluşturduğumuz özel kategori. Platformlar
// ızgarasındaki "💻 Dijital" karosu buraya yönleniyor.
export default function DijitalSayfasi() {
  const { tavsiyeler: dijitalYeniCikanlar, yenidenYukle } = useTavsiyeler('sinema', 'dijitalYeniCikanlar')
  const [yakindaDijital, setYakindaDijital] = useState(null)

  useEffect(() => {
    yakindaGelecekleriGetir().then((liste) => setYakindaDijital(liste.filter((k) => k.hedefTuru === 'dijital')))
  }, [])

  return (
    <div>
      <Link to="/platformlar" className="text-xs text-kraft hover:text-deniz">
        ← Platformlar
      </Link>
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">💻 Dijital</h1>
      <p className="mb-6 text-sm text-kraft">
        Türkiye'de belirli bir platformda değil ama dijital VOD ile (kiralık, satın alma ya da genel dijital erişimle) evde
        izlenebilen film ve diziler.
      </p>

      {yakindaDijital && yakindaDijital.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 font-baslik text-lg text-murekkep">📅 Yakında Geliyor</h2>
          <YatayKaydirma>
            {yakindaDijital.map((k) => {
              const gun = gunSayisi(k.cikisTarihi)
              return (
                <Link key={k.id} to={`/${k.tur === 'sinema' ? 'film' : 'dizi'}/${k.disId}`} className="shrink-0" style={{ width: 110 }}>
                  <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                    {k.posterUrl ? (
                      <img src={k.posterUrl} alt={k.baslik} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">🎬</div>
                    )}
                  </div>
                  <p className="mt-1 truncate text-[11px] text-murekkep">{k.baslik}</p>
                  <p className="text-[10px] text-gise">{gun === 0 ? 'Bugün! 🎉' : gun === 1 ? 'Yarın' : `${gun} gün sonra`}</p>
                </Link>
              )
            })}
          </YatayKaydirma>
        </div>
      )}

      <TavsiyeBolumu
        tur="sinema"
        koleksiyon="dijitalYeniCikanlar"
        tavsiyeler={dijitalYeniCikanlar}
        yenidenYukle={yenidenYukle}
        baslik="Dijitalde Yeni Çıkanlar"
        ekleButonuMetni="+ Film Ekle"
        rozetMetni="💻 Dijital"
      />
    </div>
  )
}

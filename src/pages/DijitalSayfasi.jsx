import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TavsiyeBolumu from '../components/TavsiyeBolumu.jsx'
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
  const [filtre, setFiltre] = useState('tumu')
  const [yakindaDijital, setYakindaDijital] = useState(null)

  useEffect(() => {
    yakindaGelecekleriGetir().then((liste) => setYakindaDijital(liste.filter((k) => k.hedefTuru === 'dijital')))
  }, [])

  // Tümü: hepsi. Dijital: platformEtiketi yok ya da "💻 Dijital" (eski
  // kayıtlar da buraya sayılıyor). Platform: MUBI/HBO gibi belirli bir
  // platforma eklenip buraya çapraz kaydolanlar — bu sekmede görmek
  // isteyen, "hangi filmler hem platformda hem burada" diye merak edenler
  // için.
  const gosterilecekler = dijitalYeniCikanlar.filter((t) => {
    if (filtre === 'tumu') return true
    if (filtre === 'dijital') return !t.platformEtiketi || t.platformEtiketi === '💻 Dijital'
    return t.platformEtiketi && t.platformEtiketi !== '💻 Dijital'
  })

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
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {yakindaDijital.map((k) => {
              const gun = gunSayisi(k.cikisTarihi)
              return (
                <Link key={k.id} to={`/${k.tur === 'sinema' ? 'film' : 'dizi'}/${k.disId}`}>
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
          </div>
        </div>
      )}

      <TavsiyeBolumu
        tur="sinema"
        koleksiyon="dijitalYeniCikanlar"
        tavsiyeler={gosterilecekler}
        yenidenYukle={yenidenYukle}
        baslik="Dijitalde Yeni Çıkanlar"
        ekleButonuMetni="+ Film Ekle"
        rozetMetni="💻 Dijital"
        araIcerik={
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              { id: 'tumu', etiket: 'Tümü' },
              { id: 'dijital', etiket: '💻 Dijital' },
              { id: 'platform', etiket: '📡 Platform' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltre(f.id)}
                className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
                  filtre === f.id ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagitKoyu text-kraft ring-cizgi'
                }`}
              >
                {f.etiket}
              </button>
            ))}
          </div>
        }
      />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import FilmDiziArama from '../components/FilmDiziArama.jsx'
import { platformdaYeniEklenenleriGetir } from '../utils/platformYeniEklenenler.js'

// Film/Dizi sekmesi "sekme" parametre adıyla URL'e yazılıyor —
// FilmDiziArama'nın kendi tür (genre) filtresi de "tur" parametresini
// kullandığı için aynı isimde çakışma olmasın diye ayrı bir ad seçildi.
export default function PlatformDetay() {
  const { id } = useParams()
  const [aramaParametreleri, setAramaParametreleri] = useSearchParams()
  const ad = aramaParametreleri.get('ad') || 'Platform'
  const sekme = aramaParametreleri.get('sekme') || 'sinema'
  const [yeniEklenenler, setYeniEklenenler] = useState(null)

  useEffect(() => {
    setYeniEklenenler(null)
    platformdaYeniEklenenleriGetir(id, sekme).then(setYeniEklenenler)
  }, [id, sekme])

  function sekmeSec(yeniSekme) {
    const guncel = new URLSearchParams(aramaParametreleri)
    guncel.set('sekme', yeniSekme)
    // Sekme değişince önceki filtreler (yıl/puan/tür vb.) artık farklı bir
    // TMDB kategorisine ait olur — kafa karıştırmasın diye temizleniyor,
    // sadece "ad" ve yeni "sekme" kalıyor.
    const temiz = new URLSearchParams()
    temiz.set('ad', ad)
    temiz.set('sekme', yeniSekme)
    setAramaParametreleri(temiz)
  }

  return (
    <div>
      <Link to="/platformlar" className="text-xs text-kraft hover:text-deniz">
        ← Platformlar
      </Link>
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">📡 {ad}</h1>
      <p className="mb-6 text-sm text-kraft">Şu an {ad}'de abonelikle izlenebilen film ve diziler.</p>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => sekmeSec('sinema')}
          className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
            sekme === 'sinema' ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagitKoyu text-kraft ring-cizgi'
          }`}
        >
          🎬 Film
        </button>
        <button
          onClick={() => sekmeSec('dizi')}
          className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
            sekme === 'dizi' ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagitKoyu text-kraft ring-cizgi'
          }`}
        >
          📺 Dizi
        </button>
      </div>

      {yeniEklenenler && yeniEklenenler.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 font-baslik text-lg text-murekkep">🆕 Son 30 Günde Eklenenler</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {yeniEklenenler.map((k) => (
              <Link
                key={k.id}
                to={`/${sekme === 'sinema' ? 'film' : 'dizi'}/${k.disId}`}
                className="shrink-0"
                style={{ width: 104 }}
              >
                <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                  {k.posterUrl ? (
                    <img src={k.posterUrl} alt={k.baslik} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">🆕</div>
                  )}
                </div>
                <p className="mt-1 truncate text-[11px] text-murekkep">{k.baslik}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <FilmDiziArama tur={sekme} sabitPlatformId={id} />
    </div>
  )
}

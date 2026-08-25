import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import FilmDiziArama from '../components/FilmDiziArama.jsx'
import { platformdaYeniEklenenleriGetir } from '../utils/platformYeniEklenenler.js'

export default function PlatformDetay() {
  const { id } = useParams()
  const [aramaParametreleri] = useSearchParams()
  const ad = aramaParametreleri.get('ad') || 'Platform'
  const [tur, setTur] = useState('sinema')
  const [yeniEklenenler, setYeniEklenenler] = useState(null)

  useEffect(() => {
    setYeniEklenenler(null)
    platformdaYeniEklenenleriGetir(id, tur).then(setYeniEklenenler)
  }, [id, tur])

  return (
    <div>
      <Link to="/platformlar" className="text-xs text-kraft hover:text-deniz">
        ← Platformlar
      </Link>
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">📡 {ad}</h1>
      <p className="mb-6 text-sm text-kraft">Şu an {ad}'de abonelikle izlenebilen film ve diziler.</p>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTur('sinema')}
          className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
            tur === 'sinema' ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagitKoyu text-kraft ring-cizgi'
          }`}
        >
          🎬 Film
        </button>
        <button
          onClick={() => setTur('dizi')}
          className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
            tur === 'dizi' ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagitKoyu text-kraft ring-cizgi'
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
                to={`/${tur === 'sinema' ? 'film' : 'dizi'}/${k.disId}`}
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

      <FilmDiziArama tur={tur} sabitPlatformId={id} />
    </div>
  )
}

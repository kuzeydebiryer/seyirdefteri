import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import FilmDiziArama from '../components/FilmDiziArama.jsx'

export default function PlatformDetay() {
  const { id } = useParams()
  const [aramaParametreleri] = useSearchParams()
  const ad = aramaParametreleri.get('ad') || 'Platform'
  const [tur, setTur] = useState('sinema')

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

      <FilmDiziArama tur={tur} sabitPlatformId={id} />
    </div>
  )
}

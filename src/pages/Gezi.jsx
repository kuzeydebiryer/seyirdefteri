import { Link } from 'react-router-dom'
import { useGonderiler } from '../hooks/useGonderiler.js'
import GonderiKarti from '../components/GonderiKarti.jsx'
import DunyaHaritasi from '../components/DunyaHaritasi.jsx'

export default function Gezi() {
  const { gonderiler: geziler, yukleniyor: geziYukleniyor } = useGonderiler({ tur: 'gezi' })

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep mb-6">Gezi</h1>

      {!geziYukleniyor && <DunyaHaritasi geziler={geziler} />}

      <div className="mb-6 flex justify-center">
        <Link
          to="/gonderi-ekle?tur=gezi"
          className="rounded-sm bg-muhur px-4 py-2 font-govde text-sm text-kagit hover:opacity-90"
        >
          + Gezini Ekle
        </Link>
      </div>

      <div>
        <h2 className="font-baslik text-lg text-murekkep mb-3">Dünyayı Geziyorum</h2>
        {geziYukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
        {!geziYukleniyor && geziler.length === 0 && <p className="text-sm text-kraft">Henüz bir gezi paylaşımı yok.</p>}
        <div className="space-y-4">
          {geziler.map((g, i) => (
            <div key={g.id}>
              <GonderiKarti gonderi={g} />
              {i < geziler.length - 1 && <div className="defter-cizgi mt-4" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

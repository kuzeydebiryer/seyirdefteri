import { Link } from 'react-router-dom'
import { useGonderiler } from '../hooks/useGonderiler.js'
import GonderiKarti from '../components/GonderiKarti.jsx'
import DunyaHaritasi from '../components/DunyaHaritasi.jsx'

export default function Gezi() {
  const { gonderiler: geziler, yukleniyor: geziYukleniyor } = useGonderiler({ tur: 'gezi' })
  const { gonderiler: etkinlikler, yukleniyor: etkinlikYukleniyor } = useGonderiler({ tur: 'etkinlik' })

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

      <div className="mb-10">
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

      <div className="defter-cizgi my-8" />

      <div className="mb-10">
        <img
          src="/gorseller/etkinlik-banner.png"
          alt="Tiyatro, Konser, Mekan, Sergi Dünyası — Keşfet, Deneyimle ve Paylaş"
          className="mb-3 w-full rounded-sm ring-1 ring-cizgi"
        />
        <div className="mb-6 flex justify-center">
          <Link
            to="/gonderi-ekle?tur=etkinlik"
            className="rounded-sm bg-muhur px-4 py-2 font-govde text-sm text-kagit hover:opacity-90"
          >
            + Etkinlik Ekle
          </Link>
        </div>

        <h2 className="font-baslik text-lg text-murekkep mb-3">Etkinlik Dünyası</h2>
        <p className="mb-3 text-xs text-kraft">Tiyatro, konser, mekan gibi paylaşımlar.</p>
        {etkinlikYukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
        {!etkinlikYukleniyor && etkinlikler.length === 0 && <p className="text-sm text-kraft">Henüz bir etkinlik paylaşımı yok.</p>}
        <div className="space-y-4">
          {etkinlikler.map((e, i) => (
            <div key={e.id}>
              <GonderiKarti gonderi={e} />
              {i < etkinlikler.length - 1 && <div className="defter-cizgi mt-4" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useGonderiler } from '../hooks/useGonderiler.js'
import GonderiKarti from '../components/GonderiKarti.jsx'

export default function EtkinlikDunyasi() {
  const { gonderiler: etkinlikler, yukleniyor: etkinlikYukleniyor } = useGonderiler({ tur: 'etkinlik' })

  return (
    <div>
      <img
        src="/gorseller/etkinlik-banner.png"
        alt="Tiyatro, Opera, Bale, Konser, Festival, Müze Dünyası — Keşfet, Deneyimle ve Paylaş"
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

      <h1 className="font-baslik text-2xl text-murekkep mb-1">Etkinlik Dünyası</h1>
      <p className="mb-6 text-sm text-kraft">Tiyatro, opera, bale, konser, festival, müze, sergi ve daha fazlası.</p>

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
  )
}

import { useTartismaEtkinlikleri } from '../hooks/useTartismaEtkinlikleri.js'
import EtkinlikKarti from '../components/EtkinlikKarti.jsx'

export default function Etkinlikler() {
  const { etkinlikler, yukleniyor } = useTartismaEtkinlikleri({})

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep mb-2">Tartışma Etkinlikleri</h1>
      <p className="text-sm text-kraft mb-6">
        Topluluk üyelerinin oluşturduğu "bu film/kitap hakkında konuşalım" etkinlikleri.
      </p>

      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {!yukleniyor && etkinlikler.length === 0 && (
        <p className="text-sm text-kraft">Henüz planlanmış bir etkinlik yok.</p>
      )}

      <div className="space-y-3">
        {etkinlikler.map((e) => (
          <EtkinlikKarti key={e.id} etkinlik={e} gonderiBasligi={e.gonderiBasligi} />
        ))}
      </div>
    </div>
  )
}

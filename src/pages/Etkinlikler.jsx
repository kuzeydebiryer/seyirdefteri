import { useTartismaEtkinlikleri } from '../hooks/useTartismaEtkinlikleri.js'
import { useTumGelecekEtkinlikler } from '../hooks/useTumGelecekEtkinlikler.js'
import EtkinlikKarti from '../components/EtkinlikKarti.jsx'
import GelecekEtkinlikKarti from '../components/GelecekEtkinlikKarti.jsx'

// Bir topluluğun türünü ("Sinema"/"Kitap"/"Genel") kulüp bölümüne eşler
function kulupTuru(topluluklTur) {
  if (topluluklTur === 'Kitap') return 'kitap'
  if (topluluklTur === 'Sinema') return 'film'
  return 'genel'
}

function KulupBolumu({ baslik, tartismaEtkinlikleri, gelecekEtkinlikler }) {
  return (
    <div className="mb-10">
      <h2 className="font-baslik text-xl text-murekkep mb-4">{baslik}</h2>

      <h3 className="font-baslik text-base text-murekkep mb-2">Bu {baslik === 'Film Kulübü' ? 'film' : 'kitap'} hakkında konuşmalıyız</h3>
      {tartismaEtkinlikleri.length === 0 && <p className="mb-4 text-sm text-kraft">Şu an planlanmış bir tartışma yok.</p>}
      <div className="mb-6 space-y-3">
        {tartismaEtkinlikleri.map((e) => (
          <EtkinlikKarti key={e.id} etkinlik={e} gonderiBasligi={e.gonderiBasligi} />
        ))}
      </div>

      <h3 className="font-baslik text-base text-murekkep mb-2">Gelecek Etkinlik</h3>
      {gelecekEtkinlikler.length === 0 && <p className="text-sm text-kraft">Planlanmış bir topluluk etkinliği yok.</p>}
      <div className="space-y-3">
        {gelecekEtkinlikler.map((e) => (
          <GelecekEtkinlikKarti key={e.id} topluluklId={e.topluluklId} etkinlik={e} />
        ))}
      </div>
    </div>
  )
}

export default function Etkinlikler() {
  const { etkinlikler: tartismaEtkinlikleri, yukleniyor: tartismaYukleniyor } = useTartismaEtkinlikleri({})
  const { etkinlikler: gelecekEtkinlikler, yukleniyor: gelecekYukleniyor, hata } = useTumGelecekEtkinlikler()

  const yukleniyor = tartismaYukleniyor || gelecekYukleniyor

  const filmTartisma = tartismaEtkinlikleri.filter((e) => e.gonderiTuru === 'sinema' || e.gonderiTuru === 'dizi')
  const kitapTartisma = tartismaEtkinlikleri.filter((e) => e.gonderiTuru === 'kitap')

  const filmEtkinlik = gelecekEtkinlikler.filter((e) => kulupTuru(e.topluluklTur) === 'film')
  const kitapEtkinlik = gelecekEtkinlikler.filter((e) => kulupTuru(e.topluluklTur) === 'kitap')
  const genelEtkinlik = gelecekEtkinlikler.filter((e) => kulupTuru(e.topluluklTur) === 'genel')

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep mb-2">Etkinlikler</h1>
      <p className="text-sm text-kraft mb-6">
        Tartışma etkinlikleri ve topluluk buluşmaları, kulüp türüne göre gruplanmış.
      </p>

      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {hata && (
        <p className="mb-4 text-sm text-muhur">
          Topluluk etkinlikleri yüklenemedi: {hata}. Muhtemelen Firestore'da eksik bir indeks var — tarayıcı
          konsolundaki (F12) linke tıklayarak oluşturabilirsin.
        </p>
      )}

      {!yukleniyor && (
        <>
          <KulupBolumu baslik="Film Kulübü" tartismaEtkinlikleri={filmTartisma} gelecekEtkinlikler={filmEtkinlik} />
          <KulupBolumu baslik="Kitap Kulübü" tartismaEtkinlikleri={kitapTartisma} gelecekEtkinlikler={kitapEtkinlik} />

          {genelEtkinlik.length > 0 && (
            <div className="mb-10">
              <h2 className="font-baslik text-xl text-murekkep mb-4">Genel</h2>
              <div className="space-y-3">
                {genelEtkinlik.map((e) => (
                  <GelecekEtkinlikKarti key={e.id} topluluklId={e.topluluklId} etkinlik={e} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

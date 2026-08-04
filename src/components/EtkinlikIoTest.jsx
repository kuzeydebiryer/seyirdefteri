import { useEffect, useState } from 'react'
import { etkinlikleriGetir } from '../utils/etkinlikIo.js'

// GEÇİCİ TEST BİLEŞENİ — Etkinlik.io API'sinin tarayıcıdan (CORS) çağrılıp
// çağrılamadığını görmek için. Sonuç netleşince (çalışıyorsa gerçek bir
// "Yaklaşan Etkinlikler" widget'ına dönüştürülecek, çalışmıyorsa kaldırılacak).
export default function EtkinlikIoTest() {
  const [durum, setDurum] = useState('yukleniyor') // 'yukleniyor' | 'basarili' | 'hata'
  const [mesaj, setMesaj] = useState('')
  const [ornekEtkinlik, setOrnekEtkinlik] = useState(null)

  useEffect(() => {
    etkinlikleriGetir({ sehir: 'istanbul' }).then((sonuc) => {
      if (sonuc.hata) {
        setDurum('hata')
        setMesaj(sonuc.hata)
      } else {
        setDurum('basarili')
        setOrnekEtkinlik(sonuc.veri?.data?.[0] || sonuc.veri?.items?.[0] || null)
        setMesaj(`Bağlantı başarılı! Toplam sonuç bilgisi: ${JSON.stringify(sonuc.veri?.meta || sonuc.veri?.pagination || 'meta yok')}`)
      }
    })
  }, [])

  return (
    <div className="mb-6 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      <p className="text-[11px] uppercase tracking-widest text-gise">🧪 Etkinlik.io Bağlantı Testi (geçici)</p>
      {durum === 'yukleniyor' && <p className="mt-1 text-sm text-kraft">Test ediliyor...</p>}
      {durum === 'hata' && (
        <div className="mt-1">
          <p className="text-sm text-muhur">❌ Başarısız: {mesaj}</p>
          <p className="mt-1 text-xs text-kraft">
            Tarayıcı konsolunu (F12 → Console) açıp kırmızı bir CORS hatası görüyorsan, bu API'yi doğrudan
            kullanamayız demektir — bana ekran görüntüsü at.
          </p>
        </div>
      )}
      {durum === 'basarili' && (
        <div className="mt-1">
          <p className="text-sm text-murekkep">✅ Bağlantı başarılı, CORS engeli yok!</p>
          <p className="mt-1 text-xs text-kraft">{mesaj}</p>
          {ornekEtkinlik && (
            <pre className="mt-2 max-h-40 overflow-auto rounded-sm bg-kagit p-2 text-[10px] text-kraft">
              {JSON.stringify(ornekEtkinlik, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

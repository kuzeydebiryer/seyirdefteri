import { Link } from 'react-router-dom'
import { useTumGelecekEtkinlikler } from '../hooks/useTumGelecekEtkinlikler.js'
import GelecekEtkinlikKarti from './GelecekEtkinlikKarti.jsx'

// Anasayfada "Film Kulübü / Kitap Kulübü" yaklaşan buluşmalarının önizlemesi
// — /etkinlikler sayfasındaki tam sistemin (topluluk önerisi → beğeni →
// tarihe bağlanmış etkinlik) aynı verisi, aynı kart (GelecekEtkinlikKarti)
// ile, sadece en yakın birkaçı gösteriliyor.
export default function KulupEtkinlikleriOnizleme({ limitSayisi = 3 }) {
  const { etkinlikler, yukleniyor } = useTumGelecekEtkinlikler()

  if (yukleniyor) return null

  const simdi = Date.now()
  const yaklasanlar = etkinlikler
    .filter((e) => (e.topluluklTur === 'Sinema' || e.topluluklTur === 'Kitap') && (!e.tarih || new Date(e.tarih).getTime() >= simdi))
    .slice(0, limitSayisi)

  if (yaklasanlar.length === 0) return null

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">🎬📖 Film & Kitap Kulübü</h2>
        <Link to="/etkinlikler" className="shrink-0 whitespace-nowrap text-sm text-kraft hover:text-deniz">
          Tümünü Gör ›
        </Link>
      </div>
      <div className="space-y-3">
        {yaklasanlar.map((e) => (
          <GelecekEtkinlikKarti key={e.id} etkinlik={e} />
        ))}
      </div>
    </div>
  )
}

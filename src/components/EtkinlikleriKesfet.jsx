import { useEffect, useState } from 'react'
import { etkinlikleriGetir } from '../utils/etkinlikIo.js'

const SEHIRLER = [
  { id: '', ad: 'Tüm Şehirler' },
  { id: 'istanbul', ad: 'İstanbul' },
  { id: 'ankara', ad: 'Ankara' },
  { id: 'izmir', ad: 'İzmir' },
  { id: 'kocaeli', ad: 'Kocaeli' },
  { id: 'bursa', ad: 'Bursa' },
]

function tarihFormatla(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

// Etkinlik.io Yayıncı Ağı entegrasyonu — Türkiye genelinde binlerce etkinlik
// (Tiyatro, Konser, Sergi, Festival vb.), IKSV gibi kaynaklardan geliyor.
// Bilet Satış Tarihi gibi "gelecekte" bilgiler için elle giriş yerine artık
// gerçek, canlı bir veri kaynağımız var.
export default function EtkinlikleriKesfet() {
  const [sehir, setSehir] = useState('')
  const [etkinlikler, setEtkinlikler] = useState([])
  const [sayfa, setSayfa] = useState(1)
  const [toplamSayfa, setToplamSayfa] = useState(1)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')

  async function yukle(hedefSayfa, sifirla) {
    setYukleniyor(true)
    setHata('')
    const sonuc = await etkinlikleriGetir({ sehir, sayfa: hedefSayfa })
    if (sonuc.hata) {
      setHata(sonuc.hata)
    } else {
      setEtkinlikler((onceki) => (sifirla ? sonuc.etkinlikler : [...onceki, ...sonuc.etkinlikler]))
      setToplamSayfa(sonuc.toplamSayfa)
      setSayfa(hedefSayfa)
    }
    setYukleniyor(false)
  }

  useEffect(() => {
    yukle(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sehir])

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">📅 Yaklaşan Etkinlikleri Keşfet</h2>
        <select
          value={sehir}
          onChange={(e) => setSehir(e.target.value)}
          className="rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
        >
          {SEHIRLER.map((s) => (
            <option key={s.id} value={s.id}>
              {s.ad}
            </option>
          ))}
        </select>
      </div>

      {hata && <p className="text-sm text-muhur">Yüklenirken hata oluştu: {hata}</p>}
      {yukleniyor && etkinlikler.length === 0 && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {!yukleniyor && !hata && etkinlikler.length === 0 && <p className="text-sm text-kraft">Bu şehirde etkinlik bulunamadı.</p>}

      <div className="space-y-3">
        {etkinlikler.map((e) => (
          <a
            key={e.id}
            href={e.url}
            target="_blank"
            rel="noreferrer"
            className="flex gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi hover:ring-deniz"
          >
            {e.gorselUrl && (
              <img src={e.gorselUrl} alt={e.baslik} className="h-20 w-20 shrink-0 rounded-sm object-cover ring-1 ring-cizgi" />
            )}
            <div className="min-w-0">
              <p className="truncate font-baslik text-sm text-murekkep">{e.baslik}</p>
              <p className="text-xs text-kraft">
                {[tarihFormatla(e.baslangic), e.mekan, e.sehir].filter(Boolean).join(' · ')}
              </p>
              {e.icerikKisa && <p className="mt-1 line-clamp-2 text-xs text-kraft">{e.icerikKisa}</p>}
            </div>
          </a>
        ))}
      </div>

      {!yukleniyor && sayfa < toplamSayfa && (
        <button
          onClick={() => yukle(sayfa + 1, false)}
          className="mt-4 rounded-sm bg-kagitKoyu px-4 py-2 font-govde text-sm text-kraft ring-1 ring-cizgi hover:text-murekkep"
        >
          Daha Fazla Göster
        </button>
      )}
      {yukleniyor && etkinlikler.length > 0 && <p className="mt-4 text-sm text-kraft">Yükleniyor...</p>}
    </div>
  )
}

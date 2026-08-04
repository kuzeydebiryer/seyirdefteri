import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { etkinlikleriGetir } from '../utils/etkinlikIo.js'
import { etkinligiOneCikar, MAKS_ONE_CIKAN_SAYISI } from '../utils/etkinlikOneCikan.js'

const SEHIRLER = [
  { id: '', ad: 'Tüm Şehirler' },
  { id: 'istanbul', ad: 'İstanbul' },
  { id: 'ankara', ad: 'Ankara' },
  { id: 'izmir', ad: 'İzmir' },
  { id: 'kocaeli', ad: 'Kocaeli' },
  { id: 'bursa', ad: 'Bursa' },
]

const MAKS_SAYFA = 4 // "Daha Fazla Göster" en fazla bu kadar sayfa açar — sonsuz uzamasın

function tarihFormatla(iso) {
  if (!iso) return ''
  try {
    return (
      new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) +
      ' — ' +
      new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    )
  } catch {
    return iso
  }
}

function EtkinlikKarti({ e, oneCikanSayisi, oneCikanMi, onOneCikar }) {
  const [isleniyor, setIsleniyor] = useState(false)
  const { kullanici } = useAuth()

  async function tiklandi() {
    setIsleniyor(true)
    try {
      await onOneCikar(e)
    } catch (err) {
      window.alert(err.message)
    } finally {
      setIsleniyor(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-sm ring-1 ring-cizgi">
      <a href={e.url} target="_blank" rel="noreferrer" className="block">
        <div className="relative">
          {e.gorselUrl ? (
            <img src={e.gorselUrl} alt={e.baslik} className="h-32 w-full object-cover" />
          ) : (
            <div className="flex h-32 w-full items-center justify-center bg-kagitKoyu text-2xl">🎟️</div>
          )}
          {e.kategori && (
            <span className="absolute left-2 top-2 rounded-sm bg-murekkep/90 px-2 py-1 text-[10px] font-medium text-kagit">
              {e.kategori}
            </span>
          )}
        </div>
      </a>
      <div className="bg-kagitKoyu p-3">
        <a href={e.url} target="_blank" rel="noreferrer">
          <p className="truncate font-baslik text-sm text-murekkep hover:underline">{e.baslik}</p>
        </a>
        <p className="mt-1 text-xs text-kraft">{tarihFormatla(e.baslangic)}</p>
        {(e.mekan || e.sehir) && <p className="truncate text-xs text-kraft">{[e.mekan, e.sehir].filter(Boolean).join(', ')}</p>}

        {kullanici && (
          <button
            onClick={tiklandi}
            disabled={isleniyor || oneCikanMi || oneCikanSayisi >= MAKS_ONE_CIKAN_SAYISI}
            className="mt-2 w-full rounded-sm bg-kagit px-2 py-1.5 text-[11px] text-kraft ring-1 ring-cizgi hover:text-murekkep disabled:opacity-40"
          >
            {oneCikanMi ? '⭐ Öne Çıkarıldı' : oneCikanSayisi >= MAKS_ONE_CIKAN_SAYISI ? 'Öne Çıkanlar Dolu (3/3)' : '⭐ Öne Çıkar'}
          </button>
        )}
      </div>
    </div>
  )
}

// Etkinlik.io Yayıncı Ağı entegrasyonu — Türkiye genelinde binlerce etkinlik.
// Liste onlarca sonuca uzayabildiği için varsayılan olarak DARALTILMIŞ —
// "Tüm Etkinlikleri Gör"e basmadan görünmüyor. Topluluk, beğendiği en fazla 3
// etkinliği "Öne Çıkar" ile sayfanın başına taşıyabiliyor (bkz. EtkinlikOneCikanlar).
export default function EtkinlikleriKesfet({ oneCikanSayisi, onOneCikanDegisti }) {
  const [acik, setAcik] = useState(false)
  const [sehir, setSehir] = useState('')
  const [etkinlikler, setEtkinlikler] = useState([])
  const [oneCikanIdler, setOneCikanIdler] = useState(new Set())
  const [sayfa, setSayfa] = useState(1)
  const [toplamSayfa, setToplamSayfa] = useState(1)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState('')
  const { kullanici } = useAuth()

  async function yukle(hedefSayfa, sifirla) {
    setYukleniyor(true)
    setHata('')
    const sonuc = await etkinlikleriGetir({ sehir, sayfa: hedefSayfa })
    if (sonuc.hata) {
      setHata(sonuc.hata)
    } else {
      setEtkinlikler((onceki) => (sifirla ? sonuc.etkinlikler : [...onceki, ...sonuc.etkinlikler]))
      setToplamSayfa(Math.min(sonuc.toplamSayfa, MAKS_SAYFA))
      setSayfa(hedefSayfa)
    }
    setYukleniyor(false)
  }

  useEffect(() => {
    if (acik) yukle(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sehir, acik])

  async function oneCikarTiklandi(etkinlik) {
    await etkinligiOneCikar(kullanici, etkinlik, oneCikanSayisi)
    setOneCikanIdler((s) => new Set(s).add(etkinlik.id))
    onOneCikanDegisti?.()
  }

  return (
    <div className="mb-10">
      <button
        onClick={() => setAcik((a) => !a)}
        className="mb-3 flex w-full items-center justify-between rounded-sm bg-kagitKoyu px-4 py-2 text-left ring-1 ring-cizgi"
      >
        <span className="font-baslik text-lg text-murekkep">📅 Tüm Yaklaşan Etkinlikleri Gör</span>
        <span className="text-xs text-kraft">{acik ? '▲ Gizle' : '▼ Göster'}</span>
      </button>

      {acik && (
        <>
          <div className="mb-3 flex justify-end">
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

          <div className="grid gap-3 sm:grid-cols-3">
            {etkinlikler.map((e) => (
              <EtkinlikKarti
                key={e.id}
                e={e}
                oneCikanSayisi={oneCikanSayisi}
                oneCikanMi={oneCikanIdler.has(e.id)}
                onOneCikar={oneCikarTiklandi}
              />
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
        </>
      )}
    </div>
  )
}

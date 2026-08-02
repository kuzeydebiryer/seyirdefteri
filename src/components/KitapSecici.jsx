import { useState } from 'react'
import { kitapAramaSonucundanKaydet, kitapElleEkle } from '../utils/kitapKatalog.js'
import { useAuth } from '../context/AuthContext.jsx'

const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

const DIL_ADLARI = { tr: 'Türkçe', en: 'İngilizce', de: 'Almanca', fr: 'Fransızca', es: 'İspanyolca', it: 'İtalyanca', ru: 'Rusça' }

// Bağımsız kitap arama/seçme bileşeni. GonderiEkle'nin "günce yaz" akışına
// gömülü olan kitap aramasından farklı olarak, herhangi bir formun içine
// (Şu An Okuduğum Kitap, Alıntı Ekle gibi) tek başına yerleştirilebilir —
// kullanıcının önce bir günce yazmasına GEREK KALMADAN istediği kitabı bulup
// seçebilmesi için. Seçilen kitap otomatik olarak dahili kataloğa yazılır
// (henüz kimse günce yazmamış olsa bile).
//
// Arama sonuçlarında yazar + yayınevi + dil gösteriliyor — aksi hâlde aynı
// başlıkta çok sayıda sonuç (farklı dil/baskı) birbirinden ayırt edilemiyordu.
// Aranan kitap Google Books'ta hiç yoksa (özellikle Türkçe baskılarda sık
// karşılaşılan bir durum) "Elle Ekle" formuyla dahili kataloğa direkt yazılabiliyor.
export default function KitapSecici({ onSecim, secili, onTemizle }) {
  const { kullanici } = useAuth()
  const [arama, setArama] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState('')
  const [kaydediliyorId, setKaydediliyorId] = useState(null)

  const [elleEkleAcik, setElleEkleAcik] = useState(false)
  const [elleForm, setElleForm] = useState({ baslik: '', yazar: '', yayinevi: '', yil: '', posterUrl: '' })
  const [elleKaydediliyor, setElleKaydediliyor] = useState(false)

  async function ara(e) {
    e.preventDefault()
    if (!arama.trim()) return
    setYukleniyor(true)
    setHata('')
    try {
      const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(arama)}&maxResults=15${anahtarParcasi}`
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`)
      setSonuclar(data.items || [])
      if ((data.items || []).length === 0) setHata('Sonuç bulunamadı.')
    } catch (err) {
      setHata('Arama sırasında hata: ' + err.message)
    } finally {
      setYukleniyor(false)
    }
  }

  async function sec(item) {
    setKaydediliyorId(item.id)
    try {
      const kitap = await kitapAramaSonucundanKaydet(item)
      onSecim(kitap)
      setSonuclar([])
      setArama('')
    } finally {
      setKaydediliyorId(null)
    }
  }

  function elleEkleyiAc() {
    setElleForm({ baslik: arama, yazar: '', yayinevi: '', yil: '', posterUrl: '' })
    setElleEkleAcik(true)
  }

  async function elleKaydet(e) {
    e.preventDefault()
    if (!elleForm.baslik.trim() || !kullanici) return
    setElleKaydediliyor(true)
    try {
      const kitap = await kitapElleEkle(elleForm, kullanici)
      onSecim(kitap)
      setElleEkleAcik(false)
      setSonuclar([])
      setArama('')
    } finally {
      setElleKaydediliyor(false)
    }
  }

  if (secili) {
    return (
      <div className="flex items-center gap-2 rounded-sm bg-kagit px-2 py-1.5 ring-1 ring-cizgi">
        {secili.posterUrl && <img src={secili.posterUrl} alt={secili.baslik} className="h-10 w-7 rounded-sm object-cover" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-murekkep">{secili.baslik}</p>
          <p className="truncate text-[11px] text-kraft">{secili.yazar}</p>
        </div>
        <button type="button" onClick={onTemizle} className="shrink-0 text-[11px] text-kraft hover:text-muhur">
          Değiştir
        </button>
      </div>
    )
  }

  if (elleEkleAcik) {
    return (
      <form onSubmit={elleKaydet} className="space-y-2 rounded-sm bg-kagit p-2 ring-1 ring-cizgi">
        <p className="text-[11px] uppercase tracking-widest text-gise">Kitabı Elle Ekle</p>
        <input
          value={elleForm.baslik}
          onChange={(e) => setElleForm((f) => ({ ...f, baslik: e.target.value }))}
          placeholder="Başlık *"
          required
          className="w-full rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
        />
        <input
          value={elleForm.yazar}
          onChange={(e) => setElleForm((f) => ({ ...f, yazar: e.target.value }))}
          placeholder="Yazar"
          className="w-full rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
        />
        <div className="flex gap-2">
          <input
            value={elleForm.yayinevi}
            onChange={(e) => setElleForm((f) => ({ ...f, yayinevi: e.target.value }))}
            placeholder="Yayınevi"
            className="flex-1 rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
          />
          <input
            value={elleForm.yil}
            onChange={(e) => setElleForm((f) => ({ ...f, yil: e.target.value }))}
            placeholder="Yıl"
            className="w-20 rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
          />
        </div>
        <input
          value={elleForm.posterUrl}
          onChange={(e) => setElleForm((f) => ({ ...f, posterUrl: e.target.value }))}
          placeholder="Kapak görseli URL'i (opsiyonel)"
          className="w-full rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={elleKaydediliyor || !elleForm.baslik.trim()}
            className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {elleKaydediliyor ? 'Ekleniyor...' : 'Kaydet'}
          </button>
          <button
            type="button"
            onClick={() => setElleEkleAcik(false)}
            className="rounded-sm bg-kagitKoyu px-3 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi"
          >
            Vazgeç
          </button>
        </div>
      </form>
    )
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') ara(e)
          }}
          placeholder="Kitap adı ya da yazar ara..."
          className="flex-1 rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
        />
        <button
          type="button"
          onClick={ara}
          disabled={yukleniyor || !arama.trim()}
          className="rounded-sm bg-kagitKoyu px-3 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi disabled:opacity-40"
        >
          {yukleniyor ? 'Aranıyor...' : 'Ara'}
        </button>
      </div>

      {hata && <p className="mt-2 text-xs text-muhur">{hata}</p>}

      {sonuclar.length > 0 && (
        <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
          {sonuclar.map((item) => {
            const v = item.volumeInfo || {}
            const kapak = (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://')
            const dil = DIL_ADLARI[v.language] || v.language || ''
            const altSatir = [(v.authors || []).join(', '), v.publisher, dil].filter(Boolean).join(' · ')
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => sec(item)}
                  disabled={kaydediliyorId === item.id}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-kagitKoyu disabled:opacity-40"
                >
                  {kapak && <img src={kapak} alt={v.title} className="h-10 w-7 shrink-0 rounded-sm object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-murekkep">{v.title}</p>
                    <p className="truncate text-[11px] text-kraft">{altSatir}</p>
                  </div>
                  {kaydediliyorId === item.id && <span className="text-[11px] text-kraft">Seçiliyor...</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {(sonuclar.length > 0 || hata) && kullanici && (
        <button type="button" onClick={elleEkleyiAc} className="mt-2 text-[11px] text-kraft hover:text-deniz hover:underline">
          Aradığını bulamadın mı? Elle ekle →
        </button>
      )}
    </div>
  )
}

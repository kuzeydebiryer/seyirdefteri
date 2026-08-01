import { useState } from 'react'
import { kitapAramaSonucundanKaydet } from '../utils/kitapKatalog.js'

const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

// Bağımsız kitap arama/seçme bileşeni. GonderiEkle'nin "günce yaz" akışına
// gömülü olan kitap aramasından farklı olarak, herhangi bir formun içine
// (Şu An Okuduğum Kitap, Alıntı Ekle gibi) tek başına yerleştirilebilir —
// kullanıcının önce bir günce yazmasına GEREK KALMADAN istediği kitabı bulup
// seçebilmesi için. Seçilen kitap otomatik olarak dahili kataloğa yazılır
// (henüz kimse günce yazmamış olsa bile).
export default function KitapSecici({ onSecim, secili, onTemizle }) {
  const [arama, setArama] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState('')
  const [kaydediliyorId, setKaydediliyorId] = useState(null)

  async function ara(e) {
    e.preventDefault()
    if (!arama.trim()) return
    setYukleniyor(true)
    setHata('')
    try {
      const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(arama)}&maxResults=10${anahtarParcasi}`
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
                    <p className="truncate text-[11px] text-kraft">{(v.authors || []).join(', ')}</p>
                  </div>
                  {kaydediliyorId === item.id && <span className="text-[11px] text-kraft">Seçiliyor...</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

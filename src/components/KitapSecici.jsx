import { useState } from 'react'
import { kitapAramaSonucundanKaydet, kitapElleEkle } from '../utils/kitapKatalog.js'
import { turkceKitapAra, turkceKitaptanKaydet } from '../utils/turkceKitapVeriTabani.js'
import { useAuth } from '../context/AuthContext.jsx'

const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

// Bağımsız kitap arama/seçme bileşeni. GonderiEkle'nin "günce yaz" akışına
// gömülü olan kitap aramasından farklı olarak, herhangi bir formun içine
// (Şu An Okuduğum Kitap, Alıntı Ekle gibi) tek başına yerleştirilebilir —
// kullanıcının önce bir günce yazmasına GEREK KALMADAN istediği kitabı bulup
// seçebilmesi için. Seçilen kitap otomatik olarak dahili kataloğa yazılır
// (henüz kimse günce yazmamış olsa bile).
//
// Önce Kitapyurdu'ndan derlenmiş 67.000+ kitaplık Türkçe veri tabanımız
// aranıyor, ardından Google Books'a `langRestrict=tr` ile SADECE Türkçe
// sonuçlar için bakılıyor — veri setimiz belli bir tarihte (2025 ortası)
// donduğu için 2026 ve sonrası çıkan kitaplar hiç yok, bu boşluk her yıl
// büyüyecek. Google Books, bu YENİ kitaplar için bir tamamlayıcı/yedek kaynak.
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
      const [trSonuclar, googleData] = await Promise.all([
        turkceKitapAra(arama, 12),
        (async () => {
          const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
          const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(arama)}&langRestrict=tr&maxResults=8${anahtarParcasi}`
          const res = await fetch(url)
          const data = await res.json()
          if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`)
          return data.items || []
        })(),
      ])

      const trNormallesmis = trSonuclar.map((k) => ({
        kaynak: 'tr',
        id: `tr_${k.id}`,
        ham: k,
        ad: k.baslik,
        altSatir: [k.yazar, k.yayinevi, k.yil].filter(Boolean).join(' · '),
        kapak: '',
      }))
      const googleNormallesmis = googleData.map((item) => {
        const v = item.volumeInfo || {}
        return {
          kaynak: 'google',
          id: item.id,
          ham: item,
          ad: v.title,
          altSatir: [(v.authors || []).join(', '), v.publisher, v.publishedDate?.slice(0, 4)].filter(Boolean).join(' · ') + ' · Google Books',
          kapak: (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://'),
        }
      })

      const hepsi = [...trNormallesmis, ...googleNormallesmis]
      setSonuclar(hepsi)
      if (hepsi.length === 0) setHata('Sonuç bulunamadı.')
    } catch (err) {
      setHata('Arama sırasında hata: ' + err.message)
    } finally {
      setYukleniyor(false)
    }
  }

  async function sec(sonuc) {
    setKaydediliyorId(sonuc.id)
    try {
      const kitap = sonuc.kaynak === 'tr' ? await turkceKitaptanKaydet(sonuc.ham) : await kitapAramaSonucundanKaydet(sonuc.ham)
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
          {sonuclar.map((sonuc) => (
            <li key={sonuc.id}>
              <button
                type="button"
                onClick={() => sec(sonuc)}
                disabled={kaydediliyorId === sonuc.id}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-kagitKoyu disabled:opacity-40"
              >
                {sonuc.kapak ? (
                  <img src={sonuc.kapak} alt={sonuc.ad} className="h-10 w-7 shrink-0 rounded-sm object-cover" />
                ) : (
                  <div className="flex h-10 w-7 shrink-0 items-center justify-center rounded-sm bg-kagitKoyu text-[9px] text-kraft">📖</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-murekkep">{sonuc.ad}</p>
                  <p className="truncate text-[11px] text-kraft">{sonuc.altSatir}</p>
                </div>
                {kaydediliyorId === sonuc.id && <span className="text-[11px] text-kraft">Seçiliyor...</span>}
              </button>
            </li>
          ))}
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

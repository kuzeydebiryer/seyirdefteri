import { useState } from 'react'
import { kitapAramaSonucundanKaydet } from '../utils/kitapKatalog.js'
import { turkceKitapAra, turkceKitaptanKaydet } from '../utils/turkceKitapVeriTabani.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w200'
const TMDB_PROFIL = 'https://image.tmdb.org/t/p/w200'

// kategori (Türkçe, formlarda kullanılan) -> arama hedefi eşlemesi.
// 'sinema'/'dizi'/'kisi' değerleri iliskiliLink() ile aynı sözleşmeyi kullanıyor.
const KATEGORI_HEDEF = { Film: 'sinema', Dizi: 'dizi', Kitap: 'kitap', Oyuncu: 'kisi' }

// Film/Dizi/Kitap/Oyuncu'yu arayıp seçmek için kompakt, tek-form bileşen.
// Seçim yapılınca onSecim({ tur, disId, baslik, posterUrl, yil, altBaslik })
// çağrılıyor — kitap için (Türkçe DB veya Google Books) sonuç önce katalog
// kaydına yazılıyor (GonderiEkle'deki akışla aynı), böylece disId her zaman
// /kitap/:id'de çalışan kalıcı bir id oluyor.
export default function EserSecici({ kategori, secili, onSecim, onTemizle }) {
  const [arama, setArama] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState('')
  const [kaydediliyorId, setKaydediliyorId] = useState(null)

  const hedef = KATEGORI_HEDEF[kategori]
  if (!hedef) return null // Gezi/Etkinlik/Sanat için bağlantı arama yok

  async function ara(e) {
    e?.preventDefault()
    if (!arama.trim()) return
    setYukleniyor(true)
    setHata('')
    setSonuclar([])
    try {
      if (hedef === 'sinema' || hedef === 'dizi') {
        if (!TMDB_API_KEY) return setHata('TMDB API anahtarı tanımlı değil.')
        const uc = hedef === 'sinema' ? 'movie' : 'tv'
        const res = await fetch(
          `https://api.themoviedb.org/3/search/${uc}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(arama)}`
        )
        const data = await res.json()
        setSonuclar(data.results || [])
        if (!(data.results || []).length) setHata('Sonuç bulunamadı.')
      } else if (hedef === 'kisi') {
        if (!TMDB_API_KEY) return setHata('TMDB API anahtarı tanımlı değil.')
        const res = await fetch(
          `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(arama)}`
        )
        const data = await res.json()
        const filtreli = (data.results || []).filter((k) => k.known_for_department)
        setSonuclar(filtreli)
        if (!filtreli.length) setHata('Sonuç bulunamadı.')
      } else if (hedef === 'kitap') {
        const [trSonuclar, googleData] = await Promise.all([
          turkceKitapAra(arama, 8),
          (async () => {
            const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
            const res = await fetch(
              `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(arama)}&langRestrict=tr&maxResults=6${anahtarParcasi}`
            )
            const data = await res.json()
            return data.items || []
          })(),
        ])
        const hepsi = [
          ...trSonuclar.map((k) => ({ id: `tr_${k.id}`, kaynak: 'tr', ham: k })),
          ...googleData.map((item) => ({ id: item.id, kaynak: 'google', ham: item })),
        ]
        setSonuclar(hepsi)
        if (!hepsi.length) setHata('Sonuç bulunamadı.')
      }
    } catch (err) {
      setHata('Arama sırasında hata: ' + err.message)
    } finally {
      setYukleniyor(false)
    }
  }

  async function sec(item) {
    if (hedef === 'sinema' || hedef === 'dizi') {
      onSecim({
        tur: hedef,
        disId: String(item.id),
        baslik: item.title || item.name,
        posterUrl: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '',
        yil: (item.release_date || item.first_air_date || '').slice(0, 4),
      })
    } else if (hedef === 'kisi') {
      onSecim({
        tur: 'kisi',
        disId: String(item.id),
        baslik: item.name,
        posterUrl: item.profile_path ? `${TMDB_PROFIL}${item.profile_path}` : '',
        altBaslik: item.known_for_department || '',
      })
    } else if (hedef === 'kitap') {
      const trMi = item.kaynak === 'tr'
      const k = item.ham
      setKaydediliyorId(item.id)
      try {
        const kaydedilen = trMi ? await turkceKitaptanKaydet(k) : await kitapAramaSonucundanKaydet(k)
        const v = trMi ? null : k.volumeInfo || {}
        onSecim({
          tur: 'kitap',
          disId: kaydedilen.id,
          baslik: kaydedilen.baslik || (trMi ? k.baslik : v.title),
          posterUrl: kaydedilen.posterUrl || '',
          yil: kaydedilen.yil || (trMi ? '' : v.publishedDate?.slice(0, 4) || ''),
          altBaslik: kaydedilen.yazar || (trMi ? k.yazar : (v.authors || []).join(', ')),
        })
      } catch (err) {
        setHata('Kitap kaydedilirken hata: ' + err.message)
      } finally {
        setKaydediliyorId(null)
      }
    }
    setSonuclar([])
    setArama('')
  }

  if (secili) {
    return (
      <div className="flex items-center gap-2 rounded-sm bg-kagit p-2 ring-1 ring-cizgi">
        {secili.posterUrl && <img src={secili.posterUrl} alt={secili.baslik} className="h-10 w-7 shrink-0 rounded-sm object-cover" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-murekkep">
            {secili.baslik}
            {secili.yil && <span className="text-kraft"> ({secili.yil})</span>}
          </p>
          {secili.altBaslik && <p className="truncate text-[11px] text-kraft">{secili.altBaslik}</p>}
        </div>
        <button type="button" onClick={onTemizle} className="shrink-0 text-[11px] text-kraft hover:text-muhur">
          Kaldır
        </button>
      </div>
    )
  }

  return (
    <div>
      <label className="mb-1 block text-[11px] text-kraft">
        Bağlantılı {kategori} (opsiyonel)
      </label>
      {/* Not: <form> DEĞİL — bu bileşen her zaman başka bir formun (Seyir
          Panosu paylaşım formu, Meydan Okuma formu vb.) içine yerleştiriliyor.
          İç içe <form> etiketleri HTML'de geçersiz — tarayıcı içteki
          form'u yok sayıyor, "Ara" butonu da dıştaki formu (yanlışlıkla
          "Panoya Ekle"yi) tetikliyordu. Enter tuşu da onKeyDown ile elle
          yakalanıyor, native form submit'e güvenmiyoruz. */}
      <div className="flex gap-2">
        <input
          type="text"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') ara(e)
          }}
          placeholder={`${kategori} ara...`}
          className="flex-1 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
        />
        <button type="button" onClick={ara} disabled={yukleniyor} className="rounded-sm bg-deniz px-3 py-2 font-govde text-xs text-kagit disabled:opacity-40">
          {yukleniyor ? 'Aranıyor...' : 'Ara'}
        </button>
      </div>
      {hata && <p className="mt-1 text-[11px] text-muhur">{hata}</p>}
      {sonuclar.length > 0 && (
        <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-sm bg-kagit p-1.5 ring-1 ring-cizgi">
          {sonuclar.map((item) => {
            const trMi = item.kaynak === 'tr'
            const v = hedef === 'kitap' && !trMi ? item.ham.volumeInfo || {} : null
            const baslik = hedef === 'kitap' ? (trMi ? item.ham.baslik : v.title) : item.title || item.name
            const altBilgi =
              hedef === 'kitap'
                ? trMi
                  ? item.ham.yazar
                  : (v.authors || []).join(', ')
                : hedef === 'kisi'
                ? item.known_for_department
                : (item.release_date || item.first_air_date || '').slice(0, 4)
            const posterUrl =
              hedef === 'kitap'
                ? ''
                : hedef === 'kisi'
                ? item.profile_path
                  ? `${TMDB_PROFIL}${item.profile_path}`
                  : ''
                : item.poster_path
                ? `${TMDB_POSTER}${item.poster_path}`
                : ''
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => sec(item)}
                disabled={kaydediliyorId === item.id}
                className="flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-left hover:bg-kagitKoyu disabled:opacity-50"
              >
                {posterUrl ? (
                  <img src={posterUrl} alt={baslik} className="h-9 w-6 shrink-0 rounded-sm object-cover" />
                ) : (
                  <span className="flex h-9 w-6 shrink-0 items-center justify-center rounded-sm bg-kagitKoyu text-[10px]">
                    {kaydediliyorId === item.id ? '…' : '·'}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs text-murekkep">{baslik}</p>
                  {altBilgi && <p className="truncate text-[10px] text-kraft">{altBilgi}</p>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import Papa from 'papaparse'
import { ogeEkle } from '../utils/kisiselListe.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'

// Letterboxd'un export ettiği CSV'lerde (watchlist.csv, lists.csv, tek bir
// listenin export'u vb.) ortak olan sütunlar: Name, Year, (bazen Position).
// "Letterboxd URI" alanı doğrudan bir TMDB ID'sine dönüşmüyor (bunu araştırdık),
// bu yüzden her satırı isim+yıl ile TMDB'de arayıp EN İYİ eşleşmeyi buluyoruz —
// ama otomatik eklemek yerine kullanıcıya önce önizletip onaylatıyoruz, çünkü
// aynı isimli farklı yıl filmleri / remake'ler yanlış eşleşebilir.

// Letterboxd'un "Export list" çıktısı tek başlıklı düz bir CSV DEĞİL — iki bölümlü:
//   satır 1: "Letterboxd list export v7" (biçim etiketi)
//   satır 2-3: listenin kendi bilgileri (Date,Name,Tags,URL,Description + değerleri)
//   boş satır
//   sonraki satır: asıl film tablosunun başlığı (Position,Name,Year,URL,Description)
//   sonrasında: film satırları
// Bu yüzden header:true ile doğrudan ayrıştırmak yanlış sütunlara denk gelir.
// Bunun yerine tüm satırları ham hâliyle alıp, "Name" VE "Year" sütunlarını birlikte
// içeren satırı bulup asıl film tablosunun başladığı yeri buluyoruz. Bu, hem bu
// iki bölümlü liste export'unu hem de watchlist.csv gibi tek başlıklı, basit
// dosyaları aynı anda destekler.
function filmSatirlariniAyikla(satirlar) {
  const baslikIndeksi = satirlar.findIndex((satir) => {
    const kucukHarfli = satir.map((h) => (h || '').trim().toLowerCase())
    return kucukHarfli.includes('name') && kucukHarfli.includes('year')
  })
  if (baslikIndeksi === -1) return []

  const baslik = satirlar[baslikIndeksi].map((h) => h.trim().toLowerCase())
  const isimSutunu = baslik.indexOf('name')
  const yilSutunu = baslik.indexOf('year')

  return satirlar
    .slice(baslikIndeksi + 1)
    .map((satir) => ({ isim: (satir[isimSutunu] || '').trim(), yil: (satir[yilSutunu] || '').trim() }))
    .filter((s) => s.isim)
}

async function tmdbdeAra(isim, yil) {
  if (!TMDB_API_KEY) return null
  const yilParcasi = yil ? `&year=${yil}` : ''
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(isim)}${yilParcasi}`
  try {
    const res = await fetch(url)
    const data = await res.json()
    return data.results?.[0] || null
  } catch {
    return null
  }
}

export default function LetterboxdIceAktar({ liste, onTamamlandi }) {
  const [dosyaAdi, setDosyaAdi] = useState('')
  const [satirlar, setSatirlar] = useState([]) // { isim, yil, secili, eslesme, aranıyor }
  const [eslestiriliyor, setEslestiriliyor] = useState(false)
  const [ilerleme, setIlerleme] = useState(0)
  const [iceAktariliyor, setIceAktariliyor] = useState(false)
  const [hata, setHata] = useState('')

  function dosyaSecildi(e) {
    const dosya = e.target.files?.[0]
    if (!dosya) return
    setDosyaAdi(dosya.name)
    setHata('')
    setSatirlar([])

    Papa.parse(dosya, {
      header: false,
      skipEmptyLines: true,
      complete: async (sonuc) => {
        const ham = filmSatirlariniAyikla(sonuc.data)

        if (ham.length === 0) {
          setHata('CSV içinde "Name"/"Year" sütunlarını içeren bir tablo bulunamadı. Letterboxd export dosyasını değiştirmeden yükle.')
          return
        }
        if (!TMDB_API_KEY) {
          setHata('TMDB API anahtarı tanımlı değil, eşleştirme yapılamıyor.')
          return
        }

        setEslestiriliyor(true)
        setIlerleme(0)
        const eslestirilmis = []
        for (const [i, satir] of ham.entries()) {
          const bulunan = await tmdbdeAra(satir.isim, satir.yil)
          eslestirilmis.push({
            ...satir,
            eslesme: bulunan
              ? {
                  tmdbId: bulunan.id,
                  baslik: bulunan.title,
                  yil: bulunan.release_date ? bulunan.release_date.slice(0, 4) : satir.yil,
                  posterUrl: bulunan.poster_path ? `${TMDB_POSTER}${bulunan.poster_path}` : '',
                }
              : null,
            secili: !!bulunan,
          })
          setIlerleme(i + 1)
        }
        setSatirlar(eslestirilmis)
        setEslestiriliyor(false)
      },
      error: () => setHata('CSV dosyası okunamadı.'),
    })
  }

  function secimDegistir(i) {
    setSatirlar((liste) => liste.map((s, idx) => (idx === i ? { ...s, secili: !s.secili } : s)))
  }

  async function iceAktar() {
    const secilenler = satirlar.filter((s) => s.secili && s.eslesme)
    if (secilenler.length === 0) return
    setIceAktariliyor(true)
    setIlerleme(0)
    let sonrakiSira = liste.ogeSayisi || 0
    for (const [i, s] of secilenler.entries()) {
      await ogeEkle(
        { ...liste, ogeSayisi: sonrakiSira },
        {
          tur: 'sinema',
          disId: s.eslesme.tmdbId,
          baslik: s.eslesme.baslik,
          alt: s.eslesme.yil,
          posterUrl: s.eslesme.posterUrl,
        }
      )
      sonrakiSira += 1
      setIlerleme(i + 1)
    }
    setIceAktariliyor(false)
    onTamamlandi()
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-kraft">
        Letterboxd'da bir listeyi ya da izleme listesini CSV olarak dışa aktarıp buraya yükle. Her satır TMDB'de
        aranır; eşleşmeyenler ya da yanlış eşleşenler işaretini kaldırarak dışarıda bırakabilirsin. Büyük listelerde
        (100+ film) eşleştirme birkaç dakika sürebilir, sekmeyi kapatma.
      </p>

      <input
        type="file"
        accept=".csv"
        onChange={dosyaSecildi}
        disabled={eslestiriliyor || iceAktariliyor}
        className="w-full rounded-sm bg-kagit px-3 py-2 text-xs text-murekkep ring-1 ring-cizgi"
      />
      {dosyaAdi && <p className="text-[11px] text-kraft">{dosyaAdi}</p>}
      {hata && <p className="text-xs text-muhur">{hata}</p>}

      {eslestiriliyor && (
        <p className="text-xs text-kraft">
          Eşleştiriliyor... {ilerleme}/{satirlar.length || '?'}
        </p>
      )}

      {!eslestiriliyor && satirlar.length > 0 && (
        <>
          <p className="text-xs text-kraft">
            {satirlar.filter((s) => s.eslesme).length}/{satirlar.length} eşleşti. İçe aktarmadan önce kontrol et:
          </p>
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {satirlar.map((s, i) => (
              <li
                key={i}
                className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs ${s.eslesme ? '' : 'opacity-50'}`}
              >
                <input
                  type="checkbox"
                  checked={s.secili}
                  onChange={() => secimDegistir(i)}
                  disabled={!s.eslesme}
                  className="shrink-0"
                />
                {s.eslesme?.posterUrl && (
                  <img src={s.eslesme.posterUrl} alt="" className="h-10 w-7 shrink-0 rounded-sm object-cover" />
                )}
                <span className="min-w-0 flex-1 truncate text-murekkep">
                  {s.isim} {s.yil && `(${s.yil})`}
                </span>
                {!s.eslesme && <span className="shrink-0 text-muhur">Eşleşme yok</span>}
              </li>
            ))}
          </ul>

          <button
            onClick={iceAktar}
            disabled={iceAktariliyor || satirlar.every((s) => !s.secili)}
            className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {iceAktariliyor
              ? `İçe aktarılıyor... ${ilerleme}/${satirlar.filter((s) => s.secili).length}`
              : `Seçilenleri İçe Aktar (${satirlar.filter((s) => s.secili).length})`}
          </button>
        </>
      )}
    </div>
  )
}

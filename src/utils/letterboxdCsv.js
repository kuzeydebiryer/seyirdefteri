// Letterboxd CSV'lerini ayrıştırma + TMDB eşleştirme için ortak mantık.
// Hem liste içe aktarma (LetterboxdIceAktar.jsx) hem puan içe aktarma
// (PuanIceAktar.jsx) burayı kullanır — kopya kod yerine tek yer.

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
export const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'

// Letterboxd'un "Export list" çıktısı iki bölümlü (önce listenin kendi bilgileri,
// sonra ayrı bir başlıkla asıl film tablosu); ratings.csv/watchlist.csv/diary.csv
// gibi dosyalar ise tek başlıklı düz tablo. İkisini de aynı şekilde ele almak için
// "Name" VE "Year" sütunlarını birlikte içeren satırı bulup asıl tablonun başladığı
// yeri tespit ediyoruz. "Rating" sütunu varsa (ratings.csv/diary.csv) onu da alıyoruz.
// "Watched Date"/"Date" sütunu varsa (ratings.csv, diary.csv, watched.csv) gerçek
// izleme tarihini de alıyoruz — bu olmadan içe aktarılan her satır "bugün izlendi"
// gibi görünüyordu (Yılın Özeti'ndeki köke ilişkin hataya bakınız). "Rewatch"
// sütunu (sadece diary.csv'de) varsa yeniden izleme işaretini de alıyoruz.
export function filmSatirlariniAyikla(satirlar) {
  const baslikIndeksi = satirlar.findIndex((satir) => {
    const kucukHarfli = satir.map((h) => (h || '').trim().toLowerCase())
    return kucukHarfli.includes('name') && kucukHarfli.includes('year')
  })
  if (baslikIndeksi === -1) return []

  const baslik = satirlar[baslikIndeksi].map((h) => h.trim().toLowerCase())
  const isimSutunu = baslik.indexOf('name')
  const yilSutunu = baslik.indexOf('year')
  const puanSutunu = baslik.indexOf('rating')
  const tarihSutunu = baslik.includes('watched date') ? baslik.indexOf('watched date') : baslik.indexOf('date')
  const tekrarSutunu = baslik.indexOf('rewatch')

  return satirlar
    .slice(baslikIndeksi + 1)
    .map((satir) => ({
      isim: (satir[isimSutunu] || '').trim(),
      yil: (satir[yilSutunu] || '').trim(),
      puan: puanSutunu !== -1 ? (satir[puanSutunu] || '').trim() : '',
      izlemeTarihi: tarihSutunu !== -1 ? (satir[tarihSutunu] || '').trim() : '',
      tekrarMi: tekrarSutunu !== -1 && (satir[tekrarSutunu] || '').trim().toLowerCase() === 'yes',
    }))
    .filter((s) => s.isim)
}

export async function tmdbdeAra(isim, yil) {
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

// Basit bir eş zamanlılık havuzu: yüzlerce/binlerce satırı teker teker (yavaş)
// değil, aynı anda `esZamanlilik` kadarını işleyerek yürütür. 3000+ satırlık
// bir ratings.csv'de bu, ~20 dakikayı ~2-3 dakikaya indiriyor.
export async function esZamanliIsle(ogeler, isleyici, esZamanlilik, ilerlemeGuncelle) {
  let sonrakiIndeks = 0
  let tamamlanan = 0
  const sonuclar = new Array(ogeler.length)

  async function isci() {
    while (sonrakiIndeks < ogeler.length) {
      const i = sonrakiIndeks++
      sonuclar[i] = await isleyici(ogeler[i], i)
      tamamlanan++
      ilerlemeGuncelle(tamamlanan, ogeler.length)
    }
  }

  await Promise.all(Array.from({ length: Math.min(esZamanlilik, ogeler.length) }, isci))
  return sonuclar
}

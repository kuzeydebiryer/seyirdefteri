// 🔄 Oscar "Listeyi Güncelle": tahmin sitelerinden (oscarboy vb.) kopyalanan numaralı listeyi
// mevcut sezonla EŞİTLER — kalanlar korunur (kulübün tahminleri bozulmaz), yeniler eklenir,
// listeden düşenler çıkarılır. Önce önizleme hesaplanır, onaydan sonra uygulanır.
//
// Desteklenen biçim (boş satır gerekmez; satır başındaki görünmez karakterler temizlenir):
//   En İyi Film
//   1. The Odyssey
//   En İyi Yönetmen
//   1. Christopher Nolan – The Odyssey          ← oyuncu/yönetmen: "Kişi – Film"
//   En İyi Özgün Senaryo
//   1. Wild Horse Nine – Martin McDonagh        ← diğerleri: "Film – etiket" (kişi, şarkı, ülke)

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'
const TMDB_PROFIL = 'https://image.tmdb.org/t/p/w300'

export function normal(s) {
  return (s || '')
    .replace(/[​-‍﻿]/g, '')
    .toLocaleLowerCase('tr-TR')
    .replace(/&/g, ' ve ')
    .replace(/[ıİ]/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Oyunculuk ve yönetmenlik kategorilerinde aday KİŞİDİR ("Kişi – Film").
export const kisiBirincilMi = (kategoriAdi) => /oyuncu|yonetmen\b|yonetmenlik|actor|actress|director\b|directing/.test(normal(kategoriAdi))

const temizle = (s) =>
  (s || '')
    .replace(/[​-‍﻿]/g, '')
    .replace(/^[*\-•]\s*/, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .trim()

export function satirCoz(satir, kisiBirincil) {
  const parca = satir.split(/\s+[–—-]\s+/)
  const sol = parca[0].trim()
  const sag = parca.slice(1).join(' – ').trim()
  if (kisiBirincil) return { kisiAdi: sol, filmAdi: sag, etiket: '' }
  return { kisiAdi: '', filmAdi: sol, etiket: sag.replace(/^[“"']+|[”"']+$/g, '') }
}

// Numaralı biçim (1. … / 1) …) ya da eski boş-satırlı blok biçimi.
export function listeyiCoz(metin) {
  const satirlar = metin.split('\n').map(temizle).filter(Boolean)
  const numarali = satirlar.filter((s) => /^\d+[.)]\s+\S/.test(s)).length >= 2
  const kategoriler = []
  if (numarali) {
    let su = null
    for (const s of satirlar) {
      const m = s.match(/^\d+[.)]\s+(.+)$/)
      if (m) {
        if (su) su.satirlar.push(m[1].trim())
      } else {
        su = { ad: s, satirlar: [] }
        kategoriler.push(su)
      }
    }
  } else {
    metin
      .split(/\n\s*\n/)
      .map((b) => b.split('\n').map(temizle).filter(Boolean))
      .filter((b) => b.length > 1)
      .forEach(([ad, ...ss]) => kategoriler.push({ ad, satirlar: ss }))
  }
  return kategoriler
    .filter((k) => k.satirlar.length > 0)
    .map((k) => {
      const kb = kisiBirincilMi(k.ad)
      return { ad: k.ad, kisiBirincil: kb, adaylar: k.satirlar.map((s) => satirCoz(s, kb)) }
    })
}

// --- TMDB eşleme (önbellekli) ---
const filmOnbellek = new Map()
const kisiOnbellek = new Map()

export async function filmBul(ad, tur = 'film', torenYili = null) {
  if (!ad || !TMDB_API_KEY) return null
  const anahtar = `${tur}|${normal(ad)}|${torenYili}`
  if (filmOnbellek.has(anahtar)) return filmOnbellek.get(anahtar)
  const uc = tur === 'dizi' ? 'tv' : 'movie'
  const sorgu = ad.replace(/\s*\([^)]*\)\s*$/, '').trim()
  const istek = fetch(`https://api.themoviedb.org/3/search/${uc}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(sorgu)}`)
    .then((r) => r.json())
    .then((d) => {
      const sonuc = d.results || []
      const yil = (x) => Number((x.release_date || x.first_air_date || '').slice(0, 4)) || null
      // Aynı adlı eski filmler (The Odyssey, Wuthering Heights…) karışmasın: tören yılına yakın olanı seç.
      const uygun = torenYili ? sonuc.find((x) => !yil(x) || (yil(x) >= torenYili - 2 && yil(x) <= torenYili)) : null
      const f = uygun || sonuc[0]
      if (!f) return null
      return {
        tmdbId: f.id,
        filmBasligi: f.title || f.name || ad,
        filmYili: String(yil(f) || ''),
        posterUrl: f.poster_path ? `${TMDB_POSTER}${f.poster_path}` : '',
      }
    })
    .catch(() => null)
  filmOnbellek.set(anahtar, istek)
  return istek
}

export async function kisiBul(ad) {
  if (!ad || !TMDB_API_KEY) return null
  const anahtar = normal(ad)
  if (kisiOnbellek.has(anahtar)) return kisiOnbellek.get(anahtar)
  const istek = fetch(`https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(ad)}`)
    .then((r) => r.json())
    .then((d) => {
      const k = d.results?.[0]
      return k ? { kisiTmdbId: k.id, kisiAdi: k.name, kisiFotoUrl: k.profile_path ? `${TMDB_PROFIL}${k.profile_path}` : '' } : null
    })
    .catch(() => null)
  kisiOnbellek.set(anahtar, istek)
  return istek
}

// Yapıştırılan bir adayı TMDB'de çözer → oscarAdaylari'na yazılacak alanlar.
export async function adayiCoz(aday, kisiBirincil, tur, torenYili) {
  const [film, kisi] = await Promise.all([
    aday.filmAdi ? filmBul(aday.filmAdi, tur, torenYili) : Promise.resolve(null),
    kisiBirincil && aday.kisiAdi
      ? kisiBul(aday.kisiAdi).then((k) => k || kisiBul(aday.kisiAdi.split(/\s*(?:&|,| ve | and )\s*/)[0]))
      : Promise.resolve(null),
  ])
  // "Nathan Fielder & Lance Oppenheim" gibi ortak adaylıklarda ad tam haliyle kalsın.
  const cokluKisi = /&|,| ve | and /.test(aday.kisiAdi || '')
  return {
    ham: aday,
    filmBulundu: !!film,
    kisiBulundu: !kisiBirincil || !!kisi,
    alanlar: {
      tmdbId: film?.tmdbId ?? null,
      tur,
      filmBasligi: film?.filmBasligi || aday.filmAdi,
      filmYili: film?.filmYili || '',
      posterUrl: film?.posterUrl || '',
      kisiAdi: kisiBirincil ? (cokluKisi ? aday.kisiAdi : kisi?.kisiAdi || aday.kisiAdi) : aday.etiket,
      kisiTmdbId: kisiBirincil ? kisi?.kisiTmdbId ?? null : null,
      kisiFotoUrl: kisiBirincil ? kisi?.kisiFotoUrl || '' : '',
    },
  }
}

// Yeni aday mevcut adaylardan hangisine denk? (önce TMDB kimliği, sonra ad)
export function eslesenMevcut(cozulen, mevcutlar, kisiBirincil, kullanilan) {
  const y = cozulen.alanlar
  const adayMi = (a) => {
    if (kullanilan.has(a.id)) return false
    if (kisiBirincil) {
      const kisiAyni = (y.kisiTmdbId && a.kisiTmdbId && y.kisiTmdbId === a.kisiTmdbId) || (normal(a.kisiAdi) && normal(a.kisiAdi) === normal(y.kisiAdi))
      return kisiAyni
    }
    return (
      (y.tmdbId && a.tmdbId && String(y.tmdbId) === String(a.tmdbId)) ||
      normal(a.filmBasligi) === normal(y.filmBasligi) ||
      normal(a.filmBasligi) === normal(cozulen.ham.filmAdi)
    )
  }
  return mevcutlar.find(adayMi) || null
}

// Yapıştırılan kategori adını mevcut kategorilerden biriyle eşle (yoksa null = yeni).
export function kategoriEsle(ad, mevcutKategoriler) {
  const n = normal(ad)
  return mevcutKategoriler.find((k) => normal(k.ad) === n) || null
}

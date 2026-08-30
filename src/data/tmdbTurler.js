// TMDB'nin arama uç noktası (/search/movie) sadece genre_ids (sayısal) döndürür,
// isim değil — isim almak için ayrı bir istek gerekir. Bu liste sabit ve
// herkese açık olduğu için (TMDB'nin resmi tr-TR janr çevirileri) burada
// sabit tutup ekstra bir API isteğine gerek bırakmıyoruz.
export const TMDB_FILM_TURLERI = {
  28: 'Aksiyon',
  12: 'Macera',
  16: 'Animasyon',
  35: 'Komedi',
  80: 'Suç',
  99: 'Belgesel',
  18: 'Dram',
  10751: 'Aile',
  14: 'Fantastik',
  36: 'Tarih',
  27: 'Korku',
  10402: 'Müzik',
  9648: 'Gizem',
  10749: 'Romantik',
  878: 'Bilim Kurgu',
  10770: 'TV Filmi',
  53: 'Gerilim',
  10752: 'Savaş',
  37: 'Vahşi Batı',
}

export function turIsimleriGetir(genreIds) {
  return (genreIds || [])
    .map((id) => TMDB_FILM_TURLERI[id])
    .filter(Boolean)
    .join(', ')
}

// TMDB'nin dizi (tv) tür listesi FİLMDEN FARKLI — bazı ID'ler bile
// çakışıyor ama farklı anlama geliyor (ör. film 12=Macera, dizi 10759=
// Aksiyon&Macera). Not: TV listesinde "Korku" diye bir kategori YOK —
// Sinemasal Alt Türler'de dizi aramalarının tür kısıtı olmadan sadece
// anahtar kelimeyle çalışmasının sebebi bu (bkz. sinemaTurleri.js).
export const TMDB_DIZI_TURLERI = {
  10759: 'Aksiyon & Macera',
  16: 'Animasyon',
  35: 'Komedi',
  80: 'Suç',
  99: 'Belgesel',
  18: 'Dram',
  10751: 'Aile',
  10762: 'Çocuk',
  9648: 'Gizem',
  10763: 'Haber',
  10764: 'Reality',
  10765: 'Bilim Kurgu & Fantastik',
  10766: 'Pembe Dizi',
  10767: 'Talk Show',
  10768: 'Savaş & Politika',
  37: 'Vahşi Batı',
}


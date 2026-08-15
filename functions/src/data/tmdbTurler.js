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

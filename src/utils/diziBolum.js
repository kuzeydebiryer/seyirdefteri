const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY

// TMDB'nin dizi detayında hazır tuttuğu next_episode_to_air alanı — düzenli,
// güvenilir bir veri (topluluk tarafından isteğe bağlı girilen "dijital
// tarih" gibi seyrek değil, TMDB'nin kendi yayın takvimi takibi).
export async function sonrakiBolumBilgisiGetir(tmdbId) {
  if (!TMDB_API_KEY) return null
  try {
    const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`)
    if (!res.ok) return null
    const data = await res.json()
    const bolum = data.next_episode_to_air
    if (!bolum?.air_date) return null
    return {
      tarih: bolum.air_date,
      sezonNo: bolum.season_number,
      bolumNo: bolum.episode_number,
      bolumAdi: bolum.name || '',
    }
  } catch {
    return null
  }
}

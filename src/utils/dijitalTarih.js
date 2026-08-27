const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY

// TMDB'nin release_dates uç noktasındaki "type: 4" (Dijital) tarihi arıyor —
// bu, topluluk tarafından isteğe bağlı girilen bir veri, çoğu filmde
// (özellikle henüz çıkmamışlarda) BOŞ olabilir. Bulunursa bir kolaylık,
// bulunamazsa kullanıcı elle girmeye devam eder — bu yüzden çağıran taraf
// null dönüşünü sessizce (hatasız) karşılamalı.
export async function dijitalTarihGetir(tmdbId) {
  if (!TMDB_API_KEY) return null
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/release_dates?api_key=${TMDB_API_KEY}`)
    if (!res.ok) return null
    const data = await res.json()
    const bolgeler = data.results || []
    // Önce Türkiye'ye bakılıyor, yoksa ABD'ye (dijital tarih verisi en çok
    // ABD için giriliyor) — ikisi de yoksa null dönüyor, kullanıcı elle girer.
    for (const kod of ['TR', 'US']) {
      const bolge = bolgeler.find((b) => b.iso_3166_1 === kod)
      const dijital = bolge?.release_dates?.find((r) => r.type === 4 && r.release_date)
      if (dijital) return { tarih: dijital.release_date.slice(0, 10), platformNotu: dijital.note || '' }
    }
    return null
  } catch {
    return null
  }
}

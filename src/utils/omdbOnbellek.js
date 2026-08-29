// OMDb'nin ücretsiz katmanı günlük ~1000 istekle sınırlı — film/dizi arama
// sonuçlarında (her sonuç için ayrı istek) ve detay sayfalarında bu kota
// hızla tükenebiliyordu, tükenince IMDb puanları o gün boyunca sessizce
// kaybolur. IMDb puanı günler içinde çok az değiştiği için (embed
// önbelleğinden farklı olarak — "sonraki bölüm" gibi taze kalması gereken
// bir veri DEĞİL) 7 günlük bir önbellek güvenli. imdbId'ye göre
// anahtarlanıyor — hem arama sonuçları hem detay sayfası AYNI önbelleği
// paylaşıyor, biri diğerinin işini tekrar etmiyor.
const BELLEK_ONBELLEK = new Map()
const DEPOLAMA_ANAHTARI_ONEKI = 'omdb_onbellek_'
const GECERLILIK_SURESI_MS = 7 * 24 * 60 * 60 * 1000 // 7 gün

export function omdbOnbellektenOku(imdbId) {
  if (BELLEK_ONBELLEK.has(imdbId)) return BELLEK_ONBELLEK.get(imdbId)
  try {
    const ham = localStorage.getItem(DEPOLAMA_ANAHTARI_ONEKI + imdbId)
    if (!ham) return undefined
    const { veri, zaman } = JSON.parse(ham)
    if (Date.now() - zaman > GECERLILIK_SURESI_MS) return undefined
    BELLEK_ONBELLEK.set(imdbId, veri)
    return veri
  } catch {
    return undefined
  }
}

export function omdbOnbellegeYaz(imdbId, veri) {
  if (!veri) return
  BELLEK_ONBELLEK.set(imdbId, veri)
  try {
    localStorage.setItem(DEPOLAMA_ANAHTARI_ONEKI + imdbId, JSON.stringify({ veri, zaman: Date.now() }))
  } catch {
    // localStorage dolu/kapalı olabilir — sessizce geç, bellek içi önbellek zaten çalışıyor
  }
}

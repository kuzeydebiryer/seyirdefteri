// Etkinlik.io V2 API — Yayıncı Ağı onaylı erişim. Token, .env'de
// VITE_ETKINLIK_IO_TOKEN olarak tanımlı olmalı (Vercel'de de ortam değişkeni
// olarak eklenmesi gerekiyor, TMDB/Google Books anahtarlarıyla aynı yöntem).
//
// ÖNEMLİ: Bu API'nin tarayıcıdan (CORS) doğrudan çağrılabildiği HENÜZ
// doğrulanmadı — sadece sunucu taraflı erişim (benim testlerim) CORS
// kısıtlamasına tabi değil, bu yüzden bir şey ifade etmiyor. Gerçek test
// ancak deploy edilmiş sitede, gerçek bir tarayıcıda yapılabilir.

const TOKEN = import.meta.env.VITE_ETKINLIK_IO_TOKEN
const BASE = 'https://etkinlik.io/api/v2'

export async function etkinlikleriGetir({ kategori, sehir, sayfa = 1 } = {}) {
  if (!TOKEN) {
    return { hata: 'VITE_ETKINLIK_IO_TOKEN tanımlı değil.' }
  }
  const params = new URLSearchParams({ page: String(sayfa) })
  if (kategori) params.set('category', kategori)
  if (sehir) params.set('city', sehir)

  try {
    const res = await fetch(`${BASE}/events?${params.toString()}`, {
      headers: { 'X-Etkinlik-Token': TOKEN },
    })
    if (!res.ok) {
      return { hata: `HTTP ${res.status} — ${res.statusText}` }
    }
    const data = await res.json()
    return { veri: data }
  } catch (err) {
    // Tarayıcıda CORS engellenirse genelde burada "Failed to fetch" gibi
    // belirsiz bir hata yakalanır — bu, asıl aradığımız test sonucu.
    return { hata: 'İstek başarısız: ' + err.message + ' (CORS engeli olabilir)' }
  }
}

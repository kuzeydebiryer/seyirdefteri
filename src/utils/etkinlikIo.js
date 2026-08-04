// Etkinlik.io V2 API — Yayıncı Ağı onaylı erişim. Token, .env'de
// VITE_ETKINLIK_IO_TOKEN olarak tanımlı (Vercel'de de ortam değişkeni olarak
// eklendi). CORS canlıda test edildi ve ÇALIŞIYOR — tarayıcıdan doğrudan
// çağrılabiliyor, sunucu tarafı bir proxy'e gerek yok.

const TOKEN = import.meta.env.VITE_ETKINLIK_IO_TOKEN
const BASE = 'https://etkinlik.io/api/v2'

async function istek(yol, params = {}) {
  if (!TOKEN) return { hata: 'VITE_ETKINLIK_IO_TOKEN tanımlı değil.' }
  const q = new URLSearchParams(params)
  try {
    const res = await fetch(`${BASE}${yol}?${q.toString()}`, { headers: { 'X-Etkinlik-Token': TOKEN } })
    if (!res.ok) return { hata: `HTTP ${res.status} — ${res.statusText}` }
    const data = await res.json()
    return { veri: data }
  } catch (err) {
    return { hata: 'İstek başarısız: ' + err.message }
  }
}

// İçerikte HTML işaretleme geliyor (ör. <p>, <br>) — güvenli göstermek için
// düz metne çeviriyoruz, dangerouslySetInnerHTML kullanmıyoruz.
function htmlTemizle(metin) {
  if (!metin) return ''
  return metin
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function etkinlikleriGetir({ kategori, sehir, sayfa = 1 } = {}) {
  const params = { page: String(sayfa) }
  if (kategori) params.category = kategori
  if (sehir) params.city = sehir
  const { veri, hata } = await istek('/events', params)
  if (hata) return { hata }
  const liste = veri?.data || veri?.items || []
  const toplamSayfa = veri?.pagination?.total_pages || veri?.meta?.total_pages || 1
  return {
    etkinlikler: liste.map((e) => ({
      id: e.id,
      baslik: e.name,
      icerikKisa: htmlTemizle(e.content).slice(0, 220),
      baslangic: e.start,
      bitis: e.end,
      url: e.url,
      gorselUrl: e.image || e.image_url || e.cover_image || '',
      sehir: e.city?.name || e.venue?.city?.name || '',
      mekan: e.venue?.name || '',
    })),
    toplamSayfa,
  }
}

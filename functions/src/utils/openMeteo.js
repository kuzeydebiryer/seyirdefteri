// Open-Meteo — anahtar gerektirmez, CORS açık, 1940'a kadar geçmiş hava durumu
// arşivi var. Gezi güncelerinde zaten geocode edilmiş enlem/boylem + tarih
// aralığı kaydedildiği için, "o günlerin havası nasıldı" bilgisini ekstra bir
// veri girişi olmadan gösterebiliyoruz.

const ARSIV_BASE = 'https://archive-api.open-meteo.com/v1/archive'

export async function geziHavaDurumuGetir(enlem, boylem, baslangicTarihi, bitisTarihi) {
  if (!enlem || !boylem || !baslangicTarihi) return null
  const bitis = bitisTarihi || baslangicTarihi
  try {
    const url = `${ARSIV_BASE}?latitude=${enlem}&longitude=${boylem}&start_date=${baslangicTarihi}&end_date=${bitis}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.daily?.time?.length) return null

    const maksimumlar = data.daily.temperature_2m_max.filter((v) => v != null)
    const minimumlar = data.daily.temperature_2m_min.filter((v) => v != null)
    const yagisliGunSayisi = (data.daily.precipitation_sum || []).filter((v) => v != null && v > 0.5).length
    if (maksimumlar.length === 0) return null

    return {
      enYuksek: Math.max(...maksimumlar),
      enDusuk: Math.min(...minimumlar),
      yagisliGunSayisi,
      toplamGun: data.daily.time.length,
    }
  } catch {
    return null
  }
}

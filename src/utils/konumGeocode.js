// OpenStreetMap Nominatim'in ücretsiz herkese açık API'si — küçük bir
// topluluk için (kişi başı, sadece gezi/mekan eklerken) sorun olmaz.
// GonderiEkle (gezi günceleri) ve İlham Panosu (Gezi kategorisi) aynı
// fonksiyonu paylaşıyor.
export async function konumGeocodeEt(mekan, ulkeAdi) {
  if (!mekan?.trim()) return null
  try {
    const sorgu = ulkeAdi ? `${mekan}, ${ulkeAdi}` : mekan
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(sorgu)}&format=json&limit=1`)
    const data = await res.json()
    if (!data?.[0]) return null
    return { enlem: Number(data[0].lat), boylem: Number(data[0].lon) }
  } catch (err) {
    console.warn('Konum bulunamadı:', err.message)
    return null
  }
}

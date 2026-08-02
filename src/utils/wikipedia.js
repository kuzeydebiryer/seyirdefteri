// Wikipedia (tr) Özet API'si — anahtar gerektirmez, CORS açık. Gezi
// güncesindeki "konum" metniyle eşleşen bir madde varsa kısa bir özet +
// görsel gösteriyoruz. Eşleşme yoksa (çoğu küçük yer/mahalle için olur)
// sessizce hiçbir şey göstermiyoruz.

export async function yerOzetiGetir(yer) {
  if (!yer) return null
  try {
    const res = await fetch(`https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(yer)}`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.type === 'disambiguation') return null
    return {
      baslik: data.title,
      ozet: data.extract || '',
      gorselUrl: data.thumbnail?.source || '',
      link: data.content_urls?.desktop?.page || `https://tr.wikipedia.org/wiki/${encodeURIComponent(yer)}`,
    }
  } catch {
    return null
  }
}

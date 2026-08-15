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

// Yazar Sayfası gibi daha ayrıntılı biyografi gerektiren yerler için — Özet
// API'si (yerOzetiGetir) sadece makalenin İLK CÜMLESİNİ döndürüyor, birçok
// yazar maddesinde bu tek cümleyle sınırlı kalıyordu. Bu fonksiyon, MediaWiki
// Action API'sinin `explaintext` parametresiyle makalenin TAMAMINI düz metin
// olarak çekiyor — hâlâ anahtarsız, hâlâ CORS'a açık (origin=* parametresiyle).
export async function yazarBiyografisiGetir(yazarAdi) {
  if (!yazarAdi) return null
  try {
    const url = `https://tr.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=extracts|pageimages&exlimit=1&explaintext=1&piprop=thumbnail&pithumbsize=300&titles=${encodeURIComponent(yazarAdi)}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const sayfalar = data.query?.pages
    if (!sayfalar) return null
    const sayfa = Object.values(sayfalar)[0]
    if (!sayfa || sayfa.missing !== undefined || !sayfa.extract) return null
    return {
      baslik: sayfa.title,
      tamMetin: sayfa.extract,
      gorselUrl: sayfa.thumbnail?.source || '',
      link: `https://tr.wikipedia.org/wiki/${encodeURIComponent(sayfa.title)}`,
    }
  } catch {
    return null
  }
}

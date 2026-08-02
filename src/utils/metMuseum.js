// The Metropolitan Museum of Art — Açık Erişim API'si. API anahtarı gerektirmez,
// CORS'u açık (tarayıcıdan doğrudan çağrılabiliyor — Türkiye'deki bilet/etkinlik
// API'lerinde yaşadığımız sorunun aksine). Görsellerin büyük kısmı kamu malı
// (isPublicDomain) olarak işaretli, bu yüzden doğrudan gösterebiliyoruz.

const MET_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1'

// Günün Eseri için — her seferinde farklı bir anahtar kelimeyle "öne çıkan"
// (isHighlight) eserler arasından rastgele biri seçiliyor, böylece hep aynı
// birkaç eser tekrar etmiyor.
const RASTGELE_ANAHTAR_KELIMELER = ['portrait', 'landscape', 'flowers', 'sculpture', 'still life', 'garden', 'ottoman', 'ceramic']

export async function eserDetayGetir(objectID) {
  try {
    const res = await fetch(`${MET_BASE}/objects/${objectID}`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.primaryImageSmall) return null
    return data
  } catch {
    return null
  }
}

export async function sanatEseriAra(sorgu) {
  const url = `${MET_BASE}/search?hasImages=true&q=${encodeURIComponent(sorgu)}`
  const res = await fetch(url)
  const data = await res.json()
  const idler = (data.objectIDs || []).slice(0, 24)
  const detaylar = await Promise.all(idler.map((id) => eserDetayGetir(id)))
  return detaylar.filter(Boolean)
}

export async function rastgeleEserGetir() {
  const kelime = RASTGELE_ANAHTAR_KELIMELER[Math.floor(Math.random() * RASTGELE_ANAHTAR_KELIMELER.length)]
  const url = `${MET_BASE}/search?hasImages=true&isHighlight=true&q=${encodeURIComponent(kelime)}`
  const res = await fetch(url)
  const data = await res.json()
  const idler = data.objectIDs || []
  if (idler.length === 0) return null
  // Birkaç deneme yap — bazı ID'lerde görsel eksik olabiliyor
  for (let i = 0; i < 5; i++) {
    const rastgeleId = idler[Math.floor(Math.random() * idler.length)]
    const eser = await eserDetayGetir(rastgeleId)
    if (eser) return eser
  }
  return null
}

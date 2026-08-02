// Art Institute of Chicago — Açık API. Anahtar gerektirmez, CORS açık.
// Görseller IIIF standardıyla sunuluyor: {iiif_base}/{image_id}/full/{boyut}/0/default.jpg

const AIC_BASE = 'https://api.artic.edu/api/v1/artworks'
const AIC_IIIF = 'https://www.artic.edu/iiif/2'
const ALANLAR = 'id,title,artist_title,date_display,image_id'

function normallestir(e) {
  if (!e.image_id) return null
  return {
    id: `aic_${e.id}`,
    title: e.title,
    artistDisplayName: e.artist_title || '',
    objectDate: e.date_display || '',
    imageUrl: `${AIC_IIIF}/${e.image_id}/full/400,/0/default.jpg`,
    sourceUrl: `https://www.artic.edu/artworks/${e.id}`,
    kaynakAdi: 'Art Institute of Chicago',
  }
}

export async function aicSanatEseriAra(sorgu) {
  const url = `${AIC_BASE}/search?q=${encodeURIComponent(sorgu)}&fields=${ALANLAR}&limit=12`
  const res = await fetch(url)
  const data = await res.json()
  return (data.data || []).map(normallestir).filter(Boolean)
}

const RASTGELE_ANAHTAR_KELIMELER = ['portrait', 'landscape', 'flowers', 'sculpture', 'still life', 'garden', 'impressionist']

export async function aicRastgeleEserGetir() {
  const kelime = RASTGELE_ANAHTAR_KELIMELER[Math.floor(Math.random() * RASTGELE_ANAHTAR_KELIMELER.length)]
  const url = `${AIC_BASE}/search?q=${encodeURIComponent(kelime)}&query[term][is_public_domain]=true&fields=${ALANLAR}&limit=20`
  const res = await fetch(url)
  const data = await res.json()
  const uygunlar = (data.data || []).map(normallestir).filter(Boolean)
  if (uygunlar.length === 0) return null
  return uygunlar[Math.floor(Math.random() * uygunlar.length)]
}

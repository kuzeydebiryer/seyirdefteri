// The Met ve Art Institute of Chicago'yu tek bir arayüzde birleştirir. Met'in
// kendi modülüne (metMuseum.js) dokunmadan, burada sadece onun çıktısını ortak
// bir şekle (id, title, artistDisplayName, objectDate, imageUrl, sourceUrl,
// kaynakAdi) çeviriyoruz ki iki kaynak da aynı bileşende sorunsuz gösterilsin.

import { sanatEseriAra as metAra, rastgeleEserGetir as metRastgele } from './metMuseum.js'
import { aicSanatEseriAra, aicRastgeleEserGetir } from './articChicago.js'

function metNormallestir(e) {
  return {
    id: `met_${e.objectID}`,
    title: e.title,
    artistDisplayName: e.artistDisplayName || '',
    objectDate: e.objectDate || '',
    imageUrl: e.primaryImageSmall,
    sourceUrl: e.objectURL,
    kaynakAdi: 'The Met',
  }
}

// İki kaynaktan gelen sonuçları art arda değil, KARIŞIK sırayla döndürür —
// tek bir müzenin sonuçları listeye hakim olmasın diye.
export async function sanatEseriAra(sorgu) {
  const [metSonuc, aicSonuc] = await Promise.all([
    metAra(sorgu)
      .then((liste) => liste.map(metNormallestir))
      .catch(() => []),
    aicSanatEseriAra(sorgu).catch(() => []),
  ])
  const karisik = []
  const maxUzunluk = Math.max(metSonuc.length, aicSonuc.length)
  for (let i = 0; i < maxUzunluk; i++) {
    if (metSonuc[i]) karisik.push(metSonuc[i])
    if (aicSonuc[i]) karisik.push(aicSonuc[i])
  }
  return karisik
}

// "Günün Eseri" için rastgele bir müze seçilir (yarı yarıya) — hep aynı
// kaynaktan gelmesin diye.
export async function rastgeleEserGetir() {
  const oncelikliMet = Math.random() < 0.5
  if (oncelikliMet) {
    const eser = await metRastgele().catch(() => null)
    if (eser) return metNormallestir(eser)
    return await aicRastgeleEserGetir().catch(() => null)
  }
  const eser = await aicRastgeleEserGetir().catch(() => null)
  if (eser) return eser
  const yedek = await metRastgele().catch(() => null)
  return yedek ? metNormallestir(yedek) : null
}

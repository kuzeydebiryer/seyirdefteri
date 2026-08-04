// Yazı içeriğini paragraf, görsel, başlık ve alıntı bloklarına ayırır.
// Kural bilerek çok basit tutuldu — tam bir Markdown editörü değil, sadece
// birkaç işaret: `# Başlık`, `> Alıntı`, satır içinde `*kalın metin*`, ve
// tek satırlık bir görsel URL'i otomatik görsele dönüşüyor. Yeni bir editör
// kütüphanesi öğrenmeye gerek yok.

const GORSEL_DESENI = /^https?:\/\/\S+\.(jpg|jpeg|png|gif|webp|avif)(\?\S*)?$/i

export function icerikBloklariniAyir(metin) {
  if (!metin) return []
  return metin
    .split(/\n\s*\n/)
    .map((blok) => blok.trim())
    .filter(Boolean)
    .map((blok) => {
      if (GORSEL_DESENI.test(blok)) return { tip: 'gorsel', url: blok }
      if (blok.startsWith('# ')) return { tip: 'baslik', icerik: blok.slice(2).trim() }
      if (blok.startsWith('> ')) {
        const satirlar = blok.split('\n').map((s) => s.replace(/^>\s?/, ''))
        return { tip: 'alinti', icerik: satirlar.join('\n') }
      }
      return { tip: 'metin', icerik: blok }
    })
}

// `*kalın metin*` içeren bir paragrafı, sırayla düz/kalın parçalara böler —
// GonderiIcerik bunu React elemanlarına çevirip render ediyor.
export function satirIciBicimlendir(metin) {
  return metin.split(/\*(.+?)\*/g).map((parca, i) => ({ kalin: i % 2 === 1, metin: parca, anahtar: i }))
}

// Kelime sayısından kabaca okuma süresi (ortalama 200 kelime/dk okuma hızı).
export function okumaSuresiTahminEt(metin) {
  if (!metin) return 0
  const kelimeSayisi = metin.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(kelimeSayisi / 200))
}

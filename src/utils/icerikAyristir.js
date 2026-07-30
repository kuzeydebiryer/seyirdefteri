// Yazı içeriğini paragraf ve görsel bloklarına ayırır.
// Kural basit tutuldu: boş satırla ayrılmış bir blok, tek başına bir görsel
// URL'iyse (jpg/png/gif/webp/avif) görsel olarak, değilse paragraf olarak render edilir.
// Bu sayede özel bir editör/markdown öğrenmeye gerek kalmadan, kullanıcı bir
// resim linkini kendi satırına yapıştırdığında otomatik olarak görsel oluyor.

const GORSEL_DESENI = /^https?:\/\/\S+\.(jpg|jpeg|png|gif|webp|avif)(\?\S*)?$/i

export function icerikBloklariniAyir(metin) {
  if (!metin) return []
  return metin
    .split(/\n\s*\n/)
    .map((blok) => blok.trim())
    .filter(Boolean)
    .map((blok) => (GORSEL_DESENI.test(blok) ? { tip: 'gorsel', url: blok } : { tip: 'metin', icerik: blok }))
}

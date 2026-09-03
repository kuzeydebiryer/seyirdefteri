// Letterboxd'un resmi "dots" motifi — LetterboxdIkon.jsx'ten farklı olarak
// currentColor DEĞİL, üç noktanın kendi resmi markalarındaki renklerini
// (letterboxd.com/about/brand/ sayfasından doğrulanmış: turuncu #ff8000,
// yeşil #00e054, mavi #40bcf4) sabit taşıyor — rozetin arka planı/metin
// rengi ne olursa olsun noktalar hep kendi gerçek renklerinde kalsın diye.
//
// GEOMETRİ DÜZELTMESİ: önceki versiyonda yarıçap (11), noktalar arası
// mesafeden (6) çok büyüktü — üç daire neredeyse tamamen üst üste binip
// tek bir bulanık leke gibi görünüyordu. Şimdi yarıçap ve aralık, gerçek
// logodaki gibi (belirgin ama ölçülü bir örtüşme) orantılı.
export default function LetterboxdNoktalarIkon({ className = 'h-4 w-9' }) {
  return (
    <svg viewBox="0 0 36 16" xmlns="http://www.w3.org/2000/svg" className={className}>
      <title>Letterboxd</title>
      <circle cx="8" cy="8" r="8" fill="#ff8000" />
      <circle cx="18" cy="8" r="8" fill="#00e054" />
      <circle cx="28" cy="8" r="8" fill="#40bcf4" />
    </svg>
  )
}

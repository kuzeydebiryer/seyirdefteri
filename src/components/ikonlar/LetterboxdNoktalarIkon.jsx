// Letterboxd'un resmi "dots" motifi — LetterboxdIkon.jsx'ten farklı olarak
// currentColor DEĞİL, üç noktanın kendi resmi markalarındaki renklerini
// (letterboxd.com/about/brand/ sayfasından doğrulanmış: turuncu #ff8000,
// yeşil #00e054, mavi #40bcf4) sabit taşıyor — rozetin arka planı/metin
// rengi ne olursa olsun noktalar hep kendi gerçek renklerinde kalsın diye.
export default function LetterboxdNoktalarIkon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" className={className}>
      <title>Letterboxd</title>
      <circle cx="12" cy="12" r="11" fill="#ff8000" />
      <circle cx="18" cy="12" r="11" fill="#00e054" />
      <circle cx="24" cy="12" r="11" fill="#40bcf4" />
    </svg>
  )
}

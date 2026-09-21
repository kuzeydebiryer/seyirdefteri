// Criterion Collection'ın 2006'dan beri kullandığı resmi kimlik (Pentagram
// tasarımı) — eğik, tek renkli bir "C" monogramı. Letterboxd'un aksine
// Criterion'ın markası renkli değil, sade siyah/beyaz — bu yüzden
// currentColor kullanıyor (LetterboxdIkon'un mono versiyonu gibi),
// çevresindeki metinle aynı rengi alıyor.
export default function CriterionIkon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
      <title>Criterion Collection</title>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeDasharray="47 10"
        transform="rotate(38 12 12)"
      />
    </svg>
  )
}

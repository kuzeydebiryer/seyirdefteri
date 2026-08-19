// Bilinç Akışı günceleri için — jenerik "yazı" kalemi yerine, "akan,
// düzensiz düşünce" fikrini görselleştiren özgün bir spiral/çizgi sembolü.
// Sitenin diğer özel ikonlarıyla (OscarHeykelIkon, TiyatroMaskeleriIkon)
// aynı ince çizgi üslubunda.
export default function DusunceSemboluIkon({ boyut = 32, className = '' }) {
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M16 5.5c-4.5 0-8 3.2-8 7.2 0 3.4 2.6 5.6 5.4 6.3-.7 1-1.9 1.7-3.3 1.9-.5.1-.6.7-.1.9 2.6 1 5.6.4 7.5-1.5 3.8-.4 6.5-3.4 6.5-7 0-4.4-3.6-7.8-8-7.8Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12.5" cy="12.5" r="0.9" fill="currentColor" />
      <circle cx="17" cy="11" r="0.9" fill="currentColor" />
      <circle cx="20" cy="14.5" r="0.9" fill="currentColor" />
      <path d="M9.5 14.8c-1.5.6-2.8-.2-2.8-1.6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <path d="M23 12.5c1.2-.9 1.1-2.3-.3-2.9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

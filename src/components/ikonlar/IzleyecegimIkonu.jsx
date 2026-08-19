// Emoji saat (🕐) yerine, "daha sonra izleyeceğim/okuyacağım" hissini taşıyan
// özgün bir cep saati silueti — sitenin nostaljik/antika kimliğine
// (OscarHeykelIkon, TiyatroMaskeleriIkon) uygun.
export default function IzleyecegimIkonu({ boyut = 24, className = '' }) {
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M10.2 2.6h3.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M12 2.6V4.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="12" cy="13.2" r="8.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 8.6v4.6l3.1 1.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.9 6.9l1.4 1.4M19.1 6.9l-1.4 1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

// Emoji zil (🔔) yerine, sitenin diğer özel ikonlarıyla (OscarHeykelIkon,
// TiyatroMaskeleriIkon) aynı ince çizgi üslubunda özgün bir zil silueti.
export default function BildirimZiliIkon({ boyut = 20, className = '' }) {
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M12 3.2c-.55 0-1 .45-1 1v.75C7.7 5.55 5.8 8 5.8 11v4.3l-1.7 2.55c-.32.48.02 1.15.6 1.15h14.6c.58 0 .92-.67.6-1.15L18.2 15.3V11c0-3-1.9-5.45-5.2-6.05v-.75c0-.55-.45-1-1-1Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M9.3 19.4a2.7 2.7 0 0 0 5.4 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

// Basit, özgün bir "ödül heykelciği" silueti — gerçek Akademi Ödülü heykelinin
// birebir/tescilli tasarımının kopyası DEĞİL, sadece "duran bir insan figürü +
// kaide" şeklinde sadeleştirilmiş bir siluet. Sitenin diğer özel ikonlarıyla
// (LetterboxdIkon, BinKitapIkon) aynı çizgi-sanatı üslubunda.
export default function OscarHeykelIkon({ boyut = 24, className = '' }) {
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Kaide */}
      <rect x="6" y="20" width="12" height="2.5" rx="0.5" fill="currentColor" />
      <rect x="8" y="17.5" width="8" height="2.5" rx="0.5" fill="currentColor" opacity="0.85" />
      {/* Gövde */}
      <path d="M12 16.5c-1.8 0-3-1.1-3-2.8 0-1.3.6-2.2 1.2-3.1.6-.9 1.1-1.7 1.1-2.7h1.4c0 1 .5 1.8 1.1 2.7.6.9 1.2 1.8 1.2 3.1 0 1.7-1.2 2.8-3 2.8Z" fill="currentColor" />
      {/* Baş */}
      <circle cx="12" cy="4.3" r="2.1" fill="currentColor" />
      {/* Kol (kılıç tutar gibi düz bir çizgi) */}
      <rect x="11.3" y="6" width="1.4" height="7" rx="0.6" fill="currentColor" opacity="0.9" />
    </svg>
  )
}

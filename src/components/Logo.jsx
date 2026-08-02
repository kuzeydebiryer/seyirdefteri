// Seyirdefteri logosu: açık bir defter/günce sayfası + köşesinde mühür kırmızısı
// bir ayraç (bookmark) şeridi. sadeceIkon=true iken sadece işaret, yazı olmadan
// (üst menüde yer tutmasın diye); wordmark ayrıca Anasayfa'da slogan satırıyla
// birlikte gösteriliyor.
export default function Logo({ boyut = 34, sadeceIkon = true }) {
  const ikon = (
    <svg width={boyut} height={boyut} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Açık defter - iki sayfa, ortadan kırılmış */}
      <path d="M24 10 C19 7.5 12.5 6.5 6 8 V36 C12.5 34.5 19 35.5 24 38 V10 Z" fill="#EDE4CE" stroke="#8C8368" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M24 10 C29 7.5 35.5 6.5 42 8 V36 C35.5 34.5 29 35.5 24 38 V10 Z" fill="#F5EFE1" stroke="#8C8368" strokeWidth="1.4" strokeLinejoin="round" />
      {/* Sol sayfa satırları */}
      <line x1="10.5" y1="15" x2="19" y2="13.6" stroke="#8C8368" strokeWidth="1.1" opacity="0.55" />
      <line x1="10.5" y1="20.5" x2="19" y2="19.6" stroke="#8C8368" strokeWidth="1.1" opacity="0.55" />
      <line x1="10.5" y1="26" x2="19" y2="25.6" stroke="#8C8368" strokeWidth="1.1" opacity="0.55" />
      {/* Sağ sayfa satırları */}
      <line x1="29" y1="13.6" x2="37.5" y2="15" stroke="#8C8368" strokeWidth="1.1" opacity="0.55" />
      <line x1="29" y1="19.6" x2="37.5" y2="20.5" stroke="#8C8368" strokeWidth="1.1" opacity="0.55" />
      {/* Mühür kırmızısı ayraç şeridi */}
      <path d="M32 6 H39 V22 L35.5 18.5 L32 22 Z" fill="#B33A3A" />
      {/* "Seyir" dokunuşu: ayracın içinde küçük bir oynat üçgeni — hem defter hem izleme fikri tek işarette */}
      <path d="M34.1 9.2 L34.1 13.6 L38 11.4 Z" fill="#F5EFE1" />
    </svg>
  )

  if (sadeceIkon) return ikon

  return (
    <span className="flex items-center gap-2.5">
      {ikon}
      <span className="font-baslik text-2xl text-murekkep">Seyirdefteri</span>
    </span>
  )
}

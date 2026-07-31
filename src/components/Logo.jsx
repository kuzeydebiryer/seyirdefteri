// Basit bir SVG logo: açık bir defter sayfası + tüy kalem çizgisi motifi,
// sitenin "kağıt/günce" kimliğine uygun. Wordmark ile birlikte tek bir link olarak kullanılıyor.
export default function Logo({ boyut = 32 }) {
  return (
    <span className="flex items-center gap-2">
      <svg width={boyut} height={boyut} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Defter gövdesi */}
        <rect x="4" y="6" width="32" height="28" rx="2" fill="#EDE4CE" stroke="#8C8368" strokeWidth="1.2" />
        {/* Orta kırışık/ciltleme çizgisi */}
        <line x1="20" y1="6" x2="20" y2="34" stroke="#D8CBAA" strokeWidth="1" />
        {/* Sayfa satırları */}
        <line x1="8" y1="14" x2="17" y2="14" stroke="#B33A3A" strokeWidth="1" opacity="0.5" />
        <line x1="8" y1="19" x2="17" y2="19" stroke="#8C8368" strokeWidth="1" opacity="0.6" />
        <line x1="8" y1="24" x2="15" y2="24" stroke="#8C8368" strokeWidth="1" opacity="0.6" />
        <line x1="23" y1="14" x2="32" y2="14" stroke="#8C8368" strokeWidth="1" opacity="0.6" />
        <line x1="23" y1="19" x2="32" y2="19" stroke="#8C8368" strokeWidth="1" opacity="0.6" />
        <line x1="23" y1="24" x2="29" y2="24" stroke="#8C8368" strokeWidth="1" opacity="0.6" />
        {/* Tüy kalem ucu - mühür kırmızısı vurgu */}
        <path d="M28 10 L34 4 L36 6 L30 12 L27 13 Z" fill="#B33A3A" />
      </svg>
      <span className="font-baslik text-2xl text-murekkep">Seyirdefteri</span>
    </span>
  )
}

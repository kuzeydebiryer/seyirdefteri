// Emoji kalp (♥/♡) yerine, sitenin diğer özel ikonlarıyla aynı ince çizgi
// üslubunda özgün bir kalp silueti. Favori edilmişse dolu, değilse boş.
export default function FavoriIkonu({ doluMu, boyut = 24, className = '' }) {
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M12 20.1c-.25 0-.5-.08-.7-.24C6.35 15.95 3 12.9 3 9.05 3 6.28 5.15 4.2 7.85 4.2c1.55 0 3.05.75 4.15 2.1 1.1-1.35 2.6-2.1 4.15-2.1C18.85 4.2 21 6.28 21 9.05c0 3.85-3.35 6.9-8.3 10.81-.2.16-.45.24-.7.24Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill={doluMu ? 'currentColor' : 'none'}
      />
    </svg>
  )
}

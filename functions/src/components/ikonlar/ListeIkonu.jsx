// Emoji pano (📋) yerine, "defter" kimliğine daha yakın, elle çizilmiş bir
// liste/pano silueti — üstteki mandal + satır çizgileri.
export default function ListeIkonu({ boyut = 24, className = '' }) {
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="4.5" y="4" width="15" height="16.4" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8.2 4V2.9c0-.5.4-.9.9-.9h5.8c.5 0 .9.4.9.9V4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7.5 11h9M7.5 14.2h9M7.5 17.4h5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

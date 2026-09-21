// Emoji not defteri (📝) yerine, içinde küçük bir kalem vuruşu olan bir
// konuşma balonu — "yorum yaz" fikrini daha doğrudan taşıyor.
export default function YorumIkonu({ boyut = 24, className = '' }) {
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M4.5 5.2h15c.55 0 1 .45 1 1v9c0 .55-.45 1-1 1H9.3l-4.1 3.4v-3.4H4.5c-.55 0-1-.45-1-1v-9c0-.55.45-1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M8.6 12.4l3.3-3.3a.55.55 0 0 1 .78 0l.62.62a.55.55 0 0 1 0 .78l-3.3 3.3-1.7.3.3-1.7Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

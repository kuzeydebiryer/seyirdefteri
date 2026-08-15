// 1000Kitap'ın kendi tescilli logosunu güvenilir şekilde temin edemediğimiz için
// (resmi bir ikon paketinde yer almıyor), yerine site paletiyle uyumlu, temiz
// ve tanınabilir jenerik bir "açık kitap" glifi kullanılıyor. currentColor ile
// çevresindeki metinle aynı rengi alır.
export default function BinKitapIkon({ className = 'h-4 w-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>1000Kitap</title>
      <path d="M12 6.5c-1.6-1.2-3.8-1.8-6.2-1.8-.7 0-1.3.06-1.8.16v12.8c.5-.1 1.1-.16 1.8-.16 2.4 0 4.6.6 6.2 1.8 1.6-1.2 3.8-1.8 6.2-1.8.7 0 1.3.06 1.8.16V4.88c-.5-.1-1.1-.16-1.8-.16-2.4 0-4.6.6-6.2 1.8z" />
      <path d="M12 6.5v12.8" />
    </svg>
  )
}

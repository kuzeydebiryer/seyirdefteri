// Avatar URL'i varsa görseli gösterir, yoksa isim baş harfinden basit bir rozet üretir
export default function Avatar({ adSoyad, avatarUrl, boyut = 'h-9 w-9' }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={adSoyad} className={`${boyut} rounded-full object-cover ring-1 ring-cizgi`} />
  }
  const harf = (adSoyad || '?')[0]?.toUpperCase()
  return (
    <span
      className={`${boyut} flex items-center justify-center rounded-full bg-muhur font-baslik text-kagit ring-1 ring-cizgi`}
    >
      {harf}
    </span>
  )
}

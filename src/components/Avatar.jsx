import TemaAvatarIkon, { TEMA_AVATARLARI, temaAvatarUrlMi, temaAvatarIdCikar } from './ikonlar/TemaAvatarIkon.jsx'

// Avatar URL'i varsa görseli gösterir; "tema:xxx" ile başlıyorsa temalı bir
// ikon rozeti render eder; hiçbiri yoksa isim baş harfinden basit bir rozet
// üretir.
export default function Avatar({ adSoyad, avatarUrl, boyut = 'h-9 w-9' }) {
  if (avatarUrl && temaAvatarUrlMi(avatarUrl)) {
    const id = temaAvatarIdCikar(avatarUrl)
    const tema = TEMA_AVATARLARI.find((t) => t.id === id)
    return (
      <span
        className={`${boyut} flex items-center justify-center rounded-full ${tema?.renk || 'bg-murekkep'} text-kagit ring-1 ring-cizgi`}
        title={tema?.ad}
      >
        <TemaAvatarIkon id={id} boyut={18} className="h-3/5 w-3/5" />
      </span>
    )
  }
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

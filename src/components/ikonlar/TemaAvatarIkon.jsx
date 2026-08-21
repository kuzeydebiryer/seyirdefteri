// Kullanıcıların profil fotoğrafı yerine seçebileceği, sitenin kimliğine
// (ince çizgi, "eskitilmiş kağıt" estetiği) uygun özgün bir avatar seti.
// Her biri kendi rozet rengiyle eşleşiyor — TEMA_AVATARLARI dizisi, seçim
// arayüzünde (Profil.jsx) ve Avatar.jsx'te render için kaynak listesi.

export const TEMA_AVATARLARI = [
  { id: 'klaket', ad: 'Klaket', renk: 'bg-murekkep' },
  { id: 'film-makarasi', ad: 'Film Makarası', renk: 'bg-muhur' },
  { id: 'tiyatro-maskesi', ad: 'Tiyatro Maskesi', renk: 'bg-gise' },
  { id: 'palet', ad: 'Ressam Paleti', renk: 'bg-deniz' },
  { id: 'kamera', ad: 'Vintage Kamera', renk: 'bg-kraft' },
  { id: 'gramofon', ad: 'Gramofon', renk: 'bg-muhur' },
  { id: 'kitap', ad: 'Açık Kitap', renk: 'bg-deniz' },
  { id: 'perde', ad: 'Sahne Perdesi', renk: 'bg-gise' },
  { id: 'bilet', ad: 'Sinema Bileti', renk: 'bg-murekkep' },
  { id: 'spot-isigi', ad: 'Spot Işığı', renk: 'bg-kraft' },
  { id: 'tuy-kalem', ad: 'Tüy Kalem', renk: 'bg-deniz' },
  { id: 'heykel', ad: 'Ödül Heykelciği', renk: 'bg-gise' },
]

export function temaAvatarUrlMi(avatarUrl) {
  return typeof avatarUrl === 'string' && avatarUrl.startsWith('tema:')
}

export function temaAvatarIdCikar(avatarUrl) {
  return avatarUrl.replace('tema:', '')
}

// boyut: piksel cinsinden (Avatar.jsx'teki tailwind boyut sınıfından farklı
// olarak burada SVG'nin kendi iç boyutunu ayarlıyoruz).
export default function TemaAvatarIkon({ id, boyut = 20, className = '' }) {
  const ortak = { width: boyut, height: boyut, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', className }

  switch (id) {
    case 'klaket':
      return (
        <svg {...ortak}>
          <path d="M4 10.5h16v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8Z" />
          <path d="M4 10.5 5.5 5h13L20 10.5" />
          <path d="m7.5 5 1.8 5.5M12 5l1.8 5.5M16.5 5l1.8 5.5" />
        </svg>
      )
    case 'film-makarasi':
      return (
        <svg {...ortak}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="6.5" r="1.4" />
          <circle cx="16.7" cy="9.5" r="1.4" />
          <circle cx="16.7" cy="14.5" r="1.4" />
          <circle cx="12" cy="17.5" r="1.4" />
          <circle cx="7.3" cy="14.5" r="1.4" />
          <circle cx="7.3" cy="9.5" r="1.4" />
        </svg>
      )
    case 'tiyatro-maskesi':
      return (
        <svg {...ortak}>
          <path d="M6 6c0-1.7 1.8-3 4-3s4 1.3 4 3v4c0 3.1-1.8 5.6-4 5.6S6 13.1 6 10V6Z" />
          <circle cx="8.3" cy="7.5" r="0.6" fill="currentColor" />
          <circle cx="11.7" cy="7.5" r="0.6" fill="currentColor" />
          <path d="M8.2 12.7c.9-1.1 2.7-1.1 3.6 0" />
          <path d="M14.5 9c1.6-.5 3.5.3 3.5 2.3v2.6c0 2.5-1.4 4.5-3.2 4.6" opacity="0.55" />
        </svg>
      )
    case 'palet':
      return (
        <svg {...ortak}>
          <path d="M12 3.5c-4.7 0-8.5 3.6-8.5 8s3.8 8 8.5 8c.9 0 1.4-.7 1.4-1.4 0-.4-.2-.7-.4-1-.2-.3-.4-.6-.4-1 0-.7.6-1.3 1.3-1.3H15c2.5 0 4.5-2 4.5-4.5C19.5 6.5 16.2 3.5 12 3.5Z" />
          <circle cx="8" cy="10" r="1" fill="currentColor" />
          <circle cx="11.5" cy="7.5" r="1" fill="currentColor" />
          <circle cx="15.3" cy="9" r="1" fill="currentColor" />
        </svg>
      )
    case 'kamera':
      return (
        <svg {...ortak}>
          <rect x="3" y="9" width="12" height="8" rx="1.2" />
          <path d="M15 11.5l5-2.3v7.6l-5-2.3" />
          <circle cx="7.5" cy="6.5" r="2" />
        </svg>
      )
    case 'gramofon':
      return (
        <svg {...ortak}>
          <path d="M12 15.5c2.5 0 5-2.4 7.5-5.5-1.5 0-2.8.6-3.6 1.7" />
          <path d="M12 15.5c-.6-3 .8-6.5 4-8.5" opacity="0.6" />
          <circle cx="9" cy="17.5" r="2.8" />
          <circle cx="9" cy="17.5" r="0.7" fill="currentColor" />
        </svg>
      )
    case 'kitap':
      return (
        <svg {...ortak}>
          <path d="M12 6.5c-1.6-1.2-3.6-1.7-5.5-1.5C5.6 5.1 5 5.8 5 6.7v10.6c0 .8.7 1.3 1.4 1.2 1.9-.3 3.9.2 5.6 1.5" />
          <path d="M12 6.5c1.6-1.2 3.6-1.7 5.5-1.5.9.1 1.5.8 1.5 1.7v10.6c0 .8-.7 1.3-1.4 1.2-1.9-.3-3.9.2-5.6 1.5" />
          <path d="M12 6.5v13.5" opacity="0.5" />
        </svg>
      )
    case 'perde':
      return (
        <svg {...ortak}>
          <path d="M4 4h16v2H4z" />
          <path d="M6 6c0 4-1.5 9 1 14M11 6c0 5-1 9 1 14M17 6c1 4 2.5 9 1 14" opacity="0.85" />
        </svg>
      )
    case 'bilet':
      return (
        <svg {...ortak}>
          <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 1.5 1.5 0 0 0 0 3v0a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 1.5 1.5 0 0 0 0-3Z" />
          <path d="M14 6.5v11" strokeDasharray="1.6 1.8" />
        </svg>
      )
    case 'spot-isigi':
      return (
        <svg {...ortak}>
          <path d="M9 3.5h6l1.5 5H7.5L9 3.5Z" />
          <path d="M7.5 8.5 4 20.5h16L16.5 8.5" />
        </svg>
      )
    case 'tuy-kalem':
      return (
        <svg {...ortak}>
          <path d="M19 4c-5 0-11 3.5-13.5 11.5C4.7 17.8 5 19 5 19s1.2.3 3.5-.5C16.5 16 20 10 20 5c0-.6-.4-1-1-1Z" />
          <path d="M9 15c2-2 5-4 8-9" opacity="0.6" />
          <path d="M5 19 3.5 20.5" />
        </svg>
      )
    case 'heykel':
      return (
        <svg {...ortak}>
          <path d="M12 3.5c-1.4 0-2.2 1-2.2 2.2 0 .7.3 1.2.7 1.7-1.3.6-2.2 1.9-2.2 3.4 0 1.3.7 2.4 1.7 3-1 .5-1.5 1.4-1.5 2.5v3.2h11v-3.2c0-1.1-.5-2-1.5-2.5 1-.6 1.7-1.7 1.7-3 0-1.5-.9-2.8-2.2-3.4.4-.5.7-1 .7-1.7 0-1.2-.8-2.2-2.2-2.2Z" />
          <path d="M12 10.5v3" opacity="0.5" />
        </svg>
      )
    default:
      return null
  }
}

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { sonYorumlariGetir } from '../utils/yorum.js'
import Avatar from '../components/Avatar.jsx'

const esereLink = (tur, disId) => (tur === 'dizi' ? `/dizi/${disId}` : tur === 'kitap' ? `/kitap/${disId}` : `/film/${disId}`)

const FILTRELER = [
  { id: 'tumu', etiket: 'Tümü', turler: ['sinema', 'dizi', 'kitap'] },
  { id: 'film', etiket: '🎬 Film', turler: ['sinema'] },
  { id: 'dizi', etiket: '📺 Dizi', turler: ['dizi'] },
  { id: 'kitap', etiket: '📚 Kitap', turler: ['kitap'] },
]

function tarihGoster(deger) {
  if (!deger) return ''
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Anasayfadaki "Son Yorumlar" widget'ının "Tümünü Gör" linkinin gittiği
// sayfa — kompakt poster şeridi yerine, yorumun tam metnini okunabilir
// şekilde gösteren bir liste (yorumlar metin ağırlıklı olduğu için ızgara
// değil liste daha uygun).
export default function SonYorumlar() {
  const [aramaParametreleri, setAramaParametreleri] = useSearchParams()
  const filtreId = aramaParametreleri.get('tur') || 'tumu'
  const [yorumlar, setYorumlar] = useState(null)

  const aktifFiltre = FILTRELER.find((f) => f.id === filtreId) || FILTRELER[0]

  useEffect(() => {
    setYorumlar(null)
    sonYorumlariGetir(aktifFiltre.turler, 40).then(setYorumlar)
  }, [filtreId])

  function filtreSec(id) {
    const yeni = new URLSearchParams()
    if (id !== 'tumu') yeni.set('tur', id)
    setAramaParametreleri(yeni)
  }

  return (
    <div>
      <h1 className="mb-1 font-baslik text-2xl text-murekkep">💬 Son Yorumlar</h1>
      <p className="mb-6 text-sm text-kraft">Film, dizi ve kitap sayfalarında topluluğun en son yazdığı yorumlar.</p>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTRELER.map((f) => (
          <button
            key={f.id}
            onClick={() => filtreSec(f.id)}
            className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
              filtreId === f.id ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagitKoyu text-kraft ring-cizgi'
            }`}
          >
            {f.etiket}
          </button>
        ))}
      </div>

      {yorumlar === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {yorumlar !== null && yorumlar.length === 0 && <p className="text-sm text-kraft">Bu kategoride henüz yorum yok.</p>}

      <div className="space-y-3">
        {yorumlar?.map((y) => (
          <Link
            key={y.id}
            to={esereLink(y.eserTur, y.eserDisId)}
            className="flex gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi hover:ring-deniz/50"
          >
            <div className="h-20 w-14 shrink-0 overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
              {y.eserPosterUrl ? (
                <img src={y.eserPosterUrl} alt={y.eserBaslik} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg opacity-40">💬</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Avatar adSoyad={y.yazarAdi} boyut="h-5 w-5" />
                <p className="text-xs font-medium text-murekkep">{y.yazarAdi}</p>
                <span className="text-[11px] text-kraft">· {y.eserBaslik}</span>
              </div>
              <p className="mt-1 text-sm text-murekkep/90">{y.metin}</p>
              <p className="mt-1 text-[11px] text-kraft">{tarihGoster(y.tarih)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

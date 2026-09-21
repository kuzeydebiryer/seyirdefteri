import { useState } from 'react'
import { Link } from 'react-router-dom'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_PROFIL = 'https://image.tmdb.org/t/p/w185'

// Film/Dizi'deki isim aramasına karşılık, Oyuncular sayfası için — bir kişiyi
// adıyla arayıp doğrudan sayfasına gitme imkânı. Şimdiye kadar bu sayfa sadece
// topluluğun zaten değerlendirdiği kişileri gösteriyordu, henüz kimsenin
// bakmadığı bir oyuncu/yönetmeni bulmanın yolu yoktu.
export default function KisiArama() {
  const [arama, setArama] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [aramaYapildi, setAramaYapildi] = useState(false)

  async function ara(e) {
    e.preventDefault()
    if (!arama.trim() || !TMDB_API_KEY) return
    setYukleniyor(true)
    setAramaYapildi(true)
    try {
      const url = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(arama)}`
      const res = await fetch(url)
      const data = await res.json()
      setSonuclar((data.results || []).filter((k) => k.known_for_department))
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <div className="mb-8">
      <form onSubmit={ara} className="flex gap-2">
        <input
          type="text"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Oyuncu ya da yönetmen ara..."
          aria-label="Oyuncu ya da yönetmen ara"
          className="flex-1 max-w-sm rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
        />
        <button type="submit" disabled={yukleniyor} className="rounded-sm bg-muhur px-4 py-2 font-govde text-sm text-kagit disabled:opacity-40">
          {yukleniyor ? 'Aranıyor...' : 'Ara'}
        </button>
      </form>

      {aramaYapildi && !yukleniyor && sonuclar.length === 0 && <p className="mt-2 text-sm text-kraft">Sonuç bulunamadı.</p>}

      {sonuclar.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-6">
          {sonuclar.slice(0, 12).map((k) => (
            <Link key={k.id} to={`/kisi/${k.id}`} className="block">
              <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                {k.profile_path && <img src={`${TMDB_PROFIL}${k.profile_path}`} alt={k.name} className="h-full w-full object-cover" />}
              </div>
              <p className="mt-1 truncate text-xs text-murekkep">{k.name}</p>
              <p className="truncate text-[11px] text-kraft">{k.known_for_department}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

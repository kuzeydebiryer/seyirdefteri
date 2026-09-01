import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { letterboxd500ListesiGetir } from '../utils/letterboxd500.js'
import Letterboxd500IceAktar from '../components/Letterboxd500IceAktar.jsx'

// Film sayfalarındaki "🎞️ Letterboxd 500 · #7" rozetinin gittiği yer —
// listenin tamamını sıralamasıyla gösteriyor. Menüye eklenmedi (kasıtlı),
// sadece rozetten ya da Filmler sayfasından erişiliyor.
export default function Letterboxd500() {
  const { profil } = useAuth()
  const [liste, setListe] = useState(null)

  useEffect(() => {
    letterboxd500ListesiGetir().then(setListe)
  }, [])

  return (
    <div>
      <Link to="/filmler" className="text-xs text-kraft hover:text-deniz">
        ← Filmler
      </Link>
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">🎞️ Letterboxd En İyi 500 Film</h1>
      <p className="mb-6 text-sm text-kraft">
        Letterboxd topluluğunun oylarıyla oluşan resmi liste — Letterboxd'un kendi CSV dışa aktarma özelliğinden içe
        aktarıldı.
      </p>

      {profil?.yonetici && <Letterboxd500IceAktar />}

      {liste === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {liste !== null && liste.length === 0 && <p className="text-sm text-kraft">Liste henüz içe aktarılmamış.</p>}

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {liste?.map((film) => (
          <Link key={film.id} to={`/film/${film.id}`} className="block">
            <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
              {film.posterUrl ? (
                <img src={film.posterUrl} alt={film.baslik} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">🎬</div>
              )}
              <span className="absolute left-1 top-1 rounded-full bg-[#00e054]/90 px-1.5 py-0.5 text-[10px] font-medium text-black">
                #{film.siraNo}
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-murekkep">{film.baslik}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

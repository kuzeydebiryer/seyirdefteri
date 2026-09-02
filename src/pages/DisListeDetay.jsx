import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listeGetir, listeFilmleriGetir } from '../utils/disariListeler.js'
import DisListeIceAktar from '../components/DisListeIceAktar.jsx'

const STIL_ROZET_RENGI = {
  imdb: 'bg-[#F5C518] text-black',
  letterboxd: 'bg-[#00e054]/90 text-black',
  genel: 'bg-kagitKoyu text-kraft ring-1 ring-cizgi',
}

// Film sayfalarındaki dış liste rozetlerinin ("🎞️ Letterboxd 500 · #7" gibi)
// gittiği yer — o listenin tüm filmlerini sıralamasıyla gösteriyor.
// DisListeler.jsx (hub) üzerinden erişiliyor, üst menüye eklenmedi.
export default function DisListeDetay() {
  const { listeId } = useParams()
  const [liste, setListe] = useState(undefined)
  const [filmler, setFilmler] = useState(null)
  const [yenile, setYenile] = useState(0)

  useEffect(() => {
    listeGetir(listeId).then(setListe)
    listeFilmleriGetir(listeId).then(setFilmler)
  }, [listeId, yenile])

  if (liste === undefined) return <p className="text-sm text-kraft">Yükleniyor...</p>

  if (!liste) {
    return (
      <div>
        <Link to="/dis-listeler" className="text-xs text-kraft hover:text-deniz">
          ← Dış Listeler
        </Link>
        <p className="mt-4 text-sm text-kraft">Bu liste bulunamadı.</p>
      </div>
    )
  }

  const rozetSinifi = STIL_ROZET_RENGI[liste.stil] || STIL_ROZET_RENGI.genel

  return (
    <div>
      <Link to="/dis-listeler" className="text-xs text-kraft hover:text-deniz">
        ← Dış Listeler
      </Link>
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">🎞️ {liste.ad}</h1>
      <p className="mb-6 text-sm text-kraft">{filmler?.length || 0} film — resmî sıralamasıyla.</p>

      <DisListeIceAktar listeId={liste.id} listeAdi={liste.ad} onEklendi={() => setYenile((n) => n + 1)} />

      {filmler === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {filmler !== null && filmler.length === 0 && <p className="text-sm text-kraft">Bu liste henüz içe aktarılmamış.</p>}

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {filmler?.map((film) => (
          <Link key={film.id} to={`/film/${film.id}`} className="block">
            <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
              {film.posterUrl ? (
                <img src={film.posterUrl} alt={film.baslik} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">🎬</div>
              )}
              <span className={`absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${rozetSinifi}`}>#{film.siraNo}</span>
            </div>
            <p className="mt-1 truncate text-xs text-murekkep">{film.baslik}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

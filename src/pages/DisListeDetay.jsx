import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { listeGetir, listeFilmleriGetir, listedenFilmSil, listeGuncelle } from '../utils/disariListeler.js'
import DisListeIceAktar from '../components/DisListeIceAktar.jsx'
import LetterboxdIkon from '../components/ikonlar/LetterboxdIkon.jsx'

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
  const { profil } = useAuth()
  const [liste, setListe] = useState(undefined)
  const [filmler, setFilmler] = useState(null)
  const [yenile, setYenile] = useState(0)

  const [duzenlemeAcik, setDuzenlemeAcik] = useState(false)
  const [taslakSiraliMi, setTaslakSiraliMi] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  useEffect(() => {
    listeGetir(listeId).then((l) => {
      setListe(l)
      if (l) setTaslakSiraliMi(l.siraliMi !== false)
    })
    listeFilmleriGetir(listeId).then(setFilmler)
  }, [listeId, yenile])

  async function filmSilTiklandi(film) {
    if (!window.confirm(`"${film.baslik}" filmini bu listeden çıkarmak istediğine emin misin?`)) return
    await listedenFilmSil(listeId, film.id)
    setFilmler((onceki) => onceki.filter((f) => f.id !== film.id))
  }

  async function ayarlariKaydet() {
    setKaydediliyor(true)
    try {
      await listeGuncelle(listeId, { siraliMi: taslakSiraliMi })
      setYenile((n) => n + 1)
      setDuzenlemeAcik(false)
    } finally {
      setKaydediliyor(false)
    }
  }

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
  const siraliMi = liste.siraliMi !== false // eski listelerde alan hiç yoktu, varsayılan true (eski davranış)

  return (
    <div>
      <Link to="/dis-listeler" className="text-xs text-kraft hover:text-deniz">
        ← Dış Listeler
      </Link>
      <div className="mt-1 mb-1 flex items-center gap-2">
        {liste.stil === 'letterboxd' ? <LetterboxdIkon className="h-6 w-6 text-[#00e054]" /> : <span className="text-2xl">🎞️</span>}
        <h1 className="font-baslik text-2xl text-murekkep">{liste.ad}</h1>
      </div>
      <div className="mb-6 flex items-center gap-3">
        <p className="text-sm text-kraft">
          {filmler?.length || 0} film{siraliMi ? ' — resmî sıralamasıyla.' : ' — üyelik listesi (sıralaması yok).'}
        </p>
        {profil?.yonetici && (
          <button onClick={() => setDuzenlemeAcik((a) => !a)} className="text-xs text-deniz hover:underline">
            {duzenlemeAcik ? 'Vazgeç' : '✏️ Ayarları Düzenle'}
          </button>
        )}
      </div>

      {duzenlemeAcik && (
        <div className="mb-6 max-w-md space-y-2 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
          <label className="flex items-center gap-2 text-xs text-murekkep">
            <input type="checkbox" checked={taslakSiraliMi} onChange={(e) => setTaslakSiraliMi(e.target.checked)} />
            Bu liste sıralı (Letterboxd 500, IMDb 250 gibi — kapalıysa "1001 Film" gibi sadece üyelik listesi sayılır,
            posterlerde sıra numarası gösterilmez)
          </label>
          <button onClick={ayarlariKaydet} disabled={kaydediliyor} className="rounded-sm bg-muhur px-3 py-1 text-xs text-kagit disabled:opacity-40">
            {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      )}

      <DisListeIceAktar listeId={liste.id} listeAdi={liste.ad} onEklendi={() => setYenile((n) => n + 1)} />

      {filmler === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {filmler !== null && filmler.length === 0 && <p className="text-sm text-kraft">Bu liste henüz içe aktarılmamış.</p>}

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {filmler?.map((film) => (
          <div key={film.id} className="group relative">
            <Link to={`/film/${film.id}`} className="block">
              <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                {film.posterUrl ? (
                  <img src={film.posterUrl} alt={film.baslik} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">🎬</div>
                )}
                {siraliMi && (
                  <span className={`absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${rozetSinifi}`}>#{film.siraNo}</span>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-murekkep">{film.baslik}</p>
            </Link>
            {profil?.yonetici && (
              <button
                onClick={() => filmSilTiklandi(film)}
                title="Bu filmi listeden çıkar (yanlış eşleşme)"
                className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] text-kagit opacity-0 transition group-hover:opacity-100 hover:bg-muhur"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

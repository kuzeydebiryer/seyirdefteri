import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { anaTurGetir, altTurleriGetir, altTurSil, anaTurSil } from '../utils/sinemaTurleri.js'
import YatayKaydirma from '../components/YatayKaydirma.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w300'

// Tek bir alt türün (ör. "Folk Horror") sonuçlarını çeken ve yatay bir
// şerit olarak gösteren alt bileşen. tmdbTurId null ise (dizi türlerinde
// Korku diye bir TMDB kategorisi olmadığı için) tür kısıtı hiç eklenmiyor,
// sadece anahtar kelime yeterli oluyor. anahtarKelimeIdleri artık Firestore
// belgesindeki anahtarKelimeler dizisinden (her biri {id, ad}) çıkarılıyor.
function AltTurSeridi({ anaTurId, altTur, tmdbTurId, mod, yoneticiMi, onSil }) {
  const [sonuclar, setSonuclar] = useState(null)
  const anahtarKelimeIdleri = altTur.anahtarKelimeler.map((k) => k.id)

  useEffect(() => {
    if (!TMDB_API_KEY) return
    setSonuclar(null)
    const uc = mod === 'sinema' ? 'movie' : 'tv'
    const parcalar = [`api_key=${TMDB_API_KEY}`, 'language=tr-TR', 'sort_by=popularity.desc', `with_keywords=${anahtarKelimeIdleri.join('|')}`]
    if (tmdbTurId) parcalar.push(`with_genres=${tmdbTurId}`)
    fetch(`https://api.themoviedb.org/3/discover/${uc}?${parcalar.join('&')}`)
      .then((r) => r.json())
      .then((data) => setSonuclar(data.results || []))
      .catch(() => setSonuclar([]))
  }, [altTur, tmdbTurId, mod])

  if (sonuclar !== null && sonuclar.length === 0) return null

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">
          {altTur.ikon} {altTur.ad}
        </h2>
        <div className="flex shrink-0 items-center gap-3">
          {yoneticiMi && (
            <button onClick={() => onSil(altTur)} className="whitespace-nowrap text-xs text-kraft hover:text-muhur">
              🗑️ Sil
            </button>
          )}
          <Link to={`/sinema-turu/${anaTurId}/${altTur.id}?mod=${mod}`} className="whitespace-nowrap text-sm text-kraft hover:text-deniz">
            Tümünü Gör ›
          </Link>
        </div>
      </div>
      {sonuclar === null ? (
        <p className="text-sm text-kraft">Yükleniyor...</p>
      ) : (
        <YatayKaydirma>
          {sonuclar.slice(0, 12).map((item) => (
            <Link key={item.id} to={`/${mod === 'sinema' ? 'film' : 'dizi'}/${item.id}`} className="shrink-0" style={{ width: 120 }}>
              <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                {item.poster_path ? (
                  <img src={`${TMDB_POSTER}${item.poster_path}`} alt={item.title || item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">🎬</div>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-murekkep">{item.title || item.name}</p>
            </Link>
          ))}
        </YatayKaydirma>
      )}
    </div>
  )
}

// Platformlar/PlatformDetay ile aynı desen — hub'dan (SinemaAltTurleri.jsx)
// gelinen, tek bir ana türün (ör. Korku Sineması) tüm alt türlerini yatay
// şeritler halinde gösteren sayfa. Film/Dizi sekmesi tüm şeritleri birden
// etkiliyor. Artık Firestore'dan okunuyor (bkz. utils/sinemaTurleri.js).
// Yönetici için silme butonları da burada — önceden hiç yoktu, yanlış
// eklenmiş bir alt türü (ör. yanlış ana türün altına) düzeltmenin tek yolu
// silip doğru yerden yeniden eklemekti, ama silme arayüzü hiç kurulmamıştı.
export default function SinemaAnaTuruDetay() {
  const { anaTurId } = useParams()
  const { profil } = useAuth()
  const navigate = useNavigate()
  const [aramaParametreleri, setAramaParametreleri] = useSearchParams()
  const mod = aramaParametreleri.get('mod') || 'sinema'
  const [anaTur, setAnaTur] = useState(undefined) // undefined: yükleniyor, null: bulunamadı
  const [altTurler, setAltTurler] = useState(null)

  useEffect(() => {
    anaTurGetir(anaTurId).then(setAnaTur)
    altTurleriGetir(anaTurId).then(setAltTurler)
  }, [anaTurId])

  async function altTurSilTiklandi(altTur) {
    if (!window.confirm(`"${altTur.ad}" alt türünü silmek istediğine emin misin?`)) return
    await altTurSil(altTur.id)
    setAltTurler((onceki) => onceki.filter((a) => a.id !== altTur.id))
  }

  async function anaTurSilTiklandi() {
    if (!window.confirm(`"${anaTur.ad}" ana türünü silmek istediğine emin misin? Altındaki tüm alt türler de silinecek.`)) return
    for (const altTur of altTurler || []) {
      await altTurSil(altTur.id)
    }
    await anaTurSil(anaTurId)
    navigate('/sinema-turleri')
  }

  if (anaTur === undefined) return <p className="text-sm text-kraft">Yükleniyor...</p>

  if (!anaTur) {
    return (
      <div>
        <Link to="/sinema-turleri" className="text-xs text-kraft hover:text-deniz">
          ← Sinemasal Alt Türler
        </Link>
        <p className="mt-4 text-sm text-kraft">Bu ana tür bulunamadı.</p>
      </div>
    )
  }

  const tmdbTurId = mod === 'sinema' ? anaTur.tmdbFilmTurId : anaTur.tmdbDiziTurId

  return (
    <div>
      <Link to="/sinema-turleri" className="text-xs text-kraft hover:text-deniz">
        ← Sinemasal Alt Türler
      </Link>
      <div className="mt-1 mb-6 flex items-center justify-between">
        <h1 className="font-baslik text-2xl text-murekkep">
          {anaTur.ikon} {anaTur.ad}
        </h1>
        {profil?.yonetici && (
          <button onClick={anaTurSilTiklandi} className="text-xs text-kraft hover:text-muhur">
            🗑️ Ana Türü Sil
          </button>
        )}
      </div>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setAramaParametreleri({ mod: 'sinema' })}
          className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
            mod === 'sinema' ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagitKoyu text-kraft ring-cizgi'
          }`}
        >
          🎬 Film
        </button>
        <button
          onClick={() => setAramaParametreleri({ mod: 'dizi' })}
          className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
            mod === 'dizi' ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagitKoyu text-kraft ring-cizgi'
          }`}
        >
          📺 Dizi
        </button>
      </div>

      {altTurler === null && <p className="text-sm text-kraft">Alt türler yükleniyor...</p>}
      {altTurler !== null && altTurler.length === 0 && <p className="text-sm text-kraft">Bu ana türe henüz alt tür eklenmemiş.</p>}
      {altTurler?.map((altTur) => (
        <AltTurSeridi
          key={altTur.id}
          anaTurId={anaTurId}
          altTur={altTur}
          tmdbTurId={tmdbTurId}
          mod={mod}
          yoneticiMi={!!profil?.yonetici}
          onSil={altTurSilTiklandi}
        />
      ))}
    </div>
  )
}

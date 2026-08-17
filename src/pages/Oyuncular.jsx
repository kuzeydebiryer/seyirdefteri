import { useEffect, useState } from 'react'
import { topluluktaPopulerKisiler } from '../hooks/useKisiPopulerlik.js'
import { useHaberler } from '../hooks/useHaberler.js'
import { useYonetmenler } from '../hooks/useYonetmenler.js'
import { useAuth } from '../context/AuthContext.jsx'
import { yonetmenEkle } from '../utils/yonetmen.js'
import HaberBolumu from '../components/HaberBolumu.jsx'
import KisiArama from '../components/KisiArama.jsx'
import KisiKarti from '../components/KisiKarti.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_PROFIL = 'https://image.tmdb.org/t/p/w300'

export default function Oyuncular() {
  const { kullanici } = useAuth()
  const [topluluk, setTopluluk] = useState([])
  const [populer, setPopuler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const { haberler, yenidenYukle: haberleriYenile } = useHaberler('kisi')

  const { yonetmenler, yukleniyor: yonetmenlerYukleniyor, yenidenYukle: yonetmenleriYenile } = useYonetmenler()
  const [yonetmenFormuAcik, setYonetmenFormuAcik] = useState(false)
  const [yonetmenArama, setYonetmenArama] = useState('')
  const [yonetmenSonuclari, setYonetmenSonuclari] = useState([])
  const [yonetmenEkleniyor, setYonetmenEkleniyor] = useState(false)

  useEffect(() => {
    let iptal = false
    async function getir() {
      const topluluktakiler = await topluluktaPopulerKisiler()
      if (!iptal) setTopluluk(topluluktakiler)

      // "Bizim Aramızda Popüler" kartlarına meslek rozeti eklemek için — bu
      // liste en fazla 12 kişi olduğundan (topluluktaPopulerKisiler'in
      // varsayılanı), 12 ek TMDB çağrısı gözden çıkarılabilir bir maliyet.
      // Yönetmen olanlar için de "+ Yönetmenler'e Ekle" hızlı eylemi
      // eklenebilsin diye departman bilgisini burada zenginleştiriyoruz.
      if (TMDB_API_KEY && topluluktakiler.length > 0) {
        Promise.all(
          topluluktakiler.map(async (k) => {
            try {
              const res = await fetch(`https://api.themoviedb.org/3/person/${k.id}?api_key=${TMDB_API_KEY}&language=tr-TR`)
              const data = await res.json()
              return { ...k, departman: data.known_for_department }
            } catch {
              return k
            }
          })
        ).then((zenginlesmis) => {
          if (!iptal) setTopluluk(zenginlesmis)
        })
      }

      if (TMDB_API_KEY) {
        try {
          const url = `https://api.themoviedb.org/3/person/popular?api_key=${TMDB_API_KEY}&language=tr-TR&page=1`
          const res = await fetch(url)
          const data = await res.json()
          if (!iptal) setPopuler((data.results || []).slice(0, 12))
        } catch (e) {
          console.warn('TMDB popüler kişi listesi alınamadı:', e.message)
        }
      }
      if (!iptal) setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [])

  async function yonetmenAra(e) {
    e.preventDefault()
    if (!yonetmenArama.trim() || !TMDB_API_KEY) return
    const url = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(yonetmenArama)}`
    const res = await fetch(url)
    const data = await res.json()
    setYonetmenSonuclari(data.results || [])
  }

  async function yonetmenSec(kisi) {
    setYonetmenEkleniyor(true)
    try {
      await yonetmenEkle(kisi.id, {
        ad: kisi.name,
        fotoUrl: kisi.profile_path ? `${TMDB_PROFIL}${kisi.profile_path}` : '',
        kullanici,
      })
      setYonetmenSonuclari([])
      setYonetmenArama('')
      setYonetmenFormuAcik(false)
      yonetmenleriYenile()
    } finally {
      setYonetmenEkleniyor(false)
    }
  }

  // "Bizim Aramızda Popüler" kartındaki hızlı eylem — kişi zaten yönetmen
  // rozetiyle görünüyorsa (TMDB'den zenginleştirilmiş departman verisiyle) ve
  // henüz küratörlü listede değilse, tekrar arama yapmadan tek tıkla ekler.
  async function hizliYonetmenEkle(kisi) {
    await yonetmenEkle(kisi.id, { ad: kisi.kisiAdi, fotoUrl: kisi.kisiFotoUrl, kullanici })
    yonetmenleriYenile()
  }

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep mb-6">Oyuncular &amp; Yönetmenler</h1>

      <KisiArama />

      <HaberBolumu kategori="kisi" haberler={haberler} yenidenYukle={haberleriYenile} />

      {/* Yönetmenler — üyelerin elle eklediği küratörlü liste */}
      <div className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-baslik text-lg text-murekkep">Yönetmenler</h2>
          {kullanici && (
            <button
              onClick={() => setYonetmenFormuAcik((a) => !a)}
              className={`rounded-full px-3 py-1 font-govde text-xs ${yonetmenFormuAcik ? 'bg-kagitKoyu text-kraft ring-1 ring-cizgi' : 'bg-gise text-kagit'}`}
            >
              {yonetmenFormuAcik ? 'Vazgeç' : '+ Yönetmen Ekle'}
            </button>
          )}
        </div>

        {yonetmenFormuAcik && (
          <div className="mb-4 space-y-2 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
            <form onSubmit={yonetmenAra} className="flex gap-2">
              <input
                type="text"
                value={yonetmenArama}
                onChange={(e) => setYonetmenArama(e.target.value)}
                placeholder="Yönetmen adı ara..."
                className="flex-1 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
              <button type="submit" className="rounded-sm bg-deniz px-3 py-2 text-xs text-kagit">
                Ara
              </button>
            </form>
            {yonetmenSonuclari.length > 0 && (
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {yonetmenSonuclari.slice(0, 12).map((kisi) => (
                  <button
                    key={kisi.id}
                    onClick={() => yonetmenSec(kisi)}
                    disabled={yonetmenEkleniyor}
                    className="text-left disabled:opacity-40"
                  >
                    <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                      {kisi.profile_path && (
                        <img src={`${TMDB_PROFIL}${kisi.profile_path}`} alt={kisi.name} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-murekkep">{kisi.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {yonetmenlerYukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
        {!yonetmenlerYukleniyor && yonetmenler.length === 0 && (
          <p className="text-sm text-kraft">Henüz bir yönetmen eklenmedi.</p>
        )}
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-6">
          {yonetmenler.map((y) => (
            <KisiKarti key={y.id} id={y.tmdbId} ad={y.ad} fotoUrl={y.fotoUrl} rozet="🎬 Yönetmen" />
          ))}
        </div>
      </div>

      <div className="defter-cizgi my-8" />

      <h2 className="font-baslik text-lg text-murekkep mb-3">Bizim Aramızda Popüler</h2>
      {yukleniyor && <p className="text-sm text-kraft mb-6">Yükleniyor...</p>}
      {!yukleniyor && topluluk.length === 0 && <p className="text-sm text-kraft mb-6">Henüz kimse kimseyi değerlendirmedi.</p>}
      <div className="mb-10 grid grid-cols-4 gap-4 sm:grid-cols-6">
        {topluluk.map((k) => {
          const zatenYonetmenListesindeMi = yonetmenler.some((y) => y.tmdbId === k.id)
          return (
            <div key={k.id}>
              <KisiKarti
                id={k.id}
                ad={k.kisiAdi}
                fotoUrl={k.kisiFotoUrl}
                departman={k.departman}
                ortalamaPuan={k.ortalamaPuan}
                puanSayisi={k.puanSayisi}
              />
              {kullanici && k.departman === 'Directing' && !zatenYonetmenListesindeMi && (
                <button
                  onClick={() => hizliYonetmenEkle(k)}
                  className="mt-1 w-full truncate rounded-sm bg-kagitKoyu px-1 py-0.5 text-[10px] text-kraft ring-1 ring-cizgi hover:text-murekkep"
                >
                  + Yönetmenler'e Ekle
                </button>
              )}
            </div>
          )
        })}
      </div>

      {populer.length > 0 && (
        <>
          <h2 className="font-baslik text-lg text-murekkep mb-3">TMDB'de Şu An Popüler</h2>
          <div className="grid grid-cols-4 gap-4 sm:grid-cols-6">
            {populer.map((k) => (
              <KisiKarti
                key={k.id}
                id={k.id}
                ad={k.name}
                fotoUrl={k.profile_path ? `${TMDB_PROFIL}${k.profile_path}` : ''}
                departman={k.known_for_department}
                enBilinenler={(k.known_for || []).slice(0, 2).map((e) => e.title || e.name).filter(Boolean)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

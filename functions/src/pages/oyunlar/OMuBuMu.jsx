import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { stildeListeFilmleriGetir } from '../../utils/disariListeler.js'
import { turnuvaGalibiKaydet, enCokTercihEdilenleriGetir } from '../../utils/filmTercih.js'
import { karistir } from '../../utils/oyunHavuzu.js'
import { useAuth } from '../../context/AuthContext.jsx'
import YatayKaydirma from '../../components/YatayKaydirma.jsx'

const TOPLAM_TUR = 15
// Sadece SIRALI, tanınmış listeler — "1001 Film" ve "Criterion" bilerek
// dışarıda tutuldu, ikisinde de çok daha az bilinen/nişteki filmler var,
// "hangisini seversin" oyununda karşılaştırma yapılamayacak kadar
// tanıdık olmayabiliyorlar.
const IZIN_VERILEN_STILLER = ['letterboxd', 'imdb']

// "O mu Bu mu" — turnuva formatı. Rastgele iki filmle başlıyor, kazanan bir
// SONRAKİ turda kalıyor (yeni bir rakiple karşılaşıyor), bu şekilde 15 tur
// sürüyor. 15. turun sonunda ayakta kalan TEK film o oyunun galibi oluyor
// ve SADECE o film "Topluluğun En Çok Tercih Ettikleri"ne bir kredi kazanıyor
// — her tekil eşleşme değil, sadece 15 turu da atlatan film.
export default function OMuBuMu() {
  const { kullanici } = useAuth()
  const [havuz, setHavuz] = useState(null)
  const [sampiyon, setSampiyon] = useState(null)
  const [meydanOkuyan, setMeydanOkuyan] = useState(null)
  const [tur, setTur] = useState(1)
  const [gecmisRakipler, setGecmisRakipler] = useState(new Set())
  const [secimYapiliyor, setSecimYapiliyor] = useState(false)
  const [oyunBitti, setOyunBitti] = useState(false)
  const [enCokTercihEdilenler, setEnCokTercihEdilenler] = useState(null)
  const [siralamaAcik, setSiralamaAcik] = useState(false)

  useEffect(() => {
    stildeListeFilmleriGetir(IZIN_VERILEN_STILLER).then((liste) => {
      setHavuz(liste)
      if (liste.length >= TOPLAM_TUR + 1) ilkTuruBaslat(liste)
    })
  }, [])

  function ilkTuruBaslat(mevcutHavuz) {
    const [a, b] = karistir(mevcutHavuz).slice(0, 2)
    setSampiyon(a)
    setMeydanOkuyan(b)
    setGecmisRakipler(new Set([a.id, b.id]))
    setTur(1)
    setOyunBitti(false)
  }

  function sonrakiRakibiSec(mevcutHavuz, disardaTutulacaklar) {
    const adaylar = mevcutHavuz.filter((f) => !disardaTutulacaklar.has(f.id))
    return karistir(adaylar)[0] || null
  }

  async function seciliyor(kazananFilm, kaybedenFilm) {
    if (!kullanici || secimYapiliyor) return
    setSecimYapiliyor(true)
    try {
      if (tur >= TOPLAM_TUR) {
        // 15. tur da kazanıldı — oyun bitti, galip krediyi alıyor.
        await turnuvaGalibiKaydet(kazananFilm)
        setSampiyon(kazananFilm)
        setOyunBitti(true)
        setEnCokTercihEdilenler(null) // sıralama bayatlamış olabilir, tekrar açılınca yenilensin
        return
      }
      const yeniRakip = sonrakiRakibiSec(havuz, new Set([...gecmisRakipler, kazananFilm.id]))
      setSampiyon(kazananFilm)
      setMeydanOkuyan(yeniRakip)
      setGecmisRakipler((onceki) => new Set([...onceki, kazananFilm.id, yeniRakip?.id]))
      setTur((t) => t + 1)
    } finally {
      setSecimYapiliyor(false)
    }
  }

  function yenidenBasla() {
    ilkTuruBaslat(havuz)
  }

  async function siralamayiAc() {
    if (!enCokTercihEdilenler) setEnCokTercihEdilenler(await enCokTercihEdilenleriGetir(20))
    setSiralamaAcik((a) => !a)
  }

  return (
    <div>
      <Link to="/oyunlar" className="text-xs text-kraft hover:text-deniz">
        ← Sinema Oyunları
      </Link>
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">🆚 O mu Bu mu</h1>
      <p className="mb-6 text-sm text-kraft">
        Letterboxd 500 ve IMDb 250'den 15 turluk bir turnuva — her turda kazanan kalır, 15. turun sonunda favorin belli olur.
      </p>

      {havuz === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {havuz !== null && havuz.length < TOPLAM_TUR + 1 && (
        <p className="text-sm text-kraft">
          Oyun için yeterli film yok — önce Letterboxd 500 ve IMDb 250 listeleri "En İyi Film Listeleri"nden içe aktarılmalı.
        </p>
      )}

      {sampiyon && !oyunBitti && meydanOkuyan && (
        <>
          <p className="mb-3 text-center text-xs text-kraft">
            Tur {tur} / {TOPLAM_TUR}
          </p>
          <div className="mx-auto max-w-md">
            <div className="relative flex items-center justify-center gap-3">
              {[sampiyon, meydanOkuyan].map((film, i) => (
                <button
                  key={film.id}
                  onClick={() => seciliyor(film, i === 0 ? meydanOkuyan : sampiyon)}
                  disabled={!kullanici || secimYapiliyor}
                  className="group w-36 shrink-0 text-left disabled:cursor-not-allowed disabled:opacity-60 sm:w-44"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu shadow-lg ring-1 ring-cizgi transition group-hover:ring-deniz/60 group-active:scale-[0.98]">
                    {film.posterUrl ? (
                      <img src={film.posterUrl} alt={film.baslik} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl opacity-40">🎬</div>
                    )}
                    {i === 0 && tur > 1 && (
                      <span className="absolute left-1 top-1 rounded-full bg-gise px-2 py-0.5 text-[10px] font-medium text-kagit">
                        🏆 {tur - 1} tur galibi
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {/* İki afişin GERÇEK ortasında dursun diye mutlak konumlandırma
                  kullanılıyor (negatif margin ile itmek posterlerin
                  yüksekliği/genişliği değiştikçe simetriyi bozuyordu) —
                  sinematik afiş/fragman dilindeki klasik "çarpışma" motifi. */}
              <div className="absolute left-1/2 top-1/2 z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-muhur font-baslik text-sm font-black italic text-kagit shadow-xl ring-4 ring-kagitKoyu sm:h-16 sm:w-16 sm:text-lg">
                VS
              </div>
            </div>
            <div className="mt-2 flex justify-center gap-3">
              {[sampiyon, meydanOkuyan].map((film) => (
                <p key={film.id} className="w-36 shrink-0 line-clamp-2 text-center text-xs font-medium text-murekkep sm:w-44 sm:text-sm">
                  {film.baslik}
                </p>
              ))}
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-kraft">
            {sampiyon.baslik} <span className="italic">mi</span>, {meydanOkuyan.baslik} <span className="italic">mi?</span>
          </p>
          {!kullanici && <p className="mt-2 text-center text-xs text-muhur">Oy kullanmak için giriş yapmalısın.</p>}
        </>
      )}

      {oyunBitti && sampiyon && (
        <div className="rounded-sm bg-kagitKoyu p-6 text-center ring-1 ring-cizgi">
          <p className="mb-3 text-sm text-kraft">🏆 {TOPLAM_TUR} turu da atlatan galip:</p>
          <div className="mx-auto w-32">
            <div className="aspect-[2/3] overflow-hidden rounded-sm ring-1 ring-cizgi">
              {sampiyon.posterUrl && <img src={sampiyon.posterUrl} alt={sampiyon.baslik} className="h-full w-full object-cover" />}
            </div>
          </div>
          <p className="mt-3 font-baslik text-lg text-murekkep">{sampiyon.baslik}</p>
          <Link to={`/film/${sampiyon.id}`} className="mt-1 inline-block text-xs text-deniz hover:underline">
            Film sayfasına git →
          </Link>
          <div className="mt-4">
            <button onClick={yenidenBasla} className="rounded-sm bg-muhur px-4 py-2 font-govde text-xs text-kagit">
              🔄 Yeniden Oyna
            </button>
          </div>
        </div>
      )}

      <div className="defter-cizgi my-8" />

      <button onClick={siralamayiAc} className="text-sm text-deniz hover:underline">
        {siralamaAcik ? 'Sıralamayı Gizle' : '🏆 Topluluğun En Çok Tercih Ettikleri'}
      </button>

      {siralamaAcik && (
        <div className="mt-4">
          {enCokTercihEdilenler === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
          {enCokTercihEdilenler?.length === 0 && <p className="text-sm text-kraft">Henüz kimse 15 turu tamamlamamış — ilk sen ol.</p>}
          {enCokTercihEdilenler?.length > 0 && (
            <YatayKaydirma>
              {enCokTercihEdilenler.map((film, i) => (
                <Link key={film.id} to={`/film/${film.id}`} className="shrink-0" style={{ width: 120 }}>
                  <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                    {film.posterUrl ? (
                      <img src={film.posterUrl} alt={film.baslik} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">🎬</div>
                    )}
                    <span className="absolute left-1 top-1 rounded-full bg-gise px-1.5 py-0.5 text-[10px] font-medium text-kagit">#{i + 1}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-murekkep">{film.baslik}</p>
                  <p className="truncate text-[10px] text-kraft">🏆 {film.kazanma || 0} kez galip</p>
                </Link>
              ))}
            </YatayKaydirma>
          )}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { tumListeFilmleriGetir } from '../../utils/disariListeler.js'
import { oyKullan, enCokTercihEdilenleriGetir } from '../../utils/filmTercih.js'
import { karistir } from '../../utils/oyunHavuzu.js'
import { useAuth } from '../../context/AuthContext.jsx'

// "En İyi Film Listeleri" (Letterboxd 500, IMDb 250, 1001 Film, Criterion —
// hepsi tek bir havuzda karışıyor) filmlerinden rastgele iki tanesini
// karşı karşıya getirip, hangisini tercih ettiğini soruyoruz. Klasik bir
// "doğru cevap var mı" oyunu değil — kişisel zevk oyunu, bu yüzden diğer
// oyunlardaki OyunIskeleti (doğru/yanlış puanlama) yerine kendi, daha basit
// bir akışı var. Topluluğun oyları birikiyor, en altta "en çok tercih
// edilenler" küçük bir liste olarak görünüyor.
export default function OMuBuMu() {
  const { kullanici } = useAuth()
  const [havuz, setHavuz] = useState(null)
  const [cift, setCift] = useState(null)
  const [oySayisi, setOySayisi] = useState(0)
  const [oyKullaniliyor, setOyKullaniliyor] = useState(false)
  const [enCokTercihEdilenler, setEnCokTercihEdilenler] = useState(null)
  const [siralamaAcik, setSiralamaAcik] = useState(false)

  useEffect(() => {
    tumListeFilmleriGetir().then((liste) => {
      setHavuz(liste)
      if (liste.length >= 2) yeniCiftSec(liste)
    })
  }, [])

  function yeniCiftSec(mevcutHavuz) {
    const [a, b] = karistir(mevcutHavuz).slice(0, 2)
    setCift([a, b])
  }

  async function seciliyor(kazanan, kaybeden) {
    if (!kullanici || oyKullaniliyor) return
    setOyKullaniliyor(true)
    try {
      await oyKullan(kazanan, kaybeden)
      setOySayisi((n) => n + 1)
      yeniCiftSec(havuz)
    } finally {
      setOyKullaniliyor(false)
    }
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
        En İyi Film Listeleri'nden iki film karşı karşıya — hangisini daha çok seversin?
      </p>

      {havuz === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {havuz !== null && havuz.length < 2 && (
        <p className="text-sm text-kraft">Oyun için yeterli film yok — önce "En İyi Film Listeleri"nden birkaç liste içe aktarılmalı.</p>
      )}

      {cift && (
        <>
          <p className="mb-3 text-center text-xs text-kraft">{oySayisi} karşılaştırma yaptın</p>
          <div className="grid grid-cols-2 gap-4">
            {cift.map((film, i) => (
              <button
                key={film.id}
                onClick={() => seciliyor(film, cift[1 - i])}
                disabled={!kullanici || oyKullaniliyor}
                className="group text-left disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi transition group-hover:ring-deniz/60 group-active:scale-[0.98]">
                  {film.posterUrl ? (
                    <img src={film.posterUrl} alt={film.baslik} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl opacity-40">🎬</div>
                  )}
                </div>
                <p className="mt-2 text-center text-sm font-medium text-murekkep">{film.baslik}</p>
              </button>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-kraft">
            {cift[0].baslik} <span className="italic">mi</span>, {cift[1].baslik} <span className="italic">mi?</span>
          </p>
          {!kullanici && <p className="mt-2 text-center text-xs text-muhur">Oy kullanmak için giriş yapmalısın.</p>}
        </>
      )}

      <div className="defter-cizgi my-8" />

      <button onClick={siralamayiAc} className="text-sm text-deniz hover:underline">
        {siralamaAcik ? 'Sıralamayı Gizle' : '🏆 Topluluğun En Çok Tercih Ettikleri'}
      </button>

      {siralamaAcik && (
        <div className="mt-4">
          {enCokTercihEdilenler === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
          {enCokTercihEdilenler?.length === 0 && <p className="text-sm text-kraft">Henüz hiç oy kullanılmamış — ilk sen ol.</p>}
          <ol className="space-y-2">
            {enCokTercihEdilenler?.map((film, i) => (
              <li key={film.id} className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-right text-xs text-kraft">{i + 1}</span>
                <div className="h-14 w-10 shrink-0 overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                  {film.posterUrl && <img src={film.posterUrl} alt={film.baslik} className="h-full w-full object-cover" />}
                </div>
                <p className="flex-1 truncate text-sm text-murekkep">{film.baslik}</p>
                <span className="shrink-0 text-xs text-kraft">
                  {film.kazanma || 0} kazandı{film.kaybetme > 0 && ` · ${film.kaybetme} kaybetti`}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

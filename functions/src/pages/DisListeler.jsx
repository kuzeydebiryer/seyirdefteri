import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { listeleriGetir, listeEkle, listeSil } from '../utils/disariListeler.js'
import LetterboxdNoktalarIkon from '../components/ikonlar/LetterboxdNoktalarIkon.jsx'
import CriterionIkon from '../components/ikonlar/CriterionIkon.jsx'
import BinBirFilmIkon from '../components/ikonlar/BinBirFilmIkon.jsx'

const STIL_ORNEKLERI = {
  imdb: { etiket: 'IMDb (sarı-siyah)', sinif: 'bg-[#F5C518] text-black' },
  letterboxd: { etiket: 'Letterboxd (yeşil)', sinif: 'bg-[#00e054]/15 text-[#00e054] ring-1 ring-[#00e054]/40' },
  criterion: { etiket: 'Criterion (siyah-beyaz)', sinif: 'bg-black text-white ring-1 ring-white/20' },
  binbirfilm: { etiket: '1001 Film (beyaz-siyah)', sinif: 'bg-white text-black ring-1 ring-cizgi' },
  genel: { etiket: 'Genel (nötr)', sinif: 'bg-kagitKoyu text-kraft ring-1 ring-cizgi' },
}

// "Dış Listeler" hub sayfası — Sinemasal Alt Türler/Platformlar ile aynı
// desen. Önceden sadece "Letterboxd 500" vardı, sabit kodlanmıştı; artık
// yönetici burada YENİ bir liste tanımlayıp (ad + görsel stil), sonra o
// listenin kendi sayfasında (bkz. DisListeDetay.jsx) CSV içe aktarabiliyor.
export default function DisListeler() {
  const { kullanici, profil } = useAuth()
  const [listeler, setListeler] = useState(null)
  const [yenile, setYenile] = useState(0)

  const [formAcik, setFormAcik] = useState(false)
  const [ad, setAd] = useState('')
  const [kisaAd, setKisaAd] = useState('')
  const [stil, setStil] = useState('genel')
  const [siraliMi, setSiraliMi] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  useEffect(() => {
    listeleriGetir().then(setListeler)
  }, [yenile])

  async function kaydet(e) {
    e.preventDefault()
    setKaydediliyor(true)
    try {
      await listeEkle(kullanici, { ad: ad.trim(), kisaAd: kisaAd.trim(), stil, siraliMi })
      setAd('')
      setKisaAd('')
      setStil('genel')
      setSiraliMi(true)
      setFormAcik(false)
      setYenile((n) => n + 1)
    } finally {
      setKaydediliyor(false)
    }
  }

  async function silTiklandi(liste) {
    if (!window.confirm(`"${liste.ad}" listesini (tüm filmleriyle birlikte) silmek istediğine emin misin?`)) return
    await listeSil(liste.id)
    setYenile((n) => n + 1)
  }

  return (
    <div>
      <Link to="/filmler" className="text-xs text-kraft hover:text-deniz">
        ← Filmler
      </Link>
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">🎞️ En İyi Film Listeleri</h1>
      <p className="mb-6 text-sm text-kraft">
        Sinema tarihinin zirvesine çıkan filmler — dünyanın en saygın topluluklarının oylarıyla şekillenen, kuşaktan
        kuşağa aktarılan başyapıt listeleri.
      </p>

      {profil?.yonetici && (
        <div className="mb-6">
          <button onClick={() => setFormAcik((a) => !a)} className="text-xs text-deniz hover:underline">
            {formAcik ? 'Vazgeç' : '+ Yeni Liste Tanımla (Yönetici)'}
          </button>
          {formAcik && (
            <form onSubmit={kaydet} className="mt-2 max-w-md space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
              <div>
                <label className="mb-1 block text-[11px] text-kraft">Liste Adı (tam)</label>
                <input
                  type="text"
                  value={ad}
                  onChange={(e) => setAd(e.target.value)}
                  placeholder="ör. IMDb En İyi 250 Film"
                  required
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-kraft">Kısa Ad (rozette görünecek)</label>
                <input
                  type="text"
                  value={kisaAd}
                  onChange={(e) => setKisaAd(e.target.value)}
                  placeholder="ör. IMDb 250"
                  required
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-kraft">Rozet Stili</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STIL_ORNEKLERI).map(([id, ornek]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setStil(id)}
                      className={`rounded-full px-2.5 py-1 text-[11px] ${ornek.sinif} ${stil === id ? 'ring-2 ring-offset-1 ring-offset-kagitKoyu' : ''}`}
                    >
                      {ornek.etiket}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-murekkep">
                <input type="checkbox" checked={siraliMi} onChange={(e) => setSiraliMi(e.target.checked)} />
                Bu liste sıralı (Letterboxd 500 gibi sıra numarası önemli — "1001 Film" gibi sadece üyelik listesiyse kapat)
              </label>
              <button type="submit" disabled={kaydediliyor} className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40">
                {kaydediliyor ? 'Kaydediliyor...' : 'Listeyi Tanımla'}
              </button>
            </form>
          )}
        </div>
      )}

      {listeler === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {listeler !== null && listeler.length === 0 && <p className="text-sm text-kraft">Henüz hiç liste tanımlanmamış.</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {listeler?.map((liste) => (
          <div key={liste.id} className="flex items-center justify-between rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
            <Link to={`/dis-liste/${liste.id}`} className="flex-1 hover:text-deniz">
              <p className="flex items-center gap-1.5 font-baslik text-base text-murekkep">
                {liste.stil === 'letterboxd' && <LetterboxdNoktalarIkon className="h-4 w-9 shrink-0" />}
                {liste.stil === 'criterion' && <CriterionIkon className="h-4 w-4 shrink-0" />}
                {liste.stil === 'binbirfilm' && <BinBirFilmIkon className="shrink-0 px-1 py-0.5 text-[10px]" />}
                {liste.ad}
              </p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${STIL_ORNEKLERI[liste.stil]?.sinif || ''}`}>
                {liste.kisaAd}
              </span>
            </Link>
            {profil?.yonetici && (
              <button onClick={() => silTiklandi(liste)} className="ml-2 shrink-0 text-xs text-kraft hover:text-muhur">
                🗑️
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

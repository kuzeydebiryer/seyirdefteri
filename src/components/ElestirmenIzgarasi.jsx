import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { ELESTIRI_KELIME_SINIRI, elestiriKaydet, elestiriSil, elestirileriGetir, kelimeSay } from '../utils/elestiri.js'
import Avatar from './Avatar.jsx'
import YildizPuan from './YildizPuan.jsx'
import YildizSecici from './YildizSecici.jsx'

// Film inceleme etkinliğinin altındaki "🎭 Eleştirmenler" ızgarası: her üyenin
// kutusunda adı/@kullanıcı adı, yıldız puanı ve tek cümlelik yorumu. Izgara
// sadece YAZAN üyeleri gösteriyor (sabit 4 kutu değil) — topluluk büyüdükçe
// kendiliğinden genişliyor, henüz yazmayanlar için boş kutu çizilmiyor.
export default function ElestirmenIzgarasi({ etkinlik }) {
  const { kullanici, profil } = useAuth()
  const [elestiriler, setElestiriler] = useState([])
  const [uyeMi, setUyeMi] = useState(false)
  const [formAcik, setFormAcik] = useState(false)
  const [puan, setPuan] = useState(0)
  const [cumle, setCumle] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState('')

  const benimki = kullanici ? elestiriler.find((e) => e.id === kullanici.uid) : null
  const kelimeSayisi = kelimeSay(cumle)
  const limitAsildi = kelimeSayisi > ELESTIRI_KELIME_SINIRI

  useEffect(() => {
    elestirileriGetir(etkinlik.id)
      .then(setElestiriler)
      .catch((err) => console.error('Eleştiriler yüklenemedi:', err))
  }, [etkinlik.id])

  // Yazma izni sadece etkinliğin topluluğunun üyelerinde (Firestore kuralı da
  // aynısını denetliyor) — üye değilse formu hiç göstermiyoruz.
  useEffect(() => {
    if (!kullanici || !etkinlik.topluluklId) {
      setUyeMi(false)
      return
    }
    getDoc(doc(db, 'topluluklar', etkinlik.topluluklId, 'uyeler', kullanici.uid))
      .then((snap) => setUyeMi(snap.exists()))
      .catch(() => setUyeMi(false))
  }, [kullanici, etkinlik.topluluklId])

  function formuAc() {
    setPuan(benimki?.puan || 0)
    setCumle(benimki?.cumle || '')
    setHata('')
    setFormAcik(true)
  }

  async function kaydet(e) {
    e.preventDefault()
    if (!puan) return setHata('Önce bir puan ver.')
    if (!cumle.trim()) return setHata('Filmi özetleyen kısa bir cümle yaz.')
    if (limitAsildi) return setHata(`En fazla ${ELESTIRI_KELIME_SINIRI} kelime.`)
    setKaydediliyor(true)
    setHata('')
    try {
      await elestiriKaydet(etkinlik.id, { kullanici, profil, puan, cumle })
      setElestiriler(await elestirileriGetir(etkinlik.id))
      setFormAcik(false)
    } catch (err) {
      setHata(`Kaydedilemedi: ${err.message}`)
    } finally {
      setKaydediliyor(false)
    }
  }

  async function sil() {
    if (!window.confirm('Eleştirini silmek istediğine emin misin?')) return
    await elestiriSil(etkinlik.id, kullanici.uid)
    setElestiriler((liste) => liste.filter((e) => e.id !== kullanici.uid))
    setFormAcik(false)
  }

  const ortalama = elestiriler.length > 0 ? elestiriler.reduce((t, e) => t + (e.puan || 0), 0) / elestiriler.length : null

  return (
    <div className="mt-3 border-t border-cizgi pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-baslik text-sm text-murekkep">
          🎭 Eleştirmenler
          {ortalama != null && (
            <span className="ml-2 font-govde text-[11px] text-kraft">
              ⭐ {(ortalama * 2).toFixed(1)}/10 · {elestiriler.length} eleştirmen
            </span>
          )}
        </p>
        {uyeMi && !formAcik && (
          <button onClick={formuAc} className="rounded-full bg-gise px-3 py-1 font-govde text-[11px] text-kagit">
            {benimki ? '✎ Eleştirimi Düzenle' : '+ Eleştirimi Yaz'}
          </button>
        )}
      </div>

      {formAcik && (
        <form onSubmit={kaydet} className="mb-3 space-y-2 rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
          <YildizSecici deger={puan} onSec={setPuan} boyut="text-2xl" />
          <div>
            <input
              type="text"
              value={cumle}
              onChange={(e) => setCumle(e.target.value)}
              placeholder="Filmi tek cümleyle özetle..."
              className="w-full rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
            />
            <p className={`mt-0.5 text-right text-[10px] ${limitAsildi ? 'text-muhur' : 'text-kraft'}`}>
              {kelimeSayisi}/{ELESTIRI_KELIME_SINIRI} kelime
            </p>
          </div>
          {hata && <p className="text-[11px] text-muhur">{hata}</p>}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={kaydediliyor || limitAsildi}
              className="rounded-sm bg-muhur px-3 py-1 font-govde text-[11px] text-kagit disabled:opacity-40"
            >
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button
              type="button"
              onClick={() => setFormAcik(false)}
              className="rounded-sm bg-kagitKoyu px-3 py-1 text-[11px] text-kraft ring-1 ring-cizgi"
            >
              Vazgeç
            </button>
            {benimki && (
              <button type="button" onClick={sil} className="ml-auto text-[11px] text-kraft hover:text-muhur">
                Sil
              </button>
            )}
          </div>
        </form>
      )}

      {elestiriler.length === 0 ? (
        <p className="text-xs text-kraft">Henüz eleştiri yazılmadı.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {elestiriler.map((e) => (
            <div key={e.id} className="flex flex-col rounded-sm bg-kagit p-2.5 ring-1 ring-cizgi">
              <Link to={`/profil/${e.kullaniciId}`} className="flex items-center gap-1.5">
                <Avatar adSoyad={e.kullaniciAdi} avatarUrl={e.avatarUrl} boyut="h-6 w-6" />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-xs text-murekkep">{e.kullaniciAdi}</span>
                  {e.kullaniciAdiKisa && <span className="block truncate text-[10px] text-kraft">@{e.kullaniciAdiKisa}</span>}
                </span>
              </Link>
              <div className="mt-1.5">
                <YildizPuan puan={e.puan} boyut="text-sm" />
              </div>
              <p className="mt-1 font-baslik text-xs italic leading-snug text-murekkep">“{e.cumle}”</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { sonHabercileriGetir, katilimDegistir, habercSil } from '../utils/etkinlikHabercisi.js'
import HabercKarti from './HabercKarti.jsx'

// Anasayfada Kitap Dünyası'nın altında — elle girilen en son 3 etkinlik
// duyurusu, /etkinlik-dunyasi'ndaki TAM haliyle aynı kart (HabercKarti)
// kullanılarak. Katılım/silme burada da çalışıyor, ayrı bir salt-okunur
// kopya değil. "Tümünü Gör" ile duyuru eklemenin/tamamını görmenin olduğu
// sayfaya gidiliyor.
export default function EtkinlikHabercisiOnizleme() {
  const { kullanici } = useAuth()
  const [habercler, setHaberciler] = useState(null)

  useEffect(() => {
    sonHabercileriGetir(3).then(setHaberciler)
  }, [])

  async function katilimDegistirTiklandi(haberci) {
    if (!kullanici) return
    const katiliyorMu = haberci.katilacaklar.includes(kullanici.uid)
    setHaberciler((liste) =>
      liste.map((h) =>
        h.id === haberci.id
          ? { ...h, katilacaklar: katiliyorMu ? h.katilacaklar.filter((u) => u !== kullanici.uid) : [...h.katilacaklar, kullanici.uid] }
          : h
      )
    )
    await katilimDegistir(haberci.id, kullanici.uid, katiliyorMu)
  }

  async function silTiklandi(habercId) {
    if (!window.confirm('Bu duyuruyu silmek istediğine emin misin?')) return
    await habercSil(habercId)
    setHaberciler((liste) => liste.filter((h) => h.id !== habercId))
  }

  if (habercler !== null && habercler.length === 0) return null

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">📢 Etkinlik Habercisi</h2>
        <Link to="/etkinlik-dunyasi" className="shrink-0 whitespace-nowrap text-sm text-kraft hover:text-deniz">
          Tümünü Gör ›
        </Link>
      </div>

      {habercler === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {habercler !== null && (
        <div className="grid gap-4 sm:grid-cols-3">
          {habercler.map((h) => (
            <HabercKarti key={h.id} haberci={h} kullanici={kullanici} onKatilimDegistir={katilimDegistirTiklandi} onSil={silTiklandi} />
          ))}
        </div>
      )}
    </div>
  )
}

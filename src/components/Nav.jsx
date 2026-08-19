import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTema } from '../context/TemaContext.jsx'
import { bildirimDurumu, bildirimleriEtkinlestir, bildirimleriKapat } from '../utils/bildirim.js'
import BildirimZili from './BildirimZili.jsx'
import TiyatroMaskeleriIkon from './ikonlar/TiyatroMaskeleriIkon.jsx'
import OscarHeykelIkon from './ikonlar/OscarHeykelIkon.jsx'
import Avatar from './Avatar.jsx'
import Logo from './Logo.jsx'

// Kişiler profile, Etkinlikler Topluluklar sayfasına taşındı. Yönetmenler
// artık Oyuncular sayfasının içinde (ayrı menü maddesi değil). Akış, anasayfa
// artık sade bir vitrin olduğu için kendi bağımsız sayfasına taşındı.
const LINKLER = [
  { yol: '/akis', etiket: 'Akış', ikon: '🗒️' },
  { yol: '/filmler', etiket: 'Film', ikon: '🎬' },
  { yol: '/diziler', etiket: 'Dizi', ikon: '📺' },
  { yol: '/oyuncular', etiket: 'Oyuncu', ikon: '🎭' },
  { yol: '/oscar', etiket: 'Oscar', ikon: '🏆' },
  { yol: '/festival', etiket: 'Festival', ikon: '🎪' },
  { yol: '/kitaplar', etiket: 'Kitap', ikon: '📚' },
  { yol: '/yazilar', etiket: 'Yazı', ikon: '📝' },
  { yol: '/gezi', etiket: 'Gezi', ikon: '✈️' },
  { yol: '/etkinlik-dunyasi', etiket: 'Etkinlik', ikon: '🎟️' },
  { yol: '/oyunlar', etiket: 'Oyunlar', ikon: '🎲' },
]
const TOPLULUK_LINKLERI = [{ yol: '/topluluklar', etiket: 'Topluluk', ikon: '👥' }]

export default function Nav() {
  const { kullanici, profil, cikisYap } = useAuth()
  const { tema, temaDegistir } = useTema()
  const navigate = useNavigate()
  const [menuAcik, setMenuAcik] = useState(false)
  const [bildirimIzni, setBildirimIzni] = useState('default')
  const [bildirimDestekli, setBildirimDestekli] = useState(false)
  const [bildirimIsleniyor, setBildirimIsleniyor] = useState(false)

  useEffect(() => {
    bildirimDurumu().then(({ destekleniyor, izin }) => {
      setBildirimDestekli(destekleniyor)
      setBildirimIzni(izin)
    })
  }, [])

  async function bildirimDegistir() {
    if (!kullanici || bildirimIsleniyor) return
    setBildirimIsleniyor(true)
    try {
      if (bildirimIzni === 'granted') {
        await bildirimleriKapat(kullanici)
        setBildirimIzni('default')
      } else {
        await bildirimleriEtkinlestir(kullanici)
        setBildirimIzni('granted')
      }
    } catch (e) {
      window.alert(e.message)
    } finally {
      setBildirimIsleniyor(false)
    }
  }

  async function cikis() {
    setMenuAcik(false)
    await cikisYap()
    navigate('/giris')
  }

  const linkSinifi = ({ isActive }) => (isActive ? 'text-muhur' : 'text-kraft hover:text-murekkep')

  return (
    <header className="border-b border-cizgi">
      <div className="mx-auto flex max-w-3xl items-center px-4 py-4">
        <Link to="/" onClick={() => setMenuAcik(false)} className="shrink-0">
          <Logo sadeceIkon boyut={34} />
        </Link>

        <span className="ml-2.5 font-baslik text-lg text-murekkep sm:hidden">Seyirdefteri</span>

        {kullanici ? (
          <div className="ml-auto flex items-center">
            {/* Masaüstü menüsü */}
            <nav className="hidden sm:flex items-center gap-x-5 font-govde text-sm">
              {[...LINKLER, ...TOPLULUK_LINKLERI].map((l) => (
                <NavLink key={l.yol} to={l.yol} className={linkSinifi}>
                  {l.etiket}
                </NavLink>
              ))}
              <NavLink to={`/profil/${kullanici.uid}`} className={linkSinifi}>
                <span className="flex items-center gap-2">
                  <Avatar adSoyad={profil?.adSoyad} avatarUrl={profil?.avatarUrl} boyut="h-6 w-6" />
                  {profil?.kullaniciAdi || 'Profil'}
                </span>
              </NavLink>
              <BildirimZili />
              {bildirimDestekli && bildirimIzni !== 'denied' && (
                <button
                  onClick={bildirimDegistir}
                  disabled={bildirimIsleniyor}
                  className="text-kraft hover:text-murekkep disabled:opacity-40"
                  title={bildirimIzni === 'granted' ? 'Push bildirimlerini kapat' : 'Push bildirimlerini aç'}
                >
                  {bildirimIzni === 'granted' ? '📳' : '🔕'}
                </button>
              )}
              <button onClick={temaDegistir} className="text-kraft hover:text-murekkep" title={tema === 'koyu' ? 'Aydınlık moda geç' : 'Karanlık moda geç'}>
                <TiyatroMaskeleriIkon tema={tema} boyut={28} />
              </button>
              <button onClick={cikis} className="text-kraft hover:text-murekkep">
                Çıkış
              </button>
            </nav>

            {/* Mobilde hamburger düğmesi */}
            <div className="sm:hidden flex h-9 w-9 items-center justify-center">
              <BildirimZili />
            </div>
            <button
              onClick={temaDegistir}
              className="sm:hidden flex h-9 w-9 items-center justify-center rounded-sm text-murekkep"
              aria-label={tema === 'koyu' ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
            >
              <TiyatroMaskeleriIkon tema={tema} boyut={28} />
            </button>
            <button
              onClick={() => setMenuAcik((a) => !a)}
              className="sm:hidden flex h-9 w-9 items-center justify-center rounded-sm text-murekkep"
              aria-label="Menü"
            >
              {menuAcik ? '✕' : '☰'}
            </button>
          </div>
        ) : (
          <nav className="ml-auto flex items-center gap-4 font-govde text-sm">
            <button onClick={temaDegistir} className="text-kraft hover:text-murekkep" title={tema === 'koyu' ? 'Aydınlık moda geç' : 'Karanlık moda geç'}>
              <TiyatroMaskeleriIkon tema={tema} boyut={28} />
            </button>
            <NavLink to="/giris" className="text-kraft hover:text-murekkep">
              Giriş
            </NavLink>
            <NavLink to="/kayit" className="rounded-sm bg-muhur px-3 py-1.5 text-kagit">
              Katıl
            </NavLink>
          </nav>
        )}
      </div>
      <div className="defter-cizgi" />

      {/* Mobil açılır menü — tam ekran overlay: sayfayı itmek yerine üzerine biner,
          piksel hesabına bağlı kalmamak için kendi başlık satırını taşıyor. */}
      {kullanici && menuAcik && (
        <nav className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-kagit font-govde text-sm sm:hidden">
          <div className="flex items-center justify-between border-b border-cizgi px-4 py-4">
            <Logo sadeceIkon boyut={34} />
            <button
              onClick={() => setMenuAcik(false)}
              className="flex h-9 w-9 items-center justify-center rounded-sm text-murekkep"
              aria-label="Menüyü kapat"
            >
              ✕
            </button>
          </div>

          <div className="px-4 py-3">
            <NavLink
              to={`/profil/${kullanici.uid}`}
              onClick={() => setMenuAcik(false)}
              className={({ isActive }) => `flex items-center gap-2 rounded-sm px-2 py-2.5 ${isActive ? 'text-muhur' : 'text-murekkep'}`}
            >
              <Avatar adSoyad={profil?.adSoyad} avatarUrl={profil?.avatarUrl} boyut="h-7 w-7" />
              <span className="font-medium">{profil?.kullaniciAdi || 'Profil'}</span>
            </NavLink>

            <NavLink
              to="/basvurular"
              onClick={() => setMenuAcik(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-sm px-2 py-2 ${isActive ? 'text-muhur' : 'text-kraft'}`}
            >
              <span className="w-5 text-center">📨</span>
              Üyelik Başvuruları
            </NavLink>

            <div className="defter-cizgi my-1" />

            {LINKLER.map((l) => (
              <NavLink
                key={l.yol}
                to={l.yol}
                onClick={() => setMenuAcik(false)}
                className={({ isActive }) => `flex items-center gap-3 rounded-sm px-2 py-2 ${isActive ? 'text-muhur' : 'text-kraft'}`}
              >
                <span className="w-5 text-center">{l.yol === '/oscar' ? <OscarHeykelIkon boyut={16} className="inline-block" /> : l.ikon}</span>
                {l.etiket}
              </NavLink>
            ))}

            <div className="defter-cizgi my-1" />

            {TOPLULUK_LINKLERI.map((l) => (
              <NavLink
                key={l.yol}
                to={l.yol}
                onClick={() => setMenuAcik(false)}
                className={({ isActive }) => `flex items-center gap-3 rounded-sm px-2 py-2 ${isActive ? 'text-muhur' : 'text-kraft'}`}
              >
                <span className="w-5 text-center">{l.yol === '/oscar' ? <OscarHeykelIkon boyut={16} className="inline-block" /> : l.ikon}</span>
                {l.etiket}
              </NavLink>
            ))}

            <div className="defter-cizgi my-1" />

            {bildirimDestekli && bildirimIzni !== 'denied' && (
              <button
                onClick={bildirimDegistir}
                disabled={bildirimIsleniyor}
                className="flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left text-kraft disabled:opacity-40"
              >
                <span className="w-5 text-center">{bildirimIzni === 'granted' ? '📳' : '🔕'}</span>
                {bildirimIzni === 'granted' ? 'Push Bildirimlerini Kapat' : 'Push Bildirimlerini Aç'}
              </button>
            )}

            <button onClick={temaDegistir} className="flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left text-kraft">
              <span className="w-7 text-center"><TiyatroMaskeleriIkon tema={tema} boyut={24} className="inline-block" /></span>
              {tema === 'koyu' ? 'Aydınlık Mod' : 'Karanlık Mod'}
            </button>

            <div className="defter-cizgi my-1" />

            <button onClick={cikis} className="w-full rounded-sm px-2 py-2.5 text-left text-kraft/70">
              Çıkış
            </button>
          </div>
        </nav>
      )}
    </header>
  )
}

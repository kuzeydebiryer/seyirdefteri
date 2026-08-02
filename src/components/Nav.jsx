import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from './Avatar.jsx'
import Logo from './Logo.jsx'

// Akış ve Ekle kaldırıldı — Anasayfa'nın kendisi zaten akış ve "Günce Ekle" butonunu
// içeriyor. Kişiler profile, Etkinlikler Topluluklar sayfasına taşındı. Yönetmenler
// artık Oyuncular sayfasının içinde (ayrı menü maddesi değil).
const LINKLER = [
  { yol: '/filmler', etiket: 'Film', ikon: '🎬' },
  { yol: '/diziler', etiket: 'Dizi', ikon: '📺' },
  { yol: '/kitaplar', etiket: 'Kitap', ikon: '📚' },
  { yol: '/yazilar', etiket: 'Yazı', ikon: '📝' },
  { yol: '/gezi', etiket: 'Gezi', ikon: '✈️' },
  { yol: '/oyuncular', etiket: 'Oyuncular', ikon: '🎭' },
]
const TOPLULUK_LINKLERI = [
  { yol: '/topluluklar', etiket: 'Topluluklar', ikon: '👥' },
  { yol: '/oscar', etiket: 'Oscar', ikon: '🏆' },
]

export default function Nav() {
  const { kullanici, profil, cikisYap } = useAuth()
  const navigate = useNavigate()
  const [menuAcik, setMenuAcik] = useState(false)

  async function cikis() {
    setMenuAcik(false)
    await cikisYap()
    navigate('/giris')
  }

  const linkSinifi = ({ isActive }) => (isActive ? 'text-muhur' : 'text-kraft hover:text-murekkep')

  return (
    <header className="border-b border-cizgi">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link to="/" onClick={() => setMenuAcik(false)}>
          <Logo sadeceIkon boyut={34} />
        </Link>

        {kullanici ? (
          <>
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
              <button onClick={cikis} className="text-kraft hover:text-murekkep">
                Çıkış
              </button>
            </nav>

            {/* Mobilde hamburger düğmesi */}
            <button
              onClick={() => setMenuAcik((a) => !a)}
              className="sm:hidden flex h-9 w-9 items-center justify-center rounded-sm text-murekkep"
              aria-label="Menü"
            >
              {menuAcik ? '✕' : '☰'}
            </button>
          </>
        ) : (
          <nav className="flex items-center gap-4 font-govde text-sm">
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

            <div className="defter-cizgi my-1" />

            {LINKLER.map((l) => (
              <NavLink
                key={l.yol}
                to={l.yol}
                onClick={() => setMenuAcik(false)}
                className={({ isActive }) => `flex items-center gap-3 rounded-sm px-2 py-2 ${isActive ? 'text-muhur' : 'text-kraft'}`}
              >
                <span className="w-5 text-center">{l.ikon}</span>
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
                <span className="w-5 text-center">{l.ikon}</span>
                {l.etiket}
              </NavLink>
            ))}

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

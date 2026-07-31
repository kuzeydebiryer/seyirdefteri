import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from './Avatar.jsx'
import Logo from './Logo.jsx'

// Akış ve Ekle kaldırıldı — Anasayfa'nın kendisi zaten akış ve "Günce Ekle" butonunu
// içeriyor. Kişiler profile, Etkinlikler Topluluklar sayfasına taşındı. Yönetmenler
// artık Oyuncular sayfasının içinde (ayrı menü maddesi değil).
const LINKLER = [
  { yol: '/filmler', etiket: 'Film' },
  { yol: '/diziler', etiket: 'Dizi' },
  { yol: '/kitaplar', etiket: 'Kitap' },
  { yol: '/yazilar', etiket: 'Yazı' },
  { yol: '/gezi', etiket: 'Gezi' },
  { yol: '/oyuncular', etiket: 'Oyuncular' },
  { yol: '/topluluklar', etiket: 'Topluluklar' },
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
              {LINKLER.map((l) => (
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

      {/* Mobil açılır menü */}
      {kullanici && menuAcik && (
        <nav className="sm:hidden flex flex-col gap-1 bg-kagitKoyu px-4 py-3 font-govde text-sm">
          <NavLink
            to={`/profil/${kullanici.uid}`}
            onClick={() => setMenuAcik(false)}
            className={({ isActive }) => `flex items-center gap-2 py-2 ${isActive ? 'text-muhur' : 'text-murekkep'}`}
          >
            <Avatar adSoyad={profil?.adSoyad} avatarUrl={profil?.avatarUrl} boyut="h-6 w-6" />
            {profil?.kullaniciAdi || 'Profil'}
          </NavLink>
          <div className="defter-cizgi my-1" />
          {LINKLER.map((l) => (
            <NavLink
              key={l.yol}
              to={l.yol}
              onClick={() => setMenuAcik(false)}
              className={({ isActive }) => `py-2 ${isActive ? 'text-muhur' : 'text-kraft'}`}
            >
              {l.etiket}
            </NavLink>
          ))}
          <button onClick={cikis} className="py-2 text-left text-kraft">
            Çıkış
          </button>
        </nav>
      )}
    </header>
  )
}

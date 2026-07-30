import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from './Avatar.jsx'

export default function Nav() {
  const { kullanici, profil, cikisYap } = useAuth()
  const navigate = useNavigate()

  async function cikis() {
    await cikisYap()
    navigate('/giris')
  }

  return (
    <header className="border-b border-cizgi">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <NavLink to="/" className="font-baslik text-2xl text-murekkep">
          Seyirdefteri
        </NavLink>
        {kullanici ? (
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 font-govde text-sm">
            <NavLink
              to="/"
              className={({ isActive }) => (isActive ? 'text-muhur' : 'text-kraft hover:text-murekkep')}
            >
              Akış
            </NavLink>
            <NavLink
              to="/gonderi-ekle"
              className={({ isActive }) => (isActive ? 'text-muhur' : 'text-kraft hover:text-murekkep')}
            >
              Ekle
            </NavLink>
            <NavLink
              to="/kullanicilar"
              className={({ isActive }) => (isActive ? 'text-muhur' : 'text-kraft hover:text-murekkep')}
            >
              Keşfet
            </NavLink>
            <NavLink
              to="/etkinlikler"
              className={({ isActive }) => (isActive ? 'text-muhur' : 'text-kraft hover:text-murekkep')}
            >
              Etkinlikler
            </NavLink>
            <NavLink
              to="/topluluklar"
              className={({ isActive }) => (isActive ? 'text-muhur' : 'text-kraft hover:text-murekkep')}
            >
              Topluluklar
            </NavLink>
            <NavLink
              to={`/profil/${kullanici.uid}`}
              className={({ isActive }) => (isActive ? 'text-muhur' : 'text-kraft hover:text-murekkep')}
            >
              <span className="flex items-center gap-2">
                <Avatar adSoyad={profil?.adSoyad} avatarUrl={profil?.avatarUrl} boyut="h-6 w-6" />
                {profil?.kullaniciAdi || 'Profil'}
              </span>
            </NavLink>
            <button onClick={cikis} className="text-kraft hover:text-murekkep">
              Çıkış
            </button>
          </nav>
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
    </header>
  )
}

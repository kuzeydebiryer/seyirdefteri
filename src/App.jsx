import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import OzelRota from './components/OzelRota.jsx'
import Anasayfa from './pages/Anasayfa.jsx'
import GirisYap from './pages/GirisYap.jsx'
import KayitOl from './pages/KayitOl.jsx'
import GonderiEkle from './pages/GonderiEkle.jsx'
import GonderiDetay from './pages/GonderiDetay.jsx'
import Profil from './pages/Profil.jsx'
import Kullanicilar from './pages/Kullanicilar.jsx'
import Etkinlikler from './pages/Etkinlikler.jsx'
import Topluluklar from './pages/Topluluklar.jsx'
import TopluluklarDetay from './pages/TopluluklarDetay.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-kagit">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Routes>
          <Route path="/" element={<OzelRota><Anasayfa /></OzelRota>} />
          <Route path="/giris" element={<GirisYap />} />
          <Route path="/kayit" element={<KayitOl />} />
          <Route path="/gonderi-ekle" element={<OzelRota><GonderiEkle /></OzelRota>} />
          <Route path="/gonderi/:id" element={<OzelRota><GonderiDetay /></OzelRota>} />
          <Route path="/profil/:uid" element={<OzelRota><Profil /></OzelRota>} />
          <Route path="/kullanicilar" element={<OzelRota><Kullanicilar /></OzelRota>} />
          <Route path="/etkinlikler" element={<OzelRota><Etkinlikler /></OzelRota>} />
          <Route path="/topluluklar" element={<OzelRota><Topluluklar /></OzelRota>} />
          <Route path="/topluluk/:id" element={<OzelRota><TopluluklarDetay /></OzelRota>} />
        </Routes>
      </main>
    </div>
  )
}

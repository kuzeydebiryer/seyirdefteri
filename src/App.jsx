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
import EserSayfasi from './pages/EserSayfasi.jsx'
import Filmler from './pages/Filmler.jsx'
import Diziler from './pages/Diziler.jsx'
import KitaplarKesfet from './pages/KitaplarKesfet.jsx'

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
          <Route path="/filmler" element={<OzelRota><Filmler /></OzelRota>} />
          <Route path="/diziler" element={<OzelRota><Diziler /></OzelRota>} />
          <Route path="/kitaplar" element={<OzelRota><KitaplarKesfet /></OzelRota>} />
          <Route path="/film/:id" element={<OzelRota><EserSayfasi tur="sinema" /></OzelRota>} />
          <Route path="/dizi/:id" element={<OzelRota><EserSayfasi tur="dizi" /></OzelRota>} />
          <Route path="/kitap/:id" element={<OzelRota><EserSayfasi tur="kitap" /></OzelRota>} />
        </Routes>
      </main>
    </div>
  )
}

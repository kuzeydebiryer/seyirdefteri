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
import ListeDetay from './pages/ListeDetay.jsx'
import EserSayfasi from './pages/EserSayfasi.jsx'
import KisiSayfasi from './pages/KisiSayfasi.jsx'
import Filmler from './pages/Filmler.jsx'
import Diziler from './pages/Diziler.jsx'
import KitaplarKesfet from './pages/KitaplarKesfet.jsx'
import KitapKatalogBakimi from './pages/KitapKatalogBakimi.jsx'
import Oyuncular from './pages/Oyuncular.jsx'
import Yazilar from './pages/Yazilar.jsx'
import Gezi from './pages/Gezi.jsx'
import YonetmenSayfasi from './pages/YonetmenSayfasi.jsx'
import YazarSayfasi from './pages/YazarSayfasi.jsx'
import RafDetay from './pages/RafDetay.jsx'

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
          <Route path="/topluluk/:topluluklId/liste/:listeId" element={<OzelRota><ListeDetay /></OzelRota>} />
          <Route path="/filmler" element={<OzelRota><Filmler /></OzelRota>} />
          <Route path="/diziler" element={<OzelRota><Diziler /></OzelRota>} />
          <Route path="/kitaplar" element={<OzelRota><KitaplarKesfet /></OzelRota>} />
          <Route path="/kitaplar/bakim" element={<OzelRota><KitapKatalogBakimi /></OzelRota>} />
          <Route path="/oyuncular" element={<OzelRota><Oyuncular /></OzelRota>} />
          <Route path="/yazilar" element={<OzelRota><Yazilar /></OzelRota>} />
          <Route path="/gezi" element={<OzelRota><Gezi /></OzelRota>} />
          <Route path="/yonetmen/:id" element={<OzelRota><YonetmenSayfasi /></OzelRota>} />
          <Route path="/yazar/:ad" element={<OzelRota><YazarSayfasi /></OzelRota>} />
          <Route path="/raf/:id" element={<OzelRota><RafDetay /></OzelRota>} />
          <Route path="/film/:id" element={<OzelRota><EserSayfasi tur="sinema" /></OzelRota>} />
          <Route path="/dizi/:id" element={<OzelRota><EserSayfasi tur="dizi" /></OzelRota>} />
          <Route path="/kitap/:id" element={<OzelRota><EserSayfasi tur="kitap" /></OzelRota>} />
          <Route path="/kisi/:id" element={<OzelRota><KisiSayfasi /></OzelRota>} />
        </Routes>
      </main>
    </div>
  )
}

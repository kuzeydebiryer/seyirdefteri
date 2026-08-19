import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import OzelRota from './components/OzelRota.jsx'
import Anasayfa from './pages/Anasayfa.jsx'
import Akis from './pages/Akis.jsx'
import GirisYap from './pages/GirisYap.jsx'
import KayitOl from './pages/KayitOl.jsx'
import UyelikBasvuru from './pages/UyelikBasvuru.jsx'
import Basvurular from './pages/Basvurular.jsx'
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
import Listelerim from './pages/Listelerim.jsx'
import Oscar from './pages/Oscar.jsx'
import Festivaller from './pages/Festivaller.jsx'
import TurSayfasi from './pages/TurSayfasi.jsx'
import KisiselListeDetay from './pages/KisiselListeDetay.jsx'
import AlintiDuvari from './pages/AlintiDuvari.jsx'
import Oyuncular from './pages/Oyuncular.jsx'
import Yazilar from './pages/Yazilar.jsx'
import Gezi from './pages/Gezi.jsx'
import EtkinlikDunyasi from './pages/EtkinlikDunyasi.jsx'
import YazarSayfasi from './pages/YazarSayfasi.jsx'
import NobelYazarlari from './pages/NobelYazarlari.jsx'
import YayineviSayfasi from './pages/YayineviSayfasi.jsx'
import KitapKategoriSayfasi from './pages/KitapKategoriSayfasi.jsx'
import RafDetay from './pages/RafDetay.jsx'
import TavsiyelerSayfasi from './pages/TavsiyelerSayfasi.jsx'
import Oyunlar from './pages/Oyunlar.jsx'
import Sinemadle from './pages/oyunlar/Sinemadle.jsx'
import SloganTahmin from './pages/oyunlar/SloganTahmin.jsx'
import SahneTahmin from './pages/oyunlar/SahneTahmin.jsx'
import OyuncuTahmin from './pages/oyunlar/OyuncuTahmin.jsx'
import PosterTahmin from './pages/oyunlar/PosterTahmin.jsx'
import FilmKoprusu from './pages/oyunlar/FilmKoprusu.jsx'
import AlintiTahmin from './pages/oyunlar/AlintiTahmin.jsx'
import MuzikTahmin from './pages/oyunlar/MuzikTahmin.jsx'

// Sayfalar birleştirildi (bkz. KisiSayfasi.jsx) — eski /yonetmen/:id linkleri
// (yer imleri, dışarıdan gelen linkler) kırılmasın diye /kisi/:id'ye yönlendiriyoruz.
function YonetmenYonlendirme() {
  const { id } = useParams()
  return <Navigate to={`/kisi/${id}`} replace />
}

export default function App() {
  return (
    <div className="min-h-screen bg-kagit">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Routes>
          <Route path="/" element={<OzelRota><Anasayfa /></OzelRota>} />
          <Route path="/akis" element={<OzelRota><Akis /></OzelRota>} />
          <Route path="/giris" element={<GirisYap />} />
          <Route path="/kayit" element={<KayitOl />} />
          <Route path="/uyelik-basvuru" element={<UyelikBasvuru />} />
          <Route path="/basvurular" element={<OzelRota><Basvurular /></OzelRota>} />
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
          <Route path="/listelerim" element={<OzelRota><Listelerim /></OzelRota>} />
          <Route path="/oscar" element={<OzelRota><Oscar /></OzelRota>} />
          <Route path="/festival" element={<OzelRota><Festivaller /></OzelRota>} />
          <Route path="/tur/:tur/:turId" element={<OzelRota><TurSayfasi /></OzelRota>} />
          <Route path="/liste/:listeId" element={<OzelRota><KisiselListeDetay /></OzelRota>} />
          <Route path="/alintilar" element={<OzelRota><AlintiDuvari /></OzelRota>} />
          <Route path="/oyuncular" element={<OzelRota><Oyuncular /></OzelRota>} />
          <Route path="/yazilar" element={<OzelRota><Yazilar /></OzelRota>} />
          <Route path="/gezi" element={<OzelRota><Gezi /></OzelRota>} />
          <Route path="/etkinlik-dunyasi" element={<OzelRota><EtkinlikDunyasi /></OzelRota>} />
          <Route path="/yonetmen/:id" element={<OzelRota><YonetmenYonlendirme /></OzelRota>} />
          <Route path="/yazar/:ad" element={<OzelRota><YazarSayfasi /></OzelRota>} />
          <Route path="/nobel-yazarlari" element={<OzelRota><NobelYazarlari /></OzelRota>} />
          <Route path="/yayinevi/:ad" element={<OzelRota><YayineviSayfasi /></OzelRota>} />
          <Route path="/kitap-kategori/:kategori" element={<OzelRota><KitapKategoriSayfasi /></OzelRota>} />
          <Route path="/raf/:id" element={<OzelRota><RafDetay /></OzelRota>} />
          <Route
            path="/film-tavsiyeleri"
            element={
              <OzelRota>
                <TavsiyelerSayfasi tur="sinema" baslik="🎬 Film Tavsiyeleri" />
              </OzelRota>
            }
          />
          <Route
            path="/yeni-gelen-filmler"
            element={
              <OzelRota>
                <TavsiyelerSayfasi tur="sinema" koleksiyon="yeniGelenFilmler" baslik="🆕 Yeni Gelen Filmler" ekleButonuMetni="+ Film Ekle" />
              </OzelRota>
            }
          />
          <Route
            path="/kitap-tavsiyeleri"
            element={
              <OzelRota>
                <TavsiyelerSayfasi tur="kitap" baslik="📖 Kitap Tavsiyeleri" />
              </OzelRota>
            }
          />
          <Route path="/oyunlar" element={<OzelRota><Oyunlar /></OzelRota>} />
          <Route path="/oyunlar/sinemadle" element={<OzelRota><Sinemadle /></OzelRota>} />
          <Route path="/oyunlar/slogan" element={<OzelRota><SloganTahmin /></OzelRota>} />
          <Route path="/oyunlar/sahne" element={<OzelRota><SahneTahmin /></OzelRota>} />
          <Route path="/oyunlar/oyuncu" element={<OzelRota><OyuncuTahmin /></OzelRota>} />
          <Route path="/oyunlar/poster" element={<OzelRota><PosterTahmin /></OzelRota>} />
          <Route path="/oyunlar/kopru" element={<OzelRota><FilmKoprusu /></OzelRota>} />
          <Route path="/oyunlar/alinti" element={<OzelRota><AlintiTahmin /></OzelRota>} />
          <Route path="/oyunlar/muzik" element={<OzelRota><MuzikTahmin /></OzelRota>} />
          <Route path="/film/:id" element={<OzelRota><EserSayfasi tur="sinema" /></OzelRota>} />
          <Route path="/dizi/:id" element={<OzelRota><EserSayfasi tur="dizi" /></OzelRota>} />
          <Route path="/kitap/:id" element={<OzelRota><EserSayfasi tur="kitap" /></OzelRota>} />
          <Route path="/kisi/:id" element={<OzelRota><KisiSayfasi /></OzelRota>} />
        </Routes>
      </main>
    </div>
  )
}

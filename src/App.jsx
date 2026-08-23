import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import OzelRota from './components/OzelRota.jsx'
import Anasayfa from './pages/Anasayfa.jsx'

// PERFORMANS: Anasayfa dışındaki TÜM sayfalar React.lazy() ile yükleniyor.
// Önceden hepsi düz `import` idi — bu, Vite'ın PDF motoru (jsPDF+html2canvas),
// üç ayrı dünya haritası kütüphanesi (react-simple-maps) ve 70+ sayfanın
// TAMAMINI tek, ~1.9MB'lık bir JS paketinde birleştirmesine sebep oluyordu;
// kullanıcı sadece anasayfayı açsa bile bunların hepsini indiriyordu (Google
// PageSpeed Insights'ta düşük Performans skorunun ana sebebi buydu). Artık
// her sayfanın kodu SADECE o sayfaya gidildiğinde indiriliyor. Anasayfa,
// en sık girilen sayfa olduğu için bilinçli olarak eager (lazy değil)
// bırakıldı — ilk açılışta ekstra bir ağ turu (spinner göster → indir)
// yaşanmasın diye.
const Akis = lazy(() => import('./pages/Akis.jsx'))
const GirisYap = lazy(() => import('./pages/GirisYap.jsx'))
const KayitOl = lazy(() => import('./pages/KayitOl.jsx'))
const UyelikBasvuru = lazy(() => import('./pages/UyelikBasvuru.jsx'))
const DusunceArsivi = lazy(() => import('./pages/DusunceArsivi.jsx'))
const DusunceHavuzuYonetim = lazy(() => import('./pages/DusunceHavuzuYonetim.jsx'))
const IlhamPanosu = lazy(() => import('./pages/IlhamPanosu.jsx'))
const Basvurular = lazy(() => import('./pages/Basvurular.jsx'))
const GonderiEkle = lazy(() => import('./pages/GonderiEkle.jsx'))
const GonderiDetay = lazy(() => import('./pages/GonderiDetay.jsx'))
const Profil = lazy(() => import('./pages/Profil.jsx'))
const Kullanicilar = lazy(() => import('./pages/Kullanicilar.jsx'))
const Etkinlikler = lazy(() => import('./pages/Etkinlikler.jsx'))
const Topluluklar = lazy(() => import('./pages/Topluluklar.jsx'))
const TopluluklarDetay = lazy(() => import('./pages/TopluluklarDetay.jsx'))
const ListeDetay = lazy(() => import('./pages/ListeDetay.jsx'))
const EserSayfasi = lazy(() => import('./pages/EserSayfasi.jsx'))
const KisiSayfasi = lazy(() => import('./pages/KisiSayfasi.jsx'))
const Filmler = lazy(() => import('./pages/Filmler.jsx'))
const Diziler = lazy(() => import('./pages/Diziler.jsx'))
const KitaplarKesfet = lazy(() => import('./pages/KitaplarKesfet.jsx'))
const KitapKatalogBakimi = lazy(() => import('./pages/KitapKatalogBakimi.jsx'))
const Listelerim = lazy(() => import('./pages/Listelerim.jsx'))
const Oscar = lazy(() => import('./pages/Oscar.jsx'))
const Festivaller = lazy(() => import('./pages/Festivaller.jsx'))
const TurSayfasi = lazy(() => import('./pages/TurSayfasi.jsx'))
const KisiselListeDetay = lazy(() => import('./pages/KisiselListeDetay.jsx'))
const AlintiDuvari = lazy(() => import('./pages/AlintiDuvari.jsx'))
const Oyuncular = lazy(() => import('./pages/Oyuncular.jsx'))
const Yazilar = lazy(() => import('./pages/Yazilar.jsx'))
const Gezi = lazy(() => import('./pages/Gezi.jsx'))
const GeziPlanlarim = lazy(() => import('./pages/GeziPlanlarim.jsx'))
const GeziPlaniDetay = lazy(() => import('./pages/GeziPlaniDetay.jsx'))
const EtkinlikDunyasi = lazy(() => import('./pages/EtkinlikDunyasi.jsx'))
const YazarSayfasi = lazy(() => import('./pages/YazarSayfasi.jsx'))
const NobelYazarlari = lazy(() => import('./pages/NobelYazarlari.jsx'))
const YayineviSayfasi = lazy(() => import('./pages/YayineviSayfasi.jsx'))
const KitapKategoriSayfasi = lazy(() => import('./pages/KitapKategoriSayfasi.jsx'))
const RafDetay = lazy(() => import('./pages/RafDetay.jsx'))
const TavsiyelerSayfasi = lazy(() => import('./pages/TavsiyelerSayfasi.jsx'))
const Oyunlar = lazy(() => import('./pages/Oyunlar.jsx'))
const Sinemadle = lazy(() => import('./pages/oyunlar/Sinemadle.jsx'))
const SloganTahmin = lazy(() => import('./pages/oyunlar/SloganTahmin.jsx'))
const SahneTahmin = lazy(() => import('./pages/oyunlar/SahneTahmin.jsx'))
const OyuncuTahmin = lazy(() => import('./pages/oyunlar/OyuncuTahmin.jsx'))
const PosterTahmin = lazy(() => import('./pages/oyunlar/PosterTahmin.jsx'))
const FilmKoprusu = lazy(() => import('./pages/oyunlar/FilmKoprusu.jsx'))
const AlintiTahmin = lazy(() => import('./pages/oyunlar/AlintiTahmin.jsx'))
const MuzikTahmin = lazy(() => import('./pages/oyunlar/MuzikTahmin.jsx'))

// Sayfalar birleştirildi (bkz. KisiSayfasi.jsx) — eski /yonetmen/:id linkleri
// (yer imleri, dışarıdan gelen linkler) kırılmasın diye /kisi/:id'ye yönlendiriyoruz.
// Eski /ilham-panosu linkleri (yer imleri, bildirimler, dışarıdan gelen
// linkler) kırılmasın diye /seyir-panosu'ya yönlendiriyoruz — kategori/ülke/
// mekan gibi sorgu parametreleri de korunuyor.
function IlhamPanosuYonlendirme() {
  const { search } = useLocation()
  return <Navigate to={`/seyir-panosu${search}`} replace />
}

function YonetmenYonlendirme() {
  const { id } = useParams()
  return <Navigate to={`/kisi/${id}`} replace />
}

// Sayfa kodu indirilirken (lazy chunk) gösterilen minik, sade bir bekleme
// göstergesi — büyük bir spinner/iskelet yerine, sitenin kağıt temasıyla
// uyumlu tek satırlık bir metin (chunk'lar zaten küçük, çoğu zaman göze bile
// çarpmaz, ama tamamen boş bir ekran yerine bunu tercih ediyoruz).
function SayfaYukleniyor() {
  return <p className="py-10 text-center text-sm text-kraft">Yükleniyor...</p>
}

export default function App() {
  return (
    <div className="min-h-screen bg-kagit">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Suspense fallback={<SayfaYukleniyor />}>
          <Routes>
            <Route path="/" element={<OzelRota><Anasayfa /></OzelRota>} />
            <Route path="/akis" element={<OzelRota><Akis /></OzelRota>} />
            <Route path="/giris" element={<GirisYap />} />
            <Route path="/kayit" element={<KayitOl />} />
            <Route path="/uyelik-basvuru" element={<UyelikBasvuru />} />
            <Route path="/dusunce-arsivi" element={<OzelRota><DusunceArsivi /></OzelRota>} />
            <Route path="/dusunce-havuzu-yonetim" element={<OzelRota><DusunceHavuzuYonetim /></OzelRota>} />
            <Route path="/ilham-panosu" element={<IlhamPanosuYonlendirme />} />
            <Route path="/seyir-panosu" element={<OzelRota><IlhamPanosu /></OzelRota>} />
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
            <Route path="/gezi-planlarim" element={<OzelRota><GeziPlanlarim /></OzelRota>} />
            <Route path="/gezi-plani/:id" element={<OzelRota><GeziPlaniDetay /></OzelRota>} />
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
        </Suspense>
      </main>
    </div>
  )
}

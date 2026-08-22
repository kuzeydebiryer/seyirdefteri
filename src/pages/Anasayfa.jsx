import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { takipEdilenUidleriGetir } from '../hooks/useTakip.js'
import { useTavsiyeler } from '../hooks/useTavsiyeler.js'
import { takipAktiviteleriGetir } from '../utils/gunluk.js'
import GonderiEkle from './GonderiEkle.jsx'
import YeniGunlukGridi from '../components/YeniGunlukGridi.jsx'
import TavsiyeBolumu from '../components/TavsiyeBolumu.jsx'
import TopluluklarBildirimSeridi from '../components/TopluluklarBildirimSeridi.jsx'
import BugunAktifOlanlarBolumu from '../components/BugunAktifOlanlarBolumu.jsx'
import SeyirPanosuOnizleme from '../components/SeyirPanosuOnizleme.jsx'
import KulupEtkinlikleriOnizleme from '../components/KulupEtkinlikleriOnizleme.jsx'
import GunlukKesif from '../components/GunlukKesif.jsx'
import KitapDunyasiWidget from '../components/KitapDunyasiWidget.jsx'
import EtkinlikHabercisiOnizleme from '../components/EtkinlikHabercisiOnizleme.jsx'
import EtkinlikOneCikanlar from '../components/EtkinlikOneCikanlar.jsx'
import BugununDusuncesiWidget from '../components/BugununDusuncesiWidget.jsx'
import SonAlintilarBolumu from '../components/SonAlintilarBolumu.jsx'
import Logo from '../components/Logo.jsx'

// Anasayfa artık sitenin temel mantığını (günlük tutma) en üstte, doğrudan
// karşılıyor — "Günce Ekle" formu /gonderi-ekle sayfasından AYNEN (kod
// tekrarı olmadan, doğrudan bileşen olarak) buraya gömülü. Kategori
// seçilince (Film/Dizi/Kitap/Yazı/Gezi/Etkinlik) tam formu burada açılıyor,
// başka bir sayfaya gitmeye gerek yok. Sıralama bilinçli: önce "ekle" (temel
// eylem), sonra "keşfet" (tavsiyeler, günceler, vitrin widget'ları).
export default function Anasayfa() {
  const { kullanici } = useAuth()
  const [takipEdilenler, setTakipEdilenler] = useState(null) // null = henüz yüklenmedi

  const { tavsiyeler: filmTavsiyeleri, yenidenYukle: filmTavsiyeleriYenile } = useTavsiyeler('sinema')
  const { tavsiyeler: yeniGelenFilmler, yenidenYukle: yeniGelenFilmleriYenile } = useTavsiyeler('sinema', 'yeniGelenFilmler')
  const { tavsiyeler: kitapTavsiyeleri, yenidenYukle: kitapTavsiyeleriYenile } = useTavsiyeler('kitap')

  useEffect(() => {
    if (!kullanici) return
    let iptal = false
    takipEdilenUidleriGetir(kullanici.uid).then((uidler) => {
      if (!iptal) setTakipEdilenler(uidler)
    })
    return () => {
      iptal = true
    }
  }, [kullanici])

  const takipHazirMi = takipEdilenler !== null

  const [takipGunlukKayitlari, setTakipGunlukKayitlari] = useState([])
  useEffect(() => {
    if (!takipHazirMi || takipEdilenler.length === 0) {
      setTakipGunlukKayitlari([])
      return
    }
    let iptal = false
    // Tek paylaşılan fonksiyon (bkz. utils/gunluk.js) — puanlama + yorum +
    // TAM GÖNDERİ (inceleme/günce) hepsi burada birleşiyor. Bu üçünü ayrı
    // ayrı çekip burada tekrar birleştirmiyoruz artık, çünkü tam da bu
    // tekrar riski yüzünden gönderiler bir süre widget'ta hiç görünmemişti.
    takipAktiviteleriGetir(takipEdilenler, 15).then((liste) => {
      if (!iptal) setTakipGunlukKayitlari(liste)
    })
    return () => {
      iptal = true
    }
  }, [takipHazirMi, takipEdilenler?.join(',')])

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Logo sadeceIkon boyut={22} />
        <p className="font-baslik text-sm text-murekkep">
          Seyirdefteri <span className="font-govde italic text-kraft">— Kültür ve sanat hayatının ortak günlüğü.</span>
        </p>
      </div>

      {kullanici && (
        <div className="mb-10 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <GonderiEkle kompaktMod />
        </div>
      )}

      <TopluluklarBildirimSeridi />

      <SeyirPanosuOnizleme />

      <KulupEtkinlikleriOnizleme />

      <YeniGunlukGridi kayitlar={takipGunlukKayitlari} tumunuGorLink="/akis" />

      <TavsiyeBolumu
        tur="sinema"
        tavsiyeler={filmTavsiyeleri}
        yenidenYukle={filmTavsiyeleriYenile}
        yatay
        sade
        baslik="Film Tavsiyeleri"
        tumunuGorLink="/film-tavsiyeleri"
      />

      <TavsiyeBolumu
        tur="sinema"
        koleksiyon="yeniGelenFilmler"
        tavsiyeler={yeniGelenFilmler}
        yenidenYukle={yeniGelenFilmleriYenile}
        yatay
        sade
        baslik="Yeni Gelen Filmler"
        tumunuGorLink="/yeni-gelen-filmler"
        ekleButonuMetni="+ Film Ekle"
      />

      <TavsiyeBolumu
        tur="kitap"
        tavsiyeler={kitapTavsiyeleri}
        yenidenYukle={kitapTavsiyeleriYenile}
        yatay
        sade
        baslik="Kitap Tavsiyeleri"
        tumunuGorLink="/kitap-tavsiyeleri"
      />

      <SonAlintilarBolumu limitSayisi={3} />

      <KitapDunyasiWidget />

      <GunlukKesif />

      <BugununDusuncesiWidget />

      <BugunAktifOlanlarBolumu />

      <EtkinlikHabercisiOnizleme />

      <div className="mb-3">
        <h2 className="font-baslik text-lg text-murekkep">⭐ Öne Çıkan Etkinlikler</h2>
      </div>
      <EtkinlikOneCikanlar />
    </div>
  )
}

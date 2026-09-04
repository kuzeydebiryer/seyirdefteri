import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { takipEdilenUidleriGetir } from '../hooks/useTakip.js'
import { useTavsiyeler } from '../hooks/useTavsiyeler.js'
import { takipAktiviteleriGetir } from '../utils/gunluk.js'
import GonderiEkle from './GonderiEkle.jsx'
import YeniGunlukGridi from '../components/YeniGunlukGridi.jsx'
import TavsiyeBolumu from '../components/TavsiyeBolumu.jsx'
import PlatformYeniGelenlerBolumu from '../components/PlatformYeniGelenlerBolumu.jsx'
import OdullerVitrini from '../components/OdullerVitrini.jsx'
import TopluluklarBildirimSeridi from '../components/TopluluklarBildirimSeridi.jsx'
import BugunAktifOlanlarBolumu from '../components/BugunAktifOlanlarBolumu.jsx'
import SeyirPanosuOnizleme from '../components/SeyirPanosuOnizleme.jsx'
import KulupEtkinlikleriOnizleme from '../components/KulupEtkinlikleriOnizleme.jsx'
import GunlukKesif from '../components/GunlukKesif.jsx'
import KitapDunyasiWidget from '../components/KitapDunyasiWidget.jsx'
import KitapAriyorumWidget from '../components/KitapAriyorumWidget.jsx'
import EtkinlikHabercisiOnizleme from '../components/EtkinlikHabercisiOnizleme.jsx'
import EtkinlikOneCikanlar from '../components/EtkinlikOneCikanlar.jsx'
import BugununDusuncesiWidget from '../components/BugununDusuncesiWidget.jsx'
import SonAlintilarBolumu from '../components/SonAlintilarBolumu.jsx'
import SonYorumlarBolumu from '../components/SonYorumlarBolumu.jsx'

// Anasayfa artık sitenin temel mantığını (günlük tutma) en üstte, doğrudan
// karşılıyor — "Günce Ekle" formu /gonderi-ekle sayfasından AYNEN (kod
// tekrarı olmadan, doğrudan bileşen olarak) buraya gömülü. Kategori
// seçilince (Film/Dizi/Kitap/Yazı/Gezi/Etkinlik) tam formu burada açılıyor,
// başka bir sayfaya gitmeye gerek yok. Sıralama bilinçli: önce "ekle" (temel
// eylem), sonra "keşfet" (tavsiyeler, günceler, vitrin widget'ları).
// Günce Ekle'deki kalıbı iki widget'ta daha kullanmak için — Yaklaşan Ödül
// Törenleri ve Film & Kitap Kulübü, "Uygula"lık bir eylem olmasalar da
// (bunlar içerik önizlemesi) sık sık boş/az veriyle gelebiliyorlar ve
// öncelik sırası "Yeni Güncemler"in altında — kapalı başlayıp isteyince
// açılmaları hem yer kazandırıyor hem de tutarlı bir görsel dil kuruyor.
function AcilirKapanirBolum({ etiket, children }) {
  const [acik, setAcik] = useState(false)
  return (
    <div className="mb-10">
      {acik ? (
        <>
          <button onClick={() => setAcik(false)} className="mb-2 text-xs text-kraft hover:text-murekkep">
            ✕ Kapat
          </button>
          {children}
        </>
      ) : (
        <button
          onClick={() => setAcik(true)}
          className="flex items-center gap-2 rounded-full bg-kagitKoyu px-4 py-2 font-govde text-sm text-murekkep ring-1 ring-cizgi transition hover:ring-deniz/50"
        >
          {etiket}
        </button>
      )}
    </div>
  )
}

export default function Anasayfa() {
  const { kullanici } = useAuth()
  const [takipEdilenler, setTakipEdilenler] = useState(null) // null = henüz yüklenmedi
  const [gunceFormAcik, setGunceFormAcik] = useState(false)

  const { tavsiyeler: filmTavsiyeleri, yenidenYukle: filmTavsiyeleriYenile } = useTavsiyeler('sinema')
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
      {kullanici && (
        <div className="mb-10">
          {gunceFormAcik ? (
            <div className="rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
              <div className="mb-2 flex items-center justify-between">
                <h1 className="font-baslik text-2xl text-murekkep">Günce Ekle</h1>
                <button onClick={() => setGunceFormAcik(false)} className="text-xs text-kraft hover:text-murekkep">
                  ✕ Kapat
                </button>
              </div>
              <GonderiEkle kompaktMod baslikGizli onBasariylaEklendi={() => setGunceFormAcik(false)} />
            </div>
          ) : (
            <div>
              <p className="mb-2 font-govde text-sm italic text-kraft">Kültür ve sanat hayatının ortak günlüğü.</p>
              <button
                onClick={() => setGunceFormAcik(true)}
                className="flex items-center gap-2 rounded-full bg-kagitKoyu px-4 py-2 font-govde text-sm text-murekkep ring-1 ring-cizgi transition hover:ring-deniz/50"
              >
                🪶 Günce Ekle
              </button>
            </div>
          )}
        </div>
      )}

      <TopluluklarBildirimSeridi />

      <YeniGunlukGridi kayitlar={takipGunlukKayitlari} tumunuGorLink="/akis" siki />

      <TavsiyeBolumu
        tur="sinema"
        tavsiyeler={filmTavsiyeleri}
        yenidenYukle={filmTavsiyeleriYenile}
        yatay
        sade
        baslik="Film Tavsiyeleri"
        tumunuGorLink="/film-tavsiyeleri"
        siki
      />

      <PlatformYeniGelenlerBolumu siki />

      <TavsiyeBolumu
        tur="kitap"
        tavsiyeler={kitapTavsiyeleri}
        yenidenYukle={kitapTavsiyeleriYenile}
        yatay
        sade
        baslik="Kitap Tavsiyeleri"
        tumunuGorLink="/kitap-tavsiyeleri"
      />

      <SonYorumlarBolumu />

      <SonAlintilarBolumu limitSayisi={3} />

      <KitapAriyorumWidget />

      <KitapDunyasiWidget />

      <SeyirPanosuOnizleme />

      <GunlukKesif />

      <BugununDusuncesiWidget />

      <AcilirKapanirBolum etiket="🏆 Yaklaşan Ödül Törenleri">
        <OdullerVitrini />
      </AcilirKapanirBolum>

      <AcilirKapanirBolum etiket="🎬📖 Film & Kitap Kulübü">
        <KulupEtkinlikleriOnizleme />
      </AcilirKapanirBolum>

      <EtkinlikHabercisiOnizleme />

      <div className="mb-3">
        <h2 className="font-baslik text-lg text-murekkep">⭐ Öne Çıkan Etkinlikler</h2>
      </div>
      <EtkinlikOneCikanlar />

      <BugunAktifOlanlarBolumu />
    </div>
  )
}

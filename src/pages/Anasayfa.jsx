import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useGonderiler } from '../hooks/useGonderiler.js'
import { takipEdilenUidleriGetir } from '../hooks/useTakip.js'
import { useTavsiyeler } from '../hooks/useTavsiyeler.js'
import { alintiBegenDegistir, sonAlintilariGetir } from '../utils/alinti.js'
import GonderiKarti from '../components/GonderiKarti.jsx'
import HabercKarti from '../components/HabercKarti.jsx'
import AlintiKarti from '../components/AlintiKarti.jsx'
import TavsiyeBolumu from '../components/TavsiyeBolumu.jsx'
import KitapDunyasiWidget from '../components/KitapDunyasiWidget.jsx'
import OneCikanlarSeridi from '../components/OneCikanlarSeridi.jsx'
import TopluluklarBildirimSeridi from '../components/TopluluklarBildirimSeridi.jsx'
import GunlukKesif from '../components/GunlukKesif.jsx'
import Logo from '../components/Logo.jsx'
import { sonHabercileriGetir, katilimDegistir, habercSil } from '../utils/etkinlikHabercisi.js'

const ALINTI_FILTRE_ID = 'alinti'
const SANAT_FILTRE_ID = 'sanat'

// Gerçek gönderi türleri (GonderiEkle.jsx'teki KATEGORILER ile birebir aynı)
// + Alıntı ve Sanat için özel eşlemeler. "Sanat" ayrı bir üst-tür değil —
// Yazı altında "Sanat Eleştirisi" alt türü, bu yüzden tur+altTur birlikte
// filtreleniyor. "Alıntı" ise hiç gönderi değil, ayrı bir koleksiyon —
// seçilince gönderi sorgusu tamamen devre dışı kalıp alıntılar çekiliyor.
const TUR_FILTRELERI = [
  { id: '', etiket: 'Tümü' },
  { id: 'sinema', etiket: '🎬 Film' },
  { id: 'dizi', etiket: '📺 Dizi' },
  { id: 'kitap', etiket: '📖 Kitap' },
  { id: ALINTI_FILTRE_ID, etiket: '💬 Alıntı' },
  { id: SANAT_FILTRE_ID, etiket: '🖼️ Sanat' },
  { id: 'yazi', etiket: '✍️ Yazı' },
  { id: 'gezi', etiket: '🧳 Gezi' },
  { id: 'etkinlik', etiket: '🎟️ Etkinlik' },
]

// turFiltre değerini gerçek Firestore alan(lar)ına çevirir.
function turAltTurEsle(turFiltre) {
  if (turFiltre === SANAT_FILTRE_ID) return { tur: 'yazi', altTur: 'sanat-elestirisi' }
  if (turFiltre === '' || turFiltre === ALINTI_FILTRE_ID) return { tur: undefined, altTur: undefined }
  return { tur: turFiltre, altTur: undefined }
}

export default function Anasayfa() {
  const { kullanici } = useAuth()
  const [sekme, setSekme] = useState('takip') // 'takip' | 'herkes'
  const [turFiltre, setTurFiltre] = useState('') // '' = tümü
  const [takipEdilenler, setTakipEdilenler] = useState(null) // null = henüz yüklenmedi
  const [takipListesiYukleniyor, setTakipListesiYukleniyor] = useState(true)

  // Anasayfadaki 3 yatay şerit: Film Tavsiyeleri, Yeni Gelen Filmler, Kitap
  // Tavsiyeleri. Film/Dizi/Kitap sayfalarındaki mevcut (grid görünümlü)
  // widget'lara dokunmuyoruz — aynı veriyi burada yatay (letterboxd tarzı)
  // gösteriyoruz. "Yeni Gelen Filmler" ayrı bir koleksiyon (yeniGelenFilmler),
  // kişisel tavsiyelerle karışmasın diye.
  const { tavsiyeler: filmTavsiyeleri, yenidenYukle: filmTavsiyeleriYenile } = useTavsiyeler('sinema')
  const { tavsiyeler: yeniGelenFilmler, yenidenYukle: yeniGelenFilmleriYenile } = useTavsiyeler('sinema', 'yeniGelenFilmler')
  const { tavsiyeler: kitapTavsiyeleri, yenidenYukle: kitapTavsiyeleriYenile } = useTavsiyeler('kitap')

  useEffect(() => {
    if (!kullanici) return
    let iptal = false
    setTakipListesiYukleniyor(true)
    takipEdilenUidleriGetir(kullanici.uid).then((uidler) => {
      if (iptal) return
      setTakipEdilenler(uidler)
      if (uidler.length === 0) setSekme('herkes') // kimseyi takip etmiyorsa direkt genel akışı göster
      setTakipListesiYukleniyor(false)
    })
    return () => {
      iptal = true
    }
  }, [kullanici])

  // Takip listesi henüz yüklenmeden "takip" sorgusunu boş listeyle tetiklememek için
  // (aksi halde bir an için "kimseyi takip etmiyorsun" mesajı yanlışlıkla görünüyordu)
  const takipHazirMi = takipEdilenler !== null
  const takipFiltresi = takipHazirMi ? [...takipEdilenler, kullanici.uid] : []
  const sorguAktifMi = sekme === 'herkes' || takipHazirMi

  // "Alıntı" filtresi bir gönderi türü değil — seçiliyken gönderi sorgusu
  // tamamen devre dışı bırakılıp aşağıdaki ayrı efektle alıntılar çekiliyor.
  const alintiFiltresiAktifMi = turFiltre === ALINTI_FILTRE_ID
  const { tur: efektifTur, altTur: efektifAltTur } = turAltTurEsle(turFiltre)

  const { gonderiler, yukleniyor, hata, dahaFazlaVarMi, dahaFazlaYukle } = useGonderiler(
    alintiFiltresiAktifMi
      ? { yazarIdListesi: [] } // ağ isteği yapmadan boş sonuç döner — alıntılar ayrı bir kaynaktan geliyor
      : !sorguAktifMi
      ? undefined
      : sekme === 'takip'
      ? { yazarIdListesi: takipFiltresi, tur: efektifTur, altTur: efektifAltTur }
      : { tur: efektifTur, altTur: efektifAltTur }
  )

  const [alintiListesi, setAlintiListesi] = useState([])
  const [alintiYukleniyor, setAlintiYukleniyor] = useState(false)

  useEffect(() => {
    if (!alintiFiltresiAktifMi) return
    let iptal = false
    setAlintiYukleniyor(true)
    sonAlintilariGetir(30).then((liste) => {
      if (iptal) return
      setAlintiListesi(liste)
      setAlintiYukleniyor(false)
    })
    return () => {
      iptal = true
    }
  }, [alintiFiltresiAktifMi])

  async function alintiBegenTiklandi(alinti) {
    if (!kullanici) return
    const begeniyorMu = (alinti.begenenler || []).includes(kullanici.uid)
    setAlintiListesi((liste) =>
      liste.map((a) =>
        a.id === alinti.id
          ? { ...a, begenenler: begeniyorMu ? a.begenenler.filter((u) => u !== kullanici.uid) : [...(a.begenenler || []), kullanici.uid] }
          : a
      )
    )
    await alintiBegenDegistir(alinti.id, kullanici.uid, begeniyorMu)
  }

  const gercektenYukleniyor = alintiFiltresiAktifMi
    ? alintiYukleniyor
    : !sorguAktifMi || (sekme === 'takip' && takipListesiYukleniyor) || yukleniyor

  // Etkinlik Habercisi'nde paylaşılan duyurular da akışta günce gibi (ama ayrı
  // bir kart tasarımıyla) beliriyor — sabit bir bölüm değil, tarihe göre karışık.
  const [habercler, setHaberciler] = useState([])
  useEffect(() => {
    sonHabercileriGetir(10).then(setHaberciler)
  }, [])

  async function habercKatilimDegistir(haberci) {
    if (!kullanici) return
    const katiliyorMu = haberci.katilacaklar.includes(kullanici.uid)
    setHaberciler((liste) =>
      liste.map((h) =>
        h.id === haberci.id
          ? { ...h, katilacaklar: katiliyorMu ? h.katilacaklar.filter((u) => u !== kullanici.uid) : [...h.katilacaklar, kullanici.uid] }
          : h
      )
    )
    await katilimDegistir(haberci.id, kullanici.uid, katiliyorMu)
  }

  async function habercSilTiklandi(habercId) {
    if (!window.confirm('Bu duyuruyu silmek istediğine emin misin?')) return
    await habercSil(habercId)
    setHaberciler((liste) => liste.filter((h) => h.id !== habercId))
  }

  // Günceler + duyurular, tarihe göre karışık (duyurular "Takip Ettiklerim"
  // sekmesinde de görünür — bu bilerek böyle, çünkü bir duyuru kimin
  // paylaştığından bağımsız olarak topluluğa faydalı bir bilgi).
  // Duyurular (Etkinlik Habercisi) her zaman "etkinlik" temalı olduğu için,
  // bir tür filtresi aktifken sadece "Tümü" veya "Etkinlik" seçiliyse akışa
  // karışıyor — aksi halde ör. "Kitap" filtresinde alakasız bir duyuru çıkardı.
  const habercilerGosterilsinMi = turFiltre === '' || turFiltre === 'etkinlik'
  const akisOgeleri = [...gonderiler.map((g) => ({ ...g, _tur: 'gonderi' })), ...(habercilerGosterilsinMi ? habercler : [])]
  akisOgeleri.sort((a, b) => {
    const aZaman = (a._tur === 'haberci' ? a.eklemeTarihi : a.tarih)?.toMillis?.() || 0
    const bZaman = (b._tur === 'haberci' ? b.eklemeTarihi : b.tarih)?.toMillis?.() || 0
    return bZaman - aZaman
  })

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Logo sadeceIkon boyut={22} />
        <p className="font-baslik text-sm text-murekkep">
          Seyirdefteri <span className="font-govde italic text-kraft">— Kültür hayatının ortak günlüğü.</span>
        </p>
      </div>

      <OneCikanlarSeridi />

      <TopluluklarBildirimSeridi />

      <TavsiyeBolumu
        tur="sinema"
        tavsiyeler={filmTavsiyeleri}
        yenidenYukle={filmTavsiyeleriYenile}
        yatay
        baslik="🎬 Film Tavsiyeleri"
        tumunuGorLink="/film-tavsiyeleri"
      />

      <TavsiyeBolumu
        tur="sinema"
        koleksiyon="yeniGelenFilmler"
        tavsiyeler={yeniGelenFilmler}
        yenidenYukle={yeniGelenFilmleriYenile}
        yatay
        baslik="🆕 Yeni Gelen Filmler"
        tumunuGorLink="/yeni-gelen-filmler"
        ekleButonuMetni="+ Film Ekle"
      />

      <TavsiyeBolumu
        tur="kitap"
        tavsiyeler={kitapTavsiyeleri}
        yenidenYukle={kitapTavsiyeleriYenile}
        yatay
        baslik="📖 Kitap Tavsiyeleri"
        tumunuGorLink="/kitap-tavsiyeleri"
      />

      <div className="flex items-center justify-between mb-4">
        <h1 className="font-baslik text-2xl text-murekkep">Akış</h1>
        <Link to="/gonderi-ekle" className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-sm text-kagit">
          + Günce Ekle
        </Link>
      </div>

      <GunlukKesif />

      <KitapDunyasiWidget />

      <div className="mb-4 flex gap-4 text-sm font-govde">
        <button
          onClick={() => setSekme('takip')}
          className={sekme === 'takip' ? 'text-muhur font-medium' : 'text-kraft hover:text-murekkep'}
        >
          Takip Ettiklerim
        </button>
        <button
          onClick={() => setSekme('herkes')}
          className={sekme === 'herkes' ? 'text-muhur font-medium' : 'text-kraft hover:text-murekkep'}
        >
          Herkes
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TUR_FILTRELERI.map((f) => (
          <button
            key={f.id}
            onClick={() => setTurFiltre(f.id)}
            className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
              turFiltre === f.id ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagit text-kraft ring-cizgi hover:text-murekkep'
            }`}
          >
            {f.etiket}
          </button>
        ))}
      </div>

      {gercektenYukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {hata && <p className="text-sm text-muhur">Bir hata oldu: {hata}</p>}

      {alintiFiltresiAktifMi ? (
        <>
          {!gercektenYukleniyor && alintiListesi.length === 0 && (
            <p className="text-sm text-kraft">Henüz hiç alıntı paylaşılmamış.</p>
          )}
          {!gercektenYukleniyor && alintiListesi.length > 0 && (
            <ul className="space-y-3">
              {alintiListesi.map((a) => (
                <AlintiKarti key={a.id} alinti={a} kullanici={kullanici} onBegenTiklandi={alintiBegenTiklandi} />
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          {!gercektenYukleniyor && gonderiler.length === 0 && sekme === 'takip' && (
            <p className="text-sm text-kraft">
              Henüz kimseyi takip etmiyorsun. <button onClick={() => setSekme('herkes')} className="text-muhur">Herkes</button> sekmesinden
              keşfedip takip edebilirsin.
            </p>
          )}
          {!gercektenYukleniyor && gonderiler.length === 0 && sekme === 'herkes' && (
            <p className="text-sm text-kraft">
              Henüz hiç günce yok. İlk paylaşımı sen yap: <Link to="/gonderi-ekle" className="text-muhur">Günce Ekle</Link>
            </p>
          )}

          {!gercektenYukleniyor && (
            <div className="space-y-4">
              {akisOgeleri.map((oge, i) => (
                <div key={oge.id}>
                  {oge._tur === 'haberci' ? (
                    <HabercKarti haberci={oge} kullanici={kullanici} onKatilimDegistir={habercKatilimDegistir} onSil={habercSilTiklandi} />
                  ) : (
                    <GonderiKarti gonderi={oge} />
                  )}
                  {i < akisOgeleri.length - 1 && <div className="defter-cizgi mt-4" />}
                </div>
              ))}
            </div>
          )}
          {!gercektenYukleniyor && dahaFazlaVarMi && (
            <button
              onClick={dahaFazlaYukle}
              disabled={yukleniyor}
              className="mt-6 rounded-sm bg-kagitKoyu px-4 py-2 font-govde text-sm text-kraft ring-1 ring-cizgi hover:text-murekkep disabled:opacity-40"
            >
              {yukleniyor ? 'Yükleniyor...' : 'Daha Fazla Göster'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

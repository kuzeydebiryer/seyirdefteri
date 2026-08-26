import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useGonderiler } from '../hooks/useGonderiler.js'
import { useTakip, takipEdilenProfilleriGetir } from '../hooks/useTakip.js'
import { useFavoriler } from '../hooks/useFavoriler.js'
import { useIzlenecekler } from '../hooks/useIzlenecekler.js'
import { useYorumlarim } from '../hooks/useYorumlarim.js'
import { useRaflar } from '../hooks/useRaflar.js'
import { useEserPuanlarim } from '../hooks/useEserPuanlarim.js'
import { rafOlustur, rafSil } from '../utils/raf.js'
import { takipEt, takipBirak } from '../utils/takip.js'
import { favoriKaldir } from '../utils/favori.js'
import LetterboxdIkon from '../components/ikonlar/LetterboxdIkon.jsx'
import BinKitapIkon from '../components/ikonlar/BinKitapIkon.jsx'
import PuanIceAktar from '../components/PuanIceAktar.jsx'
import { kahinOlduguSezonlariGetir } from '../utils/oscar.js'
import OscarHeykelIkon from '../components/ikonlar/OscarHeykelIkon.jsx'
import { kullaniciKoleksiyonuGetir, eseriKoleksiyondanCikar } from '../utils/sanatKoleksiyonu.js'
import Listelerim from './Listelerim.jsx'
import TemaAvatarIkon, { TEMA_AVATARLARI, temaAvatarUrlMi } from '../components/ikonlar/TemaAvatarIkon.jsx'
import { begenilenMuzikleriGetir, muzikBegeniKaldir } from '../utils/filmMuzigiBegeni.js'
import { izlenecekKaldir } from '../utils/izlenecek.js'
import { uretDavetKodu } from '../utils/davetKodu.js'
import GonderiKarti from '../components/GonderiKarti.jsx'
import Avatar from '../components/Avatar.jsx'
import YildizPuan from '../components/YildizPuan.jsx'
import YilOzeti from '../components/YilOzeti.jsx'
import GunlukListesi from '../components/GunlukListesi.jsx'
import { gunlukYilininKayitlariniGetir, gunlukIlkYiliGetir, mukerrerGunlukKayitlariniTemizle } from '../utils/gunluk.js'
import { buYilOlaylariHesapla } from '../utils/yilOzeti.js'
import { meydanOkumalariGetir, herkeseAcikMeydanOkumalariGetir, meydanOkumaOlustur } from '../utils/meydanOkuma.js'
import { oduncVerdiklerimiGetir, oduncAldiklarimiGetir, itibarSayisiGetir } from '../utils/kitapIstek.js'
import MeydanOkumaFormu from '../components/MeydanOkumaFormu.jsx'
import MeydanOkumaKarti from '../components/MeydanOkumaKarti.jsx'
import PaylasButonu from '../components/PaylasButonu.jsx'
import { girisGerekiyorsaYonlendir } from '../utils/girisYonlendir.js'

const FAVORI_TURLERI = [
  { id: 'sinema', etiket: 'Filmler' },
  { id: 'dizi', etiket: 'Diziler' },
  { id: 'kitap', etiket: 'Kitaplar' },
  { id: 'yazar', etiket: 'Yazarlar' },
  { id: 'kisi', etiket: 'Oyuncular/Yönetmenler' },
]

function esereLink(tur, disId) {
  if (tur === 'kisi') return `/kisi/${disId}`
  if (tur === 'yazar') return `/yazar/${disId}`
  if (tur === 'kitap') return `/kitap/${disId}`
  if (tur === 'dizi') return `/dizi/${disId}`
  return `/film/${disId}`
}

function PosterKart({ baslik, alt, posterUrl, link }) {
  return (
    <Link to={link} className="block">
      <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
        {posterUrl && <img src={posterUrl} alt={baslik} className="h-full w-full object-cover" />}
      </div>
      <p className="mt-1 truncate text-xs text-murekkep">{baslik}</p>
      {alt && <p className="truncate text-[11px] text-kraft">{alt}</p>}
    </Link>
  )
}

export default function Profil() {
  const { uid } = useParams()
  const navigate = useNavigate()
  const { kullanici, profil: kendiProfilim, profilGuncelle } = useAuth()
  const benimProfilimMi = kullanici?.uid === uid

  const [hedefProfil, setHedefProfil] = useState(benimProfilimMi ? kendiProfilim : null)
  const [meydanOkumalar, setMeydanOkumalar] = useState(null)
  const [oduncVerdiklerim, setOduncVerdiklerim] = useState(null)
  const [oduncAldiklarim, setOduncAldiklarim] = useState(null)
  const [itibarSayisi, setItibarSayisi] = useState(null)
  const [meydanOkumaFormAcik, setMeydanOkumaFormAcik] = useState(false)
  const [kahinSezonlari, setKahinSezonlari] = useState([])
  const [sanatKoleksiyonu, setSanatKoleksiyonu] = useState([])
  const [begenilenMuzikler, setBegenilenMuzikler] = useState([])

  useEffect(() => {
    kullaniciKoleksiyonuGetir(uid).then(setSanatKoleksiyonu)
    begenilenMuzikleriGetir(uid).then(setBegenilenMuzikler)
  }, [uid])
  const { gonderiler, hata: gonderilerHatasi } = useGonderiler({ yazarId: uid, sayfaBoyutu: 500 })
  const { takipEdiyorMu, setTakipEdiyorMu, takipciSayisi, takipEdilenSayisi } = useTakip(uid, kullanici?.uid)
  const [takipEdilenProfilleri, setTakipEdilenProfilleri] = useState([])

  useEffect(() => {
    let iptal = false
    takipEdilenProfilleriGetir(uid).then((liste) => {
      if (!iptal) setTakipEdilenProfilleri(liste)
    })
    return () => {
      iptal = true
    }
  }, [uid])
  const [takipIsleniyor, setTakipIsleniyor] = useState(false)

  const [sekme, setSekme] = useState('yilozeti')

  useEffect(() => {
    if (sekme !== 'meydanokumalar' || !uid) return
    setMeydanOkumalar(null)
    ;(benimProfilimMi ? meydanOkumalariGetir(uid) : herkeseAcikMeydanOkumalariGetir(uid)).then(setMeydanOkumalar)
  }, [sekme, uid, benimProfilimMi])

  useEffect(() => {
    if (sekme !== 'oduncKitaplar' || !uid) return
    setOduncVerdiklerim(null)
    setOduncAldiklarim(null)
    oduncVerdiklerimiGetir(uid).then(setOduncVerdiklerim)
    oduncAldiklarimiGetir(uid).then(setOduncAldiklarim)
  }, [sekme, uid])

  useEffect(() => {
    if (!uid) return
    itibarSayisiGetir(uid).then(setItibarSayisi)
  }, [uid])

  async function meydanOkumaOlusturTiklandi(veri) {
    await meydanOkumaOlustur(kullanici, kendiProfilim, veri)
    setMeydanOkumaFormAcik(false)
    meydanOkumalariGetir(uid).then(setMeydanOkumalar)
  }
  const [favoriSekmesi, setFavoriSekmesi] = useState('sinema')
  const { favoriler, yenidenYukle: favorileriYenile } = useFavoriler(uid, favoriSekmesi)
  // Profilin en üstündeki "Sabitlenmiş Favoriler" vitrini için — sekmedeki
  // gibi tek türe filtrelemeden, tüm favorilerden en yeni eklenen 4 tanesi.
  const { favoriler: tumFavoriler } = useFavoriler(uid)
  const { izlenecekler, yenidenYukle: izlenecekleriYenile } = useIzlenecekler(uid)
  const { puanlar: eserPuanlarim } = useEserPuanlarim(uid)

  // Günlük — 4+ yıllık (özellikle Letterboxd içe aktarımı sonrası binlerce
  // kayıt olabilen) bir geçmişi her profil ziyaretinde tek seferde çekmek
  // hem yavaştı hem gereksizdi. Artık sadece SEÇİLİ YILın kayıtları
  // çekiliyor, "Yılın Özeti" ve "Günlük" sekmeleri aynı seçili yılı
  // paylaşıyor. Yıl sekmelerini göstermek için de tüm geçmişi değil,
  // sadece en eski kaydın yılını (tek, ucuz bir sorgu) öğreniyoruz.
  const [gunlukYil, setGunlukYil] = useState(new Date().getFullYear())
  const [gunlukTurFiltresi, setGunlukTurFiltresi] = useState('')
  const [gunlukIlkYil, setGunlukIlkYil] = useState(null)
  const [gunlukKayitlari, setGunlukKayitlari] = useState([])
  const [gunlukYukleniyor, setGunlukYukleniyor] = useState(true)
  const gunlukOnbellek = useRef({})

  useEffect(() => {
    gunlukIlkYiliGetir(uid).then(setGunlukIlkYil)
  }, [uid])

  useEffect(() => {
    let iptal = false
    async function getir() {
      setGunlukYukleniyor(true)
      const anahtarim = `${uid}_${gunlukYil}`
      if (gunlukOnbellek.current[anahtarim]) {
        if (!iptal) {
          setGunlukKayitlari(gunlukOnbellek.current[anahtarim])
          setGunlukYukleniyor(false)
        }
        return
      }
      const kayitlar = await gunlukYilininKayitlariniGetir(uid, gunlukYil)
      gunlukOnbellek.current[anahtarim] = kayitlar
      if (!iptal) {
        setGunlukKayitlari(kayitlar)
        setGunlukYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [uid, gunlukYil])

  function gunlukYenidenYukle() {
    delete gunlukOnbellek.current[`${uid}_${gunlukYil}`]
    gunlukYilininKayitlariniGetir(uid, gunlukYil).then((kayitlar) => {
      gunlukOnbellek.current[`${uid}_${gunlukYil}`] = kayitlar
      setGunlukKayitlari(kayitlar)
    })
  }

  // puanGonder'daki eski davranış (bkz. EserSayfasi.jsx) yıldıza her
  // tıklamada ayrı bir günlük kaydı düşürüyordu — kök sebep düzeltildi
  // (artık aynı güne ikinci kayıt eklemek yerine var olanı güncelliyor),
  // ama düzeltmeden ÖNCE oluşmuş mükerrer kayıtlar otomatik silinmiyor.
  // Önce Rüya'da, sonra başka kullanıcılarda da aynı kalıntı görülünce
  // tek seferlik bir yama olmaktan çıkıp kalıcı, herkesin kendi
  // profilinden kendi kendine düzeltebileceği bir bakım aracına dönüştü.
  const [temizleniyor, setTemizleniyor] = useState(false)
  async function mukerrerleriTemizleTiklandi() {
    setTemizleniyor(true)
    try {
      const silinenSayisi = await mukerrerGunlukKayitlariniTemizle(uid)
      if (silinenSayisi === 0) {
        window.alert('Mükerrer kayıt bulunamadı, günlüğün zaten temiz.')
      } else {
        window.alert(`${silinenSayisi} mükerrer kayıt silindi.`)
        gunlukOnbellek.current = {}
        gunlukYenidenYukle()
      }
    } finally {
      setTemizleniyor(false)
    }
  }

  const { raflar, yenidenYukle: raflariYenile } = useRaflar(uid)
  const [rafFormuAcik, setRafFormuAcik] = useState(false)
  const [rafBaslik, setRafBaslik] = useState('')
  const [rafAciklama, setRafAciklama] = useState('')
  const [rafKaydediliyor, setRafKaydediliyor] = useState(false)
  const { yorumlar: yorumlarim } = useYorumlarim(uid)

  const [davetKodlari, setDavetKodlari] = useState([])
  const [uretiliyor, setUretiliyor] = useState(false)
  const [davetAcik, setDavetAcik] = useState(false)
  const [puanIceAktarAcik, setPuanIceAktarAcik] = useState(false)
  const [posterAramasi, setPosterAramasi] = useState('')
  const [posterGosterimSayisi, setPosterGosterimSayisi] = useState({ sinema: 28, dizi: 28 })
  const [minPuan, setMinPuan] = useState(0)
  const [seciliTurler, setSeciliTurler] = useState([]) // çoklu seçim
  const [yilBaslangic, setYilBaslangic] = useState('')
  const [yilBitis, setYilBitis] = useState('')
  const [siralama, setSiralama] = useState('varsayilan') // 'varsayilan' | 'puan-yuksek' | 'yeni' | 'alfabetik'

  const [duzenlemeAcik, setDuzenlemeAcik] = useState(false)
  const [bioTaslak, setBioTaslak] = useState('')
  const [sehirTaslak, setSehirTaslak] = useState('')
  const [avatarTaslak, setAvatarTaslak] = useState('')
  const [kapakTaslak, setKapakTaslak] = useState('')
  const [letterboxdTaslak, setLetterboxdTaslak] = useState('')
  const [binKitapTaslak, setBinKitapTaslak] = useState('')
  const [hedefTaslak, setHedefTaslak] = useState(0)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  useEffect(() => {
    if (benimProfilimMi) {
      setHedefProfil(kendiProfilim)
      return
    }
    getDoc(doc(db, 'kullanicilar', uid)).then((snap) => {
      if (snap.exists()) setHedefProfil({ id: uid, ...snap.data() })
    })
  }, [uid, benimProfilimMi, kendiProfilim])

  useEffect(() => {
    kahinOlduguSezonlariGetir(uid).then(setKahinSezonlari)
  }, [uid])

  useEffect(() => {
    if (!benimProfilimMi) return
    const q = query(collection(db, 'davetKodlari'), where('olusturanId', '==', uid))
    getDocs(q).then((snap) => setDavetKodlari(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [uid, benimProfilimMi, uretiliyor])

  useEffect(() => {
    if (hedefProfil && benimProfilimMi) {
      setBioTaslak(hedefProfil.bio || '')
      setSehirTaslak(hedefProfil.sehir || '')
      setAvatarTaslak(hedefProfil.avatarUrl || '')
      setKapakTaslak(hedefProfil.kapakUrl || '')
      setLetterboxdTaslak(hedefProfil.letterboxdUrl || '')
      setBinKitapTaslak(hedefProfil.binKitapUrl || '')
      setHedefTaslak(hedefProfil.yillikOkumaHedefi || 0)
    }
  }, [hedefProfil, benimProfilimMi])

  async function profiliKaydet(e) {
    e.preventDefault()
    setKaydediliyor(true)
    try {
      const guncelVeri = {
        bio: bioTaslak,
        sehir: sehirTaslak,
        avatarUrl: avatarTaslak,
        kapakUrl: kapakTaslak,
        letterboxdUrl: letterboxdTaslak,
        binKitapUrl: binKitapTaslak,
        yillikOkumaHedefi: Number(hedefTaslak) || 0,
      }
      await profilGuncelle(guncelVeri)
      setHedefProfil((onceki) => ({ ...onceki, ...guncelVeri }))
      setDuzenlemeAcik(false)
    } finally {
      setKaydediliyor(false)
    }
  }

  async function takipDegistir() {
    if (girisGerekiyorsaYonlendir(kullanici, navigate)) return
    if (takipIsleniyor) return
    setTakipIsleniyor(true)
    try {
      if (takipEdiyorMu) {
        await takipBirak(kullanici.uid, uid)
      } else {
        await takipEt(kullanici.uid, uid)
      }
      setTakipEdiyorMu(!takipEdiyorMu)
    } finally {
      setTakipIsleniyor(false)
    }
  }

  async function davetKoduOlustur() {
    if (!hedefProfil || hedefProfil.kalanDavetHakki <= 0) return
    setUretiliyor(true)
    try {
      const kod = uretDavetKodu()
      await setDoc(doc(db, 'davetKodlari', kod), {
        olusturanId: kullanici.uid,
        kullanildiMi: false,
        olusturmaTarihi: serverTimestamp(),
      })
      await updateDoc(doc(db, 'kullanicilar', kullanici.uid), {
        kalanDavetHakki: hedefProfil.kalanDavetHakki - 1,
      })
      setHedefProfil({ ...hedefProfil, kalanDavetHakki: hedefProfil.kalanDavetHakki - 1 })
    } finally {
      setUretiliyor(false)
    }
  }

  async function favoriSil(f) {
    await favoriKaldir(uid, f.tur, f.disId)
    favorileriYenile()
  }

  async function izlenecekSil(i) {
    await izlenecekKaldir(uid, i.tur, i.disId)
    izlenecekleriYenile()
  }

  if (!hedefProfil) return <p className="text-kraft text-sm">Yükleniyor...</p>

  const SEKMELER = [
    { id: 'yilozeti', etiket: '📊 Yılın Özeti' },
    { id: 'gunluk', etiket: '📔 Günlük' },
    { id: 'izlediklerim', etiket: '🎬 İzlediklerim' },
    { id: 'okuduklarim', etiket: '📖 Okuduklarım' },
    { id: 'yazigezi', etiket: '✍️ Yazı & Gezi' },
    { id: 'suanda', etiket: '⏳ Şu An' },
    { id: 'tamamladiklarim', etiket: '✓ Tamamladıklarım' },
    { id: 'meydanokumalar', etiket: '🏆 Meydan Okumalarım' },
    { id: 'oduncKitaplar', etiket: '🤝 Ödünç Kitaplar' },
    { id: 'izleyecegim', etiket: '📋 İzleyecek/Okuyacaklarım' },
    { id: 'favoriler', etiket: '♥ Favoriler' },
    { id: 'raflarim', etiket: '📚 Raflarım' },
    { id: 'yorumlarim', etiket: '💬 Yorumlarım' },
    { id: 'listelerim', etiket: '📋 Listelerim' },
    { id: 'sanatKoleksiyonum', etiket: '🖼️ Sanat Koleksiyonlarım' },
    { id: 'filmMuzikleri', etiket: '🎵 Film Müzikleri' },
  ]

  async function rafOlusturTiklandi(e) {
    e.preventDefault()
    if (!rafBaslik.trim() || !kullanici) return
    setRafKaydediliyor(true)
    try {
      await rafOlustur(kullanici, rafBaslik.trim(), rafAciklama)
      setRafBaslik('')
      setRafAciklama('')
      setRafFormuAcik(false)
      raflariYenile()
    } finally {
      setRafKaydediliyor(false)
    }
  }

  async function rafiSil(rafId) {
    if (!window.confirm('Bu rafı silmek istediğine emin misin?')) return
    await rafSil(rafId)
    raflariYenile()
  }

  return (
    <div>
      {hedefProfil.kapakUrl && (
        <div className="mb-4 -mx-4 h-32 overflow-hidden sm:mb-6 sm:h-48 sm:rounded-sm">
          <img src={hedefProfil.kapakUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="mb-6 flex items-start gap-4">
        <Avatar adSoyad={hedefProfil.adSoyad} avatarUrl={hedefProfil.avatarUrl} boyut="h-16 w-16" />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-baslik text-2xl text-murekkep">{hedefProfil.adSoyad}</h1>
            <PaylasButonu baslik={`${hedefProfil.adSoyad} — Seyirdefteri`} url={`/profil/${uid}`} boyut="kucuk" />
            {benimProfilimMi && (
              <button
                onClick={() => setDuzenlemeAcik((a) => !a)}
                className="rounded-sm bg-kagitKoyu px-2 py-1 font-govde text-xs text-kraft ring-1 ring-cizgi"
              >
                {duzenlemeAcik ? 'Vazgeç' : 'Profili Düzenle'}
              </button>
            )}
          </div>
          <p className="text-sm text-kraft">@{hedefProfil.kullaniciAdi}</p>

          <Link
            to="/kullanicilar"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gise px-3 py-1.5 font-govde text-xs text-kagit hover:opacity-90"
          >
            👥 Kişileri Keşfet →
          </Link>

          {kahinSezonlari.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {kahinSezonlari.map((s) => (
                <span
                  key={s.id}
                  title={s.ad}
                  className="flex items-center gap-1 rounded-full bg-gise/15 px-2.5 py-1 text-xs font-medium text-gise ring-1 ring-gise/40"
                >
                  <OscarHeykelIkon boyut={12} /> {s.ad} Kahini
                </span>
              ))}
            </div>
          )}

          {(hedefProfil.letterboxdUrl || hedefProfil.binKitapUrl) && (
            <div className="mt-2 flex gap-2">
              {hedefProfil.letterboxdUrl && (
                <a
                  href={hedefProfil.letterboxdUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-full bg-kagitKoyu px-2.5 py-1 text-xs text-murekkep ring-1 ring-cizgi hover:ring-deniz hover:text-deniz"
                >
                  <LetterboxdIkon className="h-4 w-4" />
                  Letterboxd
                </a>
              )}
              {hedefProfil.binKitapUrl && (
                <a
                  href={hedefProfil.binKitapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-full bg-kagitKoyu px-2.5 py-1 text-xs text-murekkep ring-1 ring-cizgi hover:ring-deniz hover:text-deniz"
                >
                  <BinKitapIkon className="h-4 w-4" />
                  1000Kitap
                </a>
              )}
            </div>
          )}
          {!duzenlemeAcik && hedefProfil.bio && <p className="mt-2 text-sm text-murekkep">{hedefProfil.bio}</p>}
          {!duzenlemeAcik && hedefProfil.sehir && <p className="mt-0.5 text-xs text-kraft">📍 {hedefProfil.sehir}</p>}

          {!duzenlemeAcik && tumFavoriler.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] uppercase tracking-widest text-kraft">📌 Favoriler</p>
              <div className="flex gap-2">
                {tumFavoriler.slice(0, 4).map((f) => (
                  <Link key={f.id} to={esereLink(f.tur, f.disId)} className="block w-14 shrink-0" title={f.baslik}>
                    <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                      {f.posterUrl && <img src={f.posterUrl} alt={f.baslik} className="h-full w-full object-cover" />}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {duzenlemeAcik && (
            <form onSubmit={profiliKaydet} className="mt-3 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
              <div>
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Kapak Görsel URL (profilin en üstünde)</label>
                <input
                  type="text"
                  value={kapakTaslak}
                  onChange={(e) => setKapakTaslak(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Avatar Görsel URL</label>
                <input
                  type="text"
                  value={temaAvatarUrlMi(avatarTaslak) ? '' : avatarTaslak}
                  onChange={(e) => setAvatarTaslak(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
                <p className="mt-2 mb-1 text-xs text-kraft">...veya sinema/dizi/tiyatro/sanat temalı bir avatar seç:</p>
                <div className="flex flex-wrap gap-2">
                  {TEMA_AVATARLARI.map((t) => {
                    const seciliMi = avatarTaslak === `tema:${t.id}`
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setAvatarTaslak(`tema:${t.id}`)}
                        title={t.ad}
                        className={`flex h-11 w-11 items-center justify-center rounded-full text-kagit ${t.renk} ${
                          seciliMi ? 'ring-2 ring-offset-2 ring-offset-kagitKoyu ring-murekkep' : 'ring-1 ring-cizgi'
                        }`}
                      >
                        <TemaAvatarIkon id={t.id} boyut={22} />
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Bio</label>
                <textarea
                  value={bioTaslak}
                  onChange={(e) => setBioTaslak(e.target.value)}
                  rows={3}
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Şehir (opsiyonel)</label>
                <input
                  type="text"
                  value={sehirTaslak}
                  onChange={(e) => setSehirTaslak(e.target.value)}
                  placeholder="örn. Kocaeli"
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
                <p className="mt-1 text-[11px] text-kraft">Kitap ödünç alışverişinde aynı şehirdekileri bulmak için kullanılır.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Letterboxd Profili</label>
                  <input
                    type="text"
                    value={letterboxdTaslak}
                    onChange={(e) => setLetterboxdTaslak(e.target.value)}
                    placeholder="https://letterboxd.com/kullaniciadi"
                    className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-kraft mb-1">1000Kitap Profili</label>
                  <input
                    type="text"
                    value={binKitapTaslak}
                    onChange={(e) => setBinKitapTaslak(e.target.value)}
                    placeholder="https://1000kitap.com/kullaniciadi"
                    className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">
                  Yıllık Okuma Hedefi (kitap sayısı)
                </label>
                <input
                  type="number"
                  min="0"
                  value={hedefTaslak}
                  onChange={(e) => setHedefTaslak(e.target.value)}
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <button
                type="submit"
                disabled={kaydediliyor}
                className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
              >
                {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </form>
          )}

          <div className="mt-3 flex items-center gap-4">
            <p className="text-xs text-kraft">
              <span className="font-medium text-murekkep">{takipEdilenSayisi}</span> takip ·{' '}
              <span className="font-medium text-murekkep">{takipciSayisi}</span> takipçi
            </p>
            {!benimProfilimMi && (
              <button
                onClick={takipDegistir}
                disabled={takipIsleniyor}
                className={`rounded-sm px-3 py-1 font-govde text-xs ${
                  takipEdiyorMu ? 'bg-kagitKoyu text-kraft ring-1 ring-cizgi' : 'bg-muhur text-kagit'
                } disabled:opacity-40`}
              >
                {takipEdiyorMu ? 'Takip Ediliyor' : 'Takip Et'}
              </button>
            )}
          </div>

          {takipEdilenProfilleri.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] uppercase tracking-widest text-kraft">Takip Ettikleri</p>
              <div className="flex flex-wrap gap-2">
                {takipEdilenProfilleri.map((p) => (
                  <Link key={p.uid} to={`/profil/${p.uid}`} title={p.adSoyad} className="block">
                    <Avatar adSoyad={p.adSoyad} avatarUrl={p.avatarUrl} boyut="h-9 w-9" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {benimProfilimMi && (
        <div className="mb-8 rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
          <button
            onClick={() => setDavetAcik((a) => !a)}
            className="flex w-full items-center justify-between px-4 py-2 text-sm text-murekkep"
          >
            <span>
              🎟️ Davet Kodların <span className="text-kraft">(kalan: {hedefProfil.kalanDavetHakki})</span>
            </span>
            <span className="text-xs text-kraft">{davetAcik ? '▲ Gizle' : '▼ Göster'}</span>
          </button>

          {davetAcik && (
            <div className="border-t border-cizgi px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-kraft">Her kod bir kişi tarafından bir kez kullanılabilir.</p>
                <button
                  onClick={davetKoduOlustur}
                  disabled={hedefProfil.kalanDavetHakki <= 0 || uretiliyor}
                  className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
                >
                  {uretiliyor ? 'Oluşturuluyor...' : 'Davet Kodu Oluştur'}
                </button>
              </div>
              {davetKodlari.length > 0 && (
                <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-xs text-kraft">
                  {davetKodlari.map((k) => (
                    <li key={k.id} className="flex items-center justify-between">
                      <span className="font-mono tracking-widest text-murekkep">{k.id}</span>
                      <span>{k.kullanildiMi ? 'Kullanıldı' : 'Kullanılmadı'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {benimProfilimMi && (
        <div className="mb-8 rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
          <button
            onClick={() => setPuanIceAktarAcik((a) => !a)}
            className="flex w-full items-center justify-between px-4 py-2 text-sm text-murekkep"
          >
            <span>📥 Letterboxd Puanlarını İçe Aktar</span>
            <span className="text-xs text-kraft">{puanIceAktarAcik ? '▲ Gizle' : '▼ Göster'}</span>
          </button>
          {puanIceAktarAcik && (
            <div className="border-t border-cizgi px-4 py-3">
              <PuanIceAktar />
            </div>
          )}
        </div>
      )}

      {/* Sekmeler */}
      <div className="mb-6 flex flex-wrap gap-2">
        {SEKMELER.filter((s) => s.id !== 'listelerim' || benimProfilimMi).map((s) => (
          <button
            key={s.id}
            onClick={() => setSekme(s.id)}
            className={`rounded-sm px-3 py-1.5 font-govde text-sm transition ${
              sekme === s.id
                ? 'bg-murekkep text-kagit font-medium ring-2 ring-murekkep'
                : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi hover:ring-murekkep/50'
            }`}
          >
            {s.etiket}
          </button>
        ))}
      </div>

      {/* Yılın Özeti ve Günlük aynı yıl seçimini paylaşıyor — biri diğerini
          etkilemesin diye ayrı state değil, tek bir seçim. */}
      {(sekme === 'yilozeti' || sekme === 'gunluk') && (
        <div className="mb-4 flex flex-wrap gap-2">
          {Array.from({ length: new Date().getFullYear() - (gunlukIlkYil || new Date().getFullYear()) + 1 }, (_, i) => new Date().getFullYear() - i).map(
            (y) => (
              <button
                key={y}
                onClick={() => setGunlukYil(y)}
                className={`rounded-sm px-3 py-1 font-govde text-xs ${
                  gunlukYil === y ? 'bg-murekkep text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
                }`}
              >
                {y}
              </button>
            )
          )}
        </div>
      )}

      {sekme === 'yilozeti' && (
        <YilOzeti
          yil={gunlukYil}
          yukleniyor={gunlukYukleniyor}
          gonderiler={gonderiler}
          eserPuanlarim={eserPuanlarim}
          gunlukKayitlari={gunlukKayitlari}
          onTuruSec={(tur) => {
            // "Yazı" (deneme/inceleme vb.) hiç gunlukKayitlari'na düşmüyor,
            // Günlük'te gösterilecek bir karşılığı yok — o yüzden Yazı/Gezi/
            // Etkinlik rakamı Günlük yerine doğrudan Yazı & Gezi sekmesine
            // gidiyor (gerçek içeriğin yaşadığı yer).
            if (tur === 'diger') {
              setSekme('yazigezi')
              return
            }
            setGunlukTurFiltresi(tur)
            setSekme('gunluk')
          }}
        />
      )}

      {sekme === 'gunluk' && (
        <>
          {benimProfilimMi && (
            <button
              onClick={mukerrerleriTemizleTiklandi}
              disabled={temizleniyor}
              className="mb-3 text-[11px] text-kraft hover:text-deniz hover:underline disabled:opacity-40"
            >
              {temizleniyor ? 'Kontrol ediliyor...' : '🧹 Mükerrer Kayıtları Temizle'}
            </button>
          )}
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              { id: '', etiket: 'Tümü' },
              { id: 'sinema', etiket: '🎬 Film' },
              { id: 'dizi', etiket: '📺 Dizi' },
              { id: 'kitap', etiket: '📖 Kitap' },
              { id: 'diger', etiket: '🧳 Gezi/Etkinlik' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setGunlukTurFiltresi(f.id)}
                className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
                  gunlukTurFiltresi === f.id ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagitKoyu text-kraft ring-cizgi hover:text-murekkep'
                }`}
              >
                {f.etiket}
              </button>
            ))}
          </div>
          {gunlukYukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
          {!gunlukYukleniyor &&
            (() => {
              // KÖKTEN ÇÖZÜM: Günlük listesi artık Yılın Özeti'yle AYNI
              // hesaplamadan (buYilOlaylariHesapla) besleniyor — eskiden bu
              // liste sadece gerçek gunlukKayitlari'nı gösterirken, Yılın
              // Özeti ayrıca gonderiler/eserPuanlari'ndan da (henüz bir
              // günlük satırı oluşturmamış) "hayalet" olaylar sayıyordu.
              // Rakamlar artık listeyle her zaman birebir örtüşüyor.
              const tumOlaylar = buYilOlaylariHesapla(gunlukYil, gonderiler, eserPuanlarim, gunlukKayitlari)
              const filtrelenmis =
                gunlukTurFiltresi === ''
                  ? tumOlaylar
                  : gunlukTurFiltresi === 'diger'
                    ? tumOlaylar.filter((k) => k.tur === 'gezi' || k.tur === 'etkinlik')
                    : tumOlaylar.filter((k) => k.tur === gunlukTurFiltresi)
              return (
                <GunlukListesi
                  kayitlar={filtrelenmis}
                  kendiProfiliMi={benimProfilimMi}
                  onDegisti={gunlukYenidenYukle}
                />
              )
            })()}
        </>
      )}

      {sekme === 'izlediklerim' && (
        <>
          {(() => {
            const gonderiKarti = (tur) =>
              gonderiler
                .filter((g) => g.tur === tur && g.posterUrl)
                .map((g) => ({
                  id: g.id,
                  baslik: g.baslik,
                  posterUrl: g.posterUrl,
                  puan: g.kullaniciPuani,
                  yil: g.yil || '',
                  turler: g.turler || '',
                  tarih: g.tarih,
                  link: `/gonderi/${g.id}`,
                }))
            const puanKarti = (tur) =>
              eserPuanlarim
                .filter((e) => e.tur === tur && e.posterUrl)
                .filter((e) => !gonderiler.some((g) => g.tur === tur && g.tmdbId === e.disId))
                .map((e) => ({
                  id: e.id,
                  baslik: e.baslik,
                  posterUrl: e.posterUrl,
                  puan: e.puan,
                  yil: e.yil || '',
                  turler: e.turler || '',
                  tarih: e.tarih,
                  link: tur === 'dizi' ? `/dizi/${e.disId}` : `/film/${e.disId}`,
                }))

            const gruplar = [
              { tur: 'sinema', baslik: 'Filmler' },
              { tur: 'dizi', baslik: 'Diziler' },
            ].map(({ tur, baslik }) => ({ tur, baslik, esereler: [...gonderiKarti(tur), ...puanKarti(tur)] }))

            if (gruplar.every((g) => g.esereler.length === 0)) return null

            const toplamEser = gruplar.reduce((n, g) => n + g.esereler.length, 0)

            // Tüm gruplardaki eserlerden benzersiz tür listesi (filtre seçenekleri için).
            // Not: tür bilgisi sadece bu özellik eklendikten sonra puanlanan/içe aktarılan
            // eserlerde var — eski kayıtlarda boş kalabilir, bu normal.
            const tumTurler = [...new Set(gruplar.flatMap((g) => g.esereler.flatMap((e) => (e.turler ? e.turler.split(', ') : []))))].sort()

            return (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-baslik text-lg text-murekkep">Poster Duvarı</h2>
                  <span className="text-xs text-kraft">{toplamEser} eser</span>
                </div>

                {toplamEser > 20 && (
                  <div className="mb-4 space-y-2">
                    <input
                      type="text"
                      value={posterAramasi}
                      onChange={(e) => setPosterAramasi(e.target.value)}
                      placeholder={`${toplamEser} film/dizi içinde ara...`}
                      className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={minPuan}
                        onChange={(e) => setMinPuan(Number(e.target.value))}
                        className="rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
                      >
                        <option value={0}>Tüm puanlar</option>
                        <option value={3}>★ 3+ </option>
                        <option value={3.5}>★ 3.5+</option>
                        <option value={4}>★ 4+</option>
                        <option value={4.5}>★ 4.5+</option>
                        <option value={5}>★ 5 (tam puan)</option>
                      </select>

                      <input
                        type="number"
                        value={yilBaslangic}
                        onChange={(e) => setYilBaslangic(e.target.value)}
                        placeholder="Yıl (başlangıç)"
                        className="w-28 rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
                      />
                      <span className="text-xs text-kraft">–</span>
                      <input
                        type="number"
                        value={yilBitis}
                        onChange={(e) => setYilBitis(e.target.value)}
                        placeholder="Yıl (bitiş)"
                        className="w-28 rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
                      />

                      <select
                        value={siralama}
                        onChange={(e) => setSiralama(e.target.value)}
                        className="rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
                      >
                        <option value="varsayilan">Sıralama: Varsayılan</option>
                        <option value="puan-yuksek">Puan: Yüksekten Düşüğe</option>
                        <option value="yeni">Eklenme: Yeniden Eskiye</option>
                        <option value="alfabetik">Alfabetik (A-Z)</option>
                      </select>

                      {(minPuan > 0 || seciliTurler.length > 0 || posterAramasi || yilBaslangic || yilBitis || siralama !== 'varsayilan') && (
                        <button
                          onClick={() => {
                            setMinPuan(0)
                            setSeciliTurler([])
                            setPosterAramasi('')
                            setYilBaslangic('')
                            setYilBitis('')
                            setSiralama('varsayilan')
                          }}
                          className="text-xs text-kraft hover:text-muhur"
                        >
                          Filtreleri Temizle
                        </button>
                      )}
                    </div>

                    {tumTurler.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tumTurler.map((t) => {
                          const secili = seciliTurler.includes(t)
                          return (
                            <button
                              key={t}
                              onClick={() =>
                                setSeciliTurler((onceki) => (secili ? onceki.filter((x) => x !== t) : [...onceki, t]))
                              }
                              className={`rounded-full px-2.5 py-1 text-[11px] ring-1 ${
                                secili ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagit text-kraft ring-cizgi hover:ring-murekkep/50'
                              }`}
                            >
                              {t}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {gruplar.map(({ tur, baslik, esereler }) => {
                  if (esereler.length === 0) return null
                  let filtrelenmis = esereler
                  if (posterAramasi.trim()) {
                    filtrelenmis = filtrelenmis.filter((e) => e.baslik.toLowerCase().includes(posterAramasi.trim().toLowerCase()))
                  }
                  if (minPuan > 0) {
                    filtrelenmis = filtrelenmis.filter((e) => (e.puan || 0) >= minPuan)
                  }
                  if (seciliTurler.length > 0) {
                    filtrelenmis = filtrelenmis.filter((e) => e.turler && seciliTurler.some((t) => e.turler.includes(t)))
                  }
                  if (yilBaslangic) {
                    filtrelenmis = filtrelenmis.filter((e) => e.yil && Number(e.yil) >= Number(yilBaslangic))
                  }
                  if (yilBitis) {
                    filtrelenmis = filtrelenmis.filter((e) => e.yil && Number(e.yil) <= Number(yilBitis))
                  }

                  filtrelenmis = [...filtrelenmis]
                  if (siralama === 'puan-yuksek') {
                    filtrelenmis.sort((a, b) => (b.puan || 0) - (a.puan || 0))
                  } else if (siralama === 'alfabetik') {
                    filtrelenmis.sort((a, b) => a.baslik.localeCompare(b.baslik, 'tr'))
                  } else if (siralama === 'yeni') {
                    filtrelenmis.sort((a, b) => (b.tarih?.toMillis?.() || 0) - (a.tarih?.toMillis?.() || 0))
                  }

                  const gosterilecekSayi = posterGosterimSayisi[tur] || 28
                  const gosterilenler = filtrelenmis.slice(0, gosterilecekSayi)
                  const filtreAktif = posterAramasi.trim() || minPuan > 0 || seciliTurler.length > 0 || yilBaslangic || yilBitis

                  return (
                    <div key={tur} className="mb-5">
                      <p className="mb-2 text-xs uppercase tracking-widest text-kraft">
                        {baslik} {filtreAktif && `(${filtrelenmis.length} sonuç)`}
                      </p>
                      {filtrelenmis.length === 0 && <p className="text-xs text-kraft">Eşleşme yok.</p>}
                      <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
                        {gosterilenler.map((e) => (
                          <Link key={e.id} to={e.link} className="block">
                            <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                              <img src={e.posterUrl} alt={e.baslik} loading="lazy" className="h-full w-full object-cover" />
                            </div>
                            {e.puan != null && <YildizPuan puan={e.puan} boyut="text-[10px]" onluGoster={false} />}
                          </Link>
                        ))}
                      </div>
                      {filtrelenmis.length > gosterilecekSayi && (
                        <button
                          onClick={() => setPosterGosterimSayisi((onceki) => ({ ...onceki, [tur]: (onceki[tur] || 28) + 28 }))}
                          className="mt-2 text-xs text-kraft hover:text-deniz hover:underline"
                        >
                          Daha Fazla Göster ({filtrelenmis.length - gosterilecekSayi} kaldı) ↓
                        </button>
                      )}
                    </div>
                  )
                })}
                <div className="mb-3" />
              </>
            )
          })()}

          <h2 className="font-baslik text-lg text-murekkep mb-3">Güncesi</h2>
          {gonderilerHatasi && (
            <p className="mb-3 text-xs text-muhur">
              Güncelerin yüklenirken hata oldu: {gonderilerHatasi}. Muhtemelen Firestore'da eksik bir indeks var —
              tarayıcı konsolundaki (F12) linke tıklayarak oluşturabilirsin.
            </p>
          )}
          <div className="space-y-4">
            {(() => {
              const filmDizi = gonderiler.filter((g) => g.tur === 'sinema' || g.tur === 'dizi')
              return (
                <>
                  {filmDizi.map((g, i) => (
                    <div key={g.id}>
                      <GonderiKarti gonderi={g} />
                      {i < filmDizi.length - 1 && <div className="defter-cizgi mt-4" />}
                    </div>
                  ))}
                  {filmDizi.length === 0 && <p className="text-sm text-kraft">Henüz bir film/dizi paylaşımı yok.</p>}
                </>
              )
            })()}
          </div>
        </>
      )}

      {/* Okuduklarım (sadece Kitap) */}
      {sekme === 'okuduklarim' && (
        <>
          {(() => {
            const kitapGonderileri = gonderiler.filter((g) => g.tur === 'kitap')
            if (kitapGonderileri.length === 0) return null
            const buYil = new Date().getFullYear()
            const buYilOkunan = kitapGonderileri.filter((g) => {
              const t = g.tarih?.toDate?.() || new Date(g.tarih)
              return !isNaN(t.getTime()) && t.getFullYear() === buYil
            }).length
            const turSayaci = {}
            kitapGonderileri.forEach((g) => {
              ;(g.turler || '').split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => {
                turSayaci[t] = (turSayaci[t] || 0) + 1
              })
            })
            const enCokTur = Object.entries(turSayaci).sort((a, b) => b[1] - a[1])[0]?.[0]
            const hedef = hedefProfil.yillikOkumaHedefi || 0

            return (
              <div className="mb-8 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
                <p className="text-xs uppercase tracking-widest text-gise mb-2">Okuma Özeti — {buYil}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-murekkep">
                  <p>
                    <span className="font-medium">{buYilOkunan}</span> kitap okudun
                    {hedef > 0 && <span className="text-kraft"> / hedefin {hedef}</span>}
                  </p>
                  {enCokTur && (
                    <p>
                      En çok okuduğun tür: <span className="font-medium">{enCokTur}</span>
                    </p>
                  )}
                  <p>
                    Toplam <span className="font-medium">{kitapGonderileri.length}</span> kitap
                  </p>
                </div>
                {hedef > 0 && (
                  <div className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-kagit ring-1 ring-cizgi">
                    <div className="h-full bg-deniz" style={{ width: `${Math.min(100, Math.round((buYilOkunan / hedef) * 100))}%` }} />
                  </div>
                )}
              </div>
            )
          })()}

          {(() => {
            const gonderiKarti = gonderiler
              .filter((g) => g.tur === 'kitap' && (g.posterUrl || g.ilgiliPosterUrl))
              .map((g) => ({
                id: g.id,
                baslik: g.baslik,
                posterUrl: g.posterUrl || g.ilgiliPosterUrl,
                puan: g.kullaniciPuani,
                link: `/gonderi/${g.id}`,
              }))
            const puanKarti = eserPuanlarim
              .filter((e) => e.tur === 'kitap' && e.posterUrl)
              .filter((e) => !gonderiler.some((g) => g.tur === 'kitap' && g.googleBooksId === e.disId))
              .map((e) => ({ id: e.id, baslik: e.baslik, posterUrl: e.posterUrl, puan: e.puan, link: `/kitap/${e.disId}` }))
            const kitaplar = [...gonderiKarti, ...puanKarti]
            if (kitaplar.length === 0) return null
            return (
              <>
                <h2 className="font-baslik text-lg text-murekkep mb-3">Kitaplığım</h2>
                <div className="mb-8 grid grid-cols-5 gap-2 sm:grid-cols-7">
                  {kitaplar.map((k) => (
                    <Link key={k.id} to={k.link} className="block">
                      <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                        <img src={k.posterUrl} alt={k.baslik} className="h-full w-full object-cover" />
                      </div>
                      {k.puan != null && <YildizPuan puan={k.puan} boyut="text-[10px]" onluGoster={false} />}
                    </Link>
                  ))}
                </div>
              </>
            )
          })()}

          <h2 className="font-baslik text-lg text-murekkep mb-3">Güncesi</h2>
          <div className="space-y-4">
            {(() => {
              const kitap = gonderiler.filter((g) => g.tur === 'kitap')
              return (
                <>
                  {kitap.map((g, i) => (
                    <div key={g.id}>
                      <GonderiKarti gonderi={g} />
                      {i < kitap.length - 1 && <div className="defter-cizgi mt-4" />}
                    </div>
                  ))}
                  {kitap.length === 0 && <p className="text-sm text-kraft">Henüz bir kitap paylaşımı yok.</p>}
                </>
              )
            })()}
          </div>
        </>
      )}

      {/* Şu An Okuduklarım */}
      {/* Yazı & Gezi (Yazı, Gezi, Etkinlik) */}
      {sekme === 'yazigezi' && (
        <div className="space-y-4">
          {(() => {
            const digerler = gonderiler.filter((g) => g.tur === 'yazi' || g.tur === 'gezi' || g.tur === 'etkinlik')
            if (digerler.length === 0) return <p className="text-sm text-kraft">Henüz bir yazı/gezi/etkinlik paylaşımı yok.</p>
            return digerler.map((g, i) => (
              <div key={g.id}>
                <GonderiKarti gonderi={g} />
                {i < digerler.length - 1 && <div className="defter-cizgi mt-4" />}
              </div>
            ))
          })()}
        </div>
      )}

      {sekme === 'suanda' && (
        <div>
          {(() => {
            const suanFilmDizi = izlenecekler.filter((i) => i.durum === 'okunuyor' && (i.tur === 'sinema' || i.tur === 'dizi'))
            const suanKitap = izlenecekler.filter((i) => i.durum === 'okunuyor' && i.tur === 'kitap')
            if (suanFilmDizi.length === 0 && suanKitap.length === 0) {
              return <p className="text-sm text-kraft">Şu an okunan/izlenen bir şey yok.</p>
            }
            return (
              <>
                {suanFilmDizi.length > 0 && (
                  <div className="mb-8">
                    <h2 className="font-baslik text-lg text-murekkep mb-3">Şu An İzlediklerim</h2>
                    <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                      {suanFilmDizi.map((i) => (
                        <PosterKart key={i.id} baslik={i.baslik} alt={i.alt} posterUrl={i.posterUrl} link={esereLink(i.tur, i.disId)} />
                      ))}
                    </div>
                  </div>
                )}
                {suanKitap.length > 0 && (
                  <div>
                    <h2 className="font-baslik text-lg text-murekkep mb-3">Şu An Okuduklarım</h2>
                    <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                      {suanKitap.map((i) => (
                        <div key={i.id}>
                          <PosterKart baslik={i.baslik} alt={i.alt} posterUrl={i.posterUrl} link={esereLink(i.tur, i.disId)} />
                          {i.toplamSayfa ? (
                            <>
                              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-kagitKoyu ring-1 ring-cizgi">
                                <div
                                  className="h-full bg-deniz"
                                  style={{ width: `${Math.min(100, Math.round(((i.suankiSayfa || 0) / i.toplamSayfa) * 100))}%` }}
                                />
                              </div>
                              <p className="mt-0.5 text-[11px] text-kraft">
                                {i.suankiSayfa || 0} / {i.toplamSayfa} sayfa
                              </p>
                            </>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {sekme === 'tamamladiklarim' && (
        <div>
          {(() => {
            // "Bitirdim" artık kaydı silmek yerine durum:'tamamlandi' olarak
            // işaretliyor (bkz. utils/izlenecek.js) — bu sekme o kalıcı
            // veriyi gösteriyor. En son tamamlanan en üstte.
            const tamamlananFilmDizi = izlenecekler
              .filter((i) => i.durum === 'tamamlandi' && (i.tur === 'sinema' || i.tur === 'dizi'))
              .sort((a, b) => (b.tamamlanmaTarihi?.toMillis?.() || 0) - (a.tamamlanmaTarihi?.toMillis?.() || 0))
            const tamamlananKitap = izlenecekler
              .filter((i) => i.durum === 'tamamlandi' && i.tur === 'kitap')
              .sort((a, b) => (b.tamamlanmaTarihi?.toMillis?.() || 0) - (a.tamamlanmaTarihi?.toMillis?.() || 0))
            if (tamamlananFilmDizi.length === 0 && tamamlananKitap.length === 0) {
              return <p className="text-sm text-kraft">Henüz "Bitirdim" dediğin bir şey yok.</p>
            }
            return (
              <>
                {tamamlananFilmDizi.length > 0 && (
                  <div className="mb-8">
                    <h2 className="font-baslik text-lg text-murekkep mb-3">Tamamladıklarım</h2>
                    <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                      {tamamlananFilmDizi.map((i) => (
                        <PosterKart key={i.id} baslik={i.baslik} alt={i.alt} posterUrl={i.posterUrl} link={esereLink(i.tur, i.disId)} />
                      ))}
                    </div>
                  </div>
                )}
                {tamamlananKitap.length > 0 && (
                  <div>
                    <h2 className="font-baslik text-lg text-murekkep mb-3">Bitirdiğim Kitaplar</h2>
                    <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                      {tamamlananKitap.map((i) => (
                        <PosterKart key={i.id} baslik={i.baslik} alt={i.alt} posterUrl={i.posterUrl} link={esereLink(i.tur, i.disId)} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {sekme === 'meydanokumalar' && (
        <div>
          {benimProfilimMi && (
            <div className="mb-4">
              {meydanOkumaFormAcik ? (
                <MeydanOkumaFormu onOlustur={meydanOkumaOlusturTiklandi} onVazgec={() => setMeydanOkumaFormAcik(false)} />
              ) : (
                <button
                  onClick={() => setMeydanOkumaFormAcik(true)}
                  className="rounded-sm bg-gise px-3 py-1.5 font-govde text-xs text-kagit"
                >
                  + Yeni Meydan Okuma
                </button>
              )}
            </div>
          )}
          {meydanOkumalar === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
          {meydanOkumalar?.length === 0 && (
            <p className="text-sm text-kraft">
              {benimProfilimMi ? 'Henüz bir meydan okuma başlatmadın.' : 'Herkese açık bir meydan okuması yok.'}
            </p>
          )}
          <div className="space-y-3">
            {meydanOkumalar?.map((mo) => (
              <MeydanOkumaKarti
                key={mo.id}
                mo={mo}
                uid={uid}
                sahibiMiyim={benimProfilimMi}
                onSil={(id) => setMeydanOkumalar((liste) => liste.filter((m) => m.id !== id))}
              />
            ))}
          </div>
        </div>
      )}

      {sekme === 'oduncKitaplar' && (
        <div>
          {benimProfilimMi && itibarSayisi !== null && itibarSayisi > 0 && (
            <p className="mb-4 text-sm text-murekkep">🤝 Şimdiye kadar {itibarSayisi} kez kitap ödünç verdi.</p>
          )}

          <h2 className="mb-2 font-baslik text-lg text-murekkep">Ödünç Verdiklerim</h2>
          {oduncVerdiklerim === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
          {oduncVerdiklerim?.length === 0 && <p className="mb-6 text-sm text-kraft">Henüz kimseye kitap ödünç vermedin.</p>}
          <div className="mb-8 space-y-2">
            {oduncVerdiklerim?.map((i) => (
              <Link key={i.id} to={`/kitap/${i.disId}`} className="flex items-center gap-2 rounded-sm bg-kagitKoyu p-2.5 ring-1 ring-cizgi">
                {i.posterUrl && <img src={i.posterUrl} alt={i.baslik} className="h-12 w-8 shrink-0 rounded-sm object-cover" />}
                <div className="min-w-0">
                  <p className="truncate text-sm text-murekkep">{i.baslik}</p>
                  <p className="text-xs text-kraft">
                    {i.isteyenAdi}'e verildi{i.durum === 'tamamlandi' ? ' · ✓ iade edildi' : ` · iade: ${new Date(i.iadeTarihi).toLocaleDateString('tr-TR')}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <h2 className="mb-2 font-baslik text-lg text-murekkep">Ödünç Aldıklarım</h2>
          {oduncAldiklarim === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
          {oduncAldiklarim?.length === 0 && <p className="text-sm text-kraft">Henüz kimseden kitap ödünç almadın.</p>}
          <div className="space-y-2">
            {oduncAldiklarim?.map((i) => (
              <Link key={i.id} to={`/kitap/${i.disId}`} className="flex items-center gap-2 rounded-sm bg-kagitKoyu p-2.5 ring-1 ring-cizgi">
                {i.posterUrl && <img src={i.posterUrl} alt={i.baslik} className="h-12 w-8 shrink-0 rounded-sm object-cover" />}
                <div className="min-w-0">
                  <p className="truncate text-sm text-murekkep">{i.baslik}</p>
                  <p className="text-xs text-kraft">
                    {i.oduncVerenAdi}'den alındı{i.durum === 'tamamlandi' ? ' · ✓ iade edildi' : ` · iade: ${new Date(i.iadeTarihi).toLocaleDateString('tr-TR')}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* İzleyecek/Okuyacaklarım */}
      {sekme === 'izleyecegim' && (
        <div>
          {(() => {
            const bekleyenFilmDizi = izlenecekler.filter((i) => i.durum === 'planlanan' && (i.tur === 'sinema' || i.tur === 'dizi'))
            const bekleyenKitap = izlenecekler.filter((i) => i.durum === 'planlanan' && i.tur === 'kitap')
            if (bekleyenFilmDizi.length === 0 && bekleyenKitap.length === 0) {
              return <p className="text-sm text-kraft">Liste boş.</p>
            }
            return (
              <>
                {bekleyenFilmDizi.length > 0 && (
                  <div className="mb-8">
                    <h2 className="font-baslik text-lg text-murekkep mb-3">İzleyeceklerim</h2>
                    <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                      {bekleyenFilmDizi.map((i) => (
                        <div key={i.id} className="relative">
                          <PosterKart baslik={i.baslik} alt={i.alt} posterUrl={i.posterUrl} link={esereLink(i.tur, i.disId)} />
                          {benimProfilimMi && (
                            <button
                              onClick={() => izlenecekSil(i)}
                              className="absolute right-1 top-1 rounded-full bg-kagit/90 px-1.5 py-0.5 text-[10px] text-kraft ring-1 ring-cizgi hover:text-muhur"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {bekleyenKitap.length > 0 && (
                  <div>
                    <h2 className="font-baslik text-lg text-murekkep mb-3">Okuyacaklarım</h2>
                    <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                      {bekleyenKitap.map((i) => (
                        <div key={i.id} className="relative">
                          <PosterKart baslik={i.baslik} alt={i.alt} posterUrl={i.posterUrl} link={esereLink(i.tur, i.disId)} />
                          {benimProfilimMi && (
                            <button
                              onClick={() => izlenecekSil(i)}
                              className="absolute right-1 top-1 rounded-full bg-kagit/90 px-1.5 py-0.5 text-[10px] text-kraft ring-1 ring-cizgi hover:text-muhur"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* Favoriler */}
      {sekme === 'favoriler' && (
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            {FAVORI_TURLERI.map((t) => (
              <button
                key={t.id}
                onClick={() => setFavoriSekmesi(t.id)}
                className={`rounded-sm px-3 py-1 font-govde text-xs ${
                  favoriSekmesi === t.id ? 'bg-deniz text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
                }`}
              >
                {t.etiket}
              </button>
            ))}
          </div>
          {favoriler.length === 0 && <p className="text-sm text-kraft">Bu kategoride favori yok.</p>}
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
            {favoriler.map((f) => (
              <div key={f.id} className="relative">
                <PosterKart baslik={f.baslik} alt={f.alt} posterUrl={f.posterUrl} link={esereLink(f.tur, f.disId)} />
                {benimProfilimMi && (
                  <button
                    onClick={() => favoriSil(f)}
                    className="absolute right-1 top-1 rounded-full bg-kagit/90 px-1.5 py-0.5 text-[10px] text-kraft ring-1 ring-cizgi hover:text-muhur"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raflarım */}
      {sekme === 'raflarim' && (
        <div>
          {kullanici && (
            <button
              onClick={() => setRafFormuAcik((a) => !a)}
              className="mb-4 rounded-sm bg-muhur px-3 py-1.5 font-govde text-sm text-kagit"
            >
              {rafFormuAcik ? 'Vazgeç' : '+ Raf Oluştur'}
            </button>
          )}
          {rafFormuAcik && (
            <form onSubmit={rafOlusturTiklandi} className="mb-4 space-y-2 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
              <input
                type="text"
                value={rafBaslik}
                onChange={(e) => setRafBaslik(e.target.value)}
                required
                placeholder="Raf adı (örn. 2026 Okuma Listem)"
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
              <textarea
                value={rafAciklama}
                onChange={(e) => setRafAciklama(e.target.value)}
                rows={2}
                placeholder="Açıklama (opsiyonel)"
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
              <button
                type="submit"
                disabled={rafKaydediliyor}
                className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
              >
                {rafKaydediliyor ? 'Oluşturuluyor...' : 'Oluştur'}
              </button>
            </form>
          )}

          {raflar.length === 0 && <p className="text-sm text-kraft">Henüz bir raf oluşturmadın.</p>}
          <ul className="space-y-2">
            {raflar.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
                <Link to={`/raf/${r.id}`} className="flex-1">
                  <p className="font-govde text-sm text-murekkep">{r.baslik}</p>
                  {r.aciklama && <p className="text-xs text-kraft">{r.aciklama}</p>}
                  <p className="mt-0.5 text-[11px] text-kraft">{r.ogeSayisi || 0} eser</p>
                </Link>
                {benimProfilimMi && (
                  <button onClick={() => rafiSil(r.id)} className="text-xs text-kraft hover:text-muhur">
                    Sil
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Yorumlarım */}
      {sekme === 'yorumlarim' && (
        <div>
          {yorumlarim.length === 0 && <p className="text-sm text-kraft">Henüz kimseye yorum yapılmamış.</p>}
          <ul className="space-y-3">
            {yorumlarim.map((y) => {
              const esereMi = !y.gonderiId
              const link = esereMi
                ? y.eserTur === 'kitap'
                  ? `/kitap/${y.eserDisId}`
                  : y.eserTur === 'dizi'
                    ? `/dizi/${y.eserDisId}`
                    : `/film/${y.eserDisId}`
                : `/gonderi/${y.gonderiId}`
              const baslik = esereMi ? y.eserBaslik || (y.eserTur === 'kitap' ? 'Kitap' : y.eserTur === 'dizi' ? 'Dizi' : 'Film') : y.gonderiBasligi || 'Günce'
              return (
                <li key={y.id} className="rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
                  <Link to={link} className="text-xs text-deniz hover:underline">
                    {baslik}
                  </Link>
                  <p className="mt-1 text-sm text-murekkep">{y.metin}</p>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {sekme === 'listelerim' && benimProfilimMi && (
        <div>
          <Listelerim />
        </div>
      )}

      {sekme === 'sanatKoleksiyonum' && (
        <div>
          {sanatKoleksiyonu.length === 0 && <p className="text-sm text-kraft">Henüz koleksiyona eklenmiş bir eser yok.</p>}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {sanatKoleksiyonu.map((eser) => (
              <div key={eser.id} className="group relative">
                <a href={eser.sourceUrl} target="_blank" rel="noreferrer" className="block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                    <img src={eser.imageUrl} alt={eser.title} loading="lazy" className="h-full w-full object-cover" />
                    <span className="absolute bottom-0 right-0 rounded-tl-sm bg-murekkep/80 px-1 py-0.5 text-[9px] text-kagit">
                      {eser.kaynakAdi}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-murekkep">{eser.title}</p>
                  <p className="truncate text-[11px] text-kraft">{eser.artistDisplayName}</p>
                </a>
                {benimProfilimMi && (
                  <button
                    onClick={async () => {
                      if (!window.confirm('Bu eseri koleksiyonundan çıkarmak istediğine emin misin?')) return
                      await eseriKoleksiyondanCikar(uid, eser.eserId)
                      setSanatKoleksiyonu((liste) => liste.filter((e) => e.id !== eser.id))
                    }}
                    className="absolute right-1 top-1 rounded-full bg-kagit/90 px-1.5 py-0.5 text-[10px] text-kraft opacity-0 ring-1 ring-cizgi transition-opacity hover:text-muhur group-hover:opacity-100"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {sekme === 'filmMuzikleri' && (
        <div>
          {begenilenMuzikler.length === 0 && <p className="text-sm text-kraft">Henüz beğenilen bir film müziği yok.</p>}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {begenilenMuzikler.map((m) => (
              <div key={m.id} className="group relative">
                <Link to={`/film/${m.tmdbId}`} className="block">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                    {m.posterUrl && <img src={m.posterUrl} alt={m.filmBaslik} loading="lazy" className="h-full w-full object-cover" />}
                    <span className="absolute bottom-1 left-1 text-sm">🎵</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-murekkep">{m.filmBaslik}</p>
                  {m.filmYil && <p className="truncate text-[11px] text-kraft">{m.filmYil}</p>}
                </Link>
                {benimProfilimMi && (
                  <button
                    onClick={async () => {
                      await muzikBegeniKaldir(uid, m.tmdbId)
                      setBegenilenMuzikler((liste) => liste.filter((x) => x.id !== m.id))
                    }}
                    className="absolute right-1 top-1 rounded-full bg-kagit/90 px-1.5 py-0.5 text-[10px] text-kraft opacity-0 ring-1 ring-cizgi transition-opacity hover:text-muhur group-hover:opacity-100"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

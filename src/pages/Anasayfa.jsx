import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useGonderiler } from '../hooks/useGonderiler.js'
import { takipEdilenUidleriGetir } from '../hooks/useTakip.js'
import GonderiKarti from '../components/GonderiKarti.jsx'
import HabercKarti from '../components/HabercKarti.jsx'
import SonAlintilarBolumu from '../components/SonAlintilarBolumu.jsx'
import KitapDunyasiWidget from '../components/KitapDunyasiWidget.jsx'
import TavsiyeBildirimSeridi from '../components/TavsiyeBildirimSeridi.jsx'
import OneCikanlarSeridi from '../components/OneCikanlarSeridi.jsx'
import GunlukKesif from '../components/GunlukKesif.jsx'
import Logo from '../components/Logo.jsx'
import { sonHabercileriGetir, katilimDegistir, habercSil } from '../utils/etkinlikHabercisi.js'

// Gerçek gönderi türleri (GonderiEkle.jsx'teki KATEGORILER ile birebir aynı).
// Not: "Sanat" ayrı bir üst-tür değil — Yazı altında "Sanat Eleştirisi" alt
// türü olarak var; şimdilik Yazı filtresine dahil (ayrıca filtrelemek yeni
// bir composite index gerektirir).
const TUR_FILTRELERI = [
  { id: '', etiket: 'Tümü' },
  { id: 'sinema', etiket: '🎬 Film' },
  { id: 'dizi', etiket: '📺 Dizi' },
  { id: 'kitap', etiket: '📖 Kitap' },
  { id: 'yazi', etiket: '✍️ Yazı' },
  { id: 'gezi', etiket: '🧳 Gezi' },
  { id: 'etkinlik', etiket: '🎟️ Etkinlik' },
]

export default function Anasayfa() {
  const { kullanici } = useAuth()
  const [sekme, setSekme] = useState('takip') // 'takip' | 'herkes'
  const [turFiltre, setTurFiltre] = useState('') // '' = tümü
  const [takipEdilenler, setTakipEdilenler] = useState(null) // null = henüz yüklenmedi
  const [takipListesiYukleniyor, setTakipListesiYukleniyor] = useState(true)

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

  const { gonderiler, yukleniyor, hata, dahaFazlaVarMi, dahaFazlaYukle } = useGonderiler(
    !sorguAktifMi
      ? undefined
      : sekme === 'takip'
      ? { yazarIdListesi: takipFiltresi, tur: turFiltre || undefined }
      : { tur: turFiltre || undefined }
  )

  const gercektenYukleniyor = !sorguAktifMi || (sekme === 'takip' && takipListesiYukleniyor) || yukleniyor

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

      <TavsiyeBildirimSeridi />

      <div className="flex items-center justify-between mb-4">
        <h1 className="font-baslik text-2xl text-murekkep">Akış</h1>
        <Link to="/gonderi-ekle" className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-sm text-kagit">
          + Günce Ekle
        </Link>
      </div>

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

      <GunlukKesif />

      <KitapDunyasiWidget />

      <SonAlintilarBolumu limitSayisi={5} />

      {gercektenYukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {hata && <p className="text-sm text-muhur">Bir hata oldu: {hata}</p>}

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
    </div>
  )
}

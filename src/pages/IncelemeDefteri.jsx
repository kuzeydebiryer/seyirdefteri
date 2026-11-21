import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { gorunenAdGetir } from '../utils/gorunenAd.js'
import {
  INCELEME_BOLUMLERI,
  SAHNE_ALANLARI,
  filmKunyesiGetir,
  incelemeBolumleriniDinle,
  incelemeBolumuKaydet,
  kisiselNotGetir,
  kisiselNotKaydet,
  sahneNotlariniDinle,
  sahneNotuKaydet,
} from '../utils/incelemeDefteri.js'
import { kulupPuanlariniGetir } from '../utils/kulupPuanlari.js'
import ElestirmenIzgarasi from '../components/ElestirmenIzgarasi.jsx'
import IncelemeYazdirma from '../components/IncelemeYazdirma.jsx'

// Bir film etkinliğinin "İnceleme Defteri": kulübün ortak yazı alanları (konu,
// temalar, görsel dil…), kişisel notlar, puanlama ve A4 yazdırma şablonu.
// Sadece etkinliğin topluluğunun üyelerine açık (Firestore kuralı da denetliyor).

function BolumKutusu({ bolum, sunucuMetin, sonDuzenleyen, onKaydet }) {
  const [metin, setMetin] = useState(sunucuMetin || '')
  // taban: düzenlemeye başladığımız andaki sunucu metni (birleştirme için gerekli)
  const [taban, setTaban] = useState(sunucuMetin || '')
  const [durum, setDurum] = useState('')

  // Sunucuda (başkası tarafından) değişince: biz henüz bir şey yazmadıysak kutuyu canlı güncelle;
  // yazdıysak dokunma, kaydederken birleştirilecek.
  useEffect(() => {
    const yeni = sunucuMetin || ''
    if (yeni === taban) return
    if (metin === taban) {
      setMetin(yeni)
      setTaban(yeni)
      setDurum('Başka bir üye güncelledi ↻')
    } else {
      setDurum('Başka bir üye de yazdı — kaydedince metinler birleştirilecek')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sunucuMetin])

  async function blurdaKaydet() {
    if (metin === taban) return
    setDurum('Kaydediliyor…')
    try {
      const sonuc = await onKaydet(bolum.id, metin, taban)
      setMetin(sonuc.metin)
      setTaban(sonuc.metin)
      setDurum(sonuc.birlesti ? 'Birleştirildi ✓ (diğer üyenin yazdığı korundu)' : 'Kaydedildi ✓')
    } catch (err) {
      setDurum(`Kaydedilemedi: ${err.message}`)
    }
  }

  return (
    <div className="overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
      <div className="px-3 py-1.5 font-baslik text-sm text-white" style={{ background: bolum.renk }}>
        {bolum.ikon} {bolum.baslik}
      </div>
      <div className="p-3">
        <p className="mb-1.5 text-[11px] italic text-kraft">{bolum.ipucu}</p>
        <textarea
          value={metin}
          onChange={(e) => {
            setMetin(e.target.value)
            setDurum('')
          }}
          onBlur={blurdaKaydet}
          rows={5}
          maxLength={5000}
          className="w-full rounded-sm bg-kagit px-2 py-1.5 text-sm text-murekkep ring-1 ring-cizgi"
        />
        <p className="mt-1 text-[10px] text-kraft">
          {durum || (sonDuzenleyen ? `Son düzenleyen: ${sonDuzenleyen}` : 'Henüz yazılmadı')}
        </p>
      </div>
    </div>
  )
}

// Yakın Okuma: her üye kendi sahne notunu + Zoom sorusunu yazar; hepsi yan yana görünür.
function SahneBolumu({ kullanici, adim, kayitlar, onKaydet }) {
  const benim = kayitlar.find((k) => k.id === kullanici.uid)
  const bosAlanlar = () => Object.fromEntries(SAHNE_ALANLARI.map((a) => [a.id, '']))
  const kayittan = (k) => Object.fromEntries(SAHNE_ALANLARI.map((a) => [a.id, k?.[a.id] || '']))
  const [alanlar, setAlanlar] = useState(kayittan(benim) || bosAlanlar())
  const [kayitli, setKayitli] = useState(JSON.stringify(kayittan(benim)))
  const [durum, setDurum] = useState('')

  useEffect(() => {
    // Kendi kaydım başka cihazdan değiştiyse ve burada yazmadıysam yenile.
    const sunucu = JSON.stringify(kayittan(benim))
    if (sunucu !== kayitli && JSON.stringify(alanlar) === kayitli) {
      setAlanlar(kayittan(benim))
      setKayitli(sunucu)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [benim])

  async function blurdaKaydet() {
    if (JSON.stringify(alanlar) === kayitli) return
    setDurum('Kaydediliyor…')
    try {
      await onKaydet(alanlar)
      setKayitli(JSON.stringify(alanlar))
      setDurum('Kaydedildi ✓')
    } catch (err) {
      setDurum(`Kaydedilemedi: ${err.message}`)
    }
  }

  const digerleri = kayitlar.filter((k) => k.id !== kullanici.uid && SAHNE_ALANLARI.some((a) => k[a.id]))

  return (
    <div>
      <h2 className="mb-1 mt-6 font-baslik text-lg text-murekkep">🎞️ Yakın Okuma: Bir Sahne</h2>
      <p className="mb-3 text-xs text-kraft">
        Sahne seç → ne gördüğünü tarif et → etkisini yorumla → başka okuma var mı diye sor. Hepsini doldurmak gerekmiyor: bir sahne ve bir soru yeter.
      </p>
      <div className="overflow-hidden rounded-sm bg-kagitKoyu ring-2 ring-gise">
        <div className="bg-murekkep px-3 py-1.5 font-baslik text-sm text-yellow-300">✍️ {adim} — senin sahne notun</div>
        <div className="grid gap-3 p-3 md:grid-cols-2">
          {SAHNE_ALANLARI.map((a) => (
            <div key={a.id} className={a.id === 'sahne' || a.id === 'soru' ? 'md:col-span-2' : ''}>
              <label className="text-xs font-bold text-murekkep">{a.etiket}</label>
              <p className="mb-1 text-[11px] italic text-kraft">{a.ipucu}</p>
              <textarea
                value={alanlar[a.id]}
                onChange={(e) => {
                  setAlanlar((x) => ({ ...x, [a.id]: e.target.value }))
                  setDurum('')
                }}
                onBlur={blurdaKaydet}
                rows={a.satir === 1 ? 1 : a.satir === 2 ? 2 : 3}
                maxLength={a.maks}
                className="w-full rounded-sm bg-kagit px-2 py-1.5 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>
          ))}
        </div>
        <p className="px-3 pb-2 text-[10px] text-kraft">{durum || 'Kutudan çıkınca otomatik kaydedilir. Diğer üyeler okuyabilir, yalnızca sen düzenlersin.'}</p>
      </div>

      {digerleri.length > 0 && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {digerleri.map((k) => (
            <div key={k.id} className="overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
              <div className="bg-deniz px-3 py-1.5 font-baslik text-sm text-white">🎬 {k.kullaniciAdi || 'Üye'}</div>
              <div className="space-y-2 p-3 text-sm text-murekkep">
                {SAHNE_ALANLARI.filter((a) => k[a.id]).map((a) => (
                  <div key={a.id}>
                    <p className="text-[11px] font-bold text-kraft">{a.etiket}</p>
                    <p className="whitespace-pre-wrap">{k[a.id]}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function IncelemeDefteri() {
  const { etkinlikId } = useParams()
  const { kullanici, profil } = useAuth()
  const [etkinlik, setEtkinlik] = useState(null)
  const [uyeMi, setUyeMi] = useState(null)
  const [kunye, setKunye] = useState(null)
  const [bolumler, setBolumler] = useState({})
  const [sahneKayitlari, setSahneKayitlari] = useState([])
  const [kisiselNot, setKisiselNot] = useState('')
  const [kisiselKayitli, setKisiselKayitli] = useState('')
  const [kisiselDurum, setKisiselDurum] = useState('')
  const [yazdirModu, setYazdirModu] = useState(null)
  const [yazdirmaVerisi, setYazdirmaVerisi] = useState({ puanlar: [] })
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(true)

  const adim = gorunenAdGetir(profil, kullanici?.displayName)

  useEffect(() => {
    if (!kullanici) return
    let iptal = false
    const aboneler = []
    async function yukle() {
      const snap = await getDoc(doc(db, 'gelecekEtkinlikler', etkinlikId))
      if (!snap.exists()) {
        setHata('Etkinlik bulunamadı.')
        return
      }
      const e = { id: snap.id, ...snap.data() }
      const uye = await getDoc(doc(db, 'topluluklar', e.topluluklId, 'uyeler', kullanici.uid))
      if (iptal) return
      setEtkinlik(e)
      setUyeMi(uye.exists())
      if (!uye.exists()) return
      // Ortak bölümler ve sahne notları canlı: başka üye yazınca burada da belirir.
      const hataGoster = (err) => setHata(`Yüklenemedi: ${err.message}`)
      aboneler.push(incelemeBolumleriniDinle(etkinlikId, (b) => !iptal && setBolumler(b), hataGoster))
      aboneler.push(sahneNotlariniDinle(etkinlikId, (l) => !iptal && setSahneKayitlari(l), hataGoster))
      const [k, n] = await Promise.all([filmKunyesiGetir(e.eserTmdbId), kisiselNotGetir(etkinlikId, kullanici.uid)])
      if (iptal) return
      setKunye(k)
      setKisiselNot(n)
      setKisiselKayitli(n)
    }
    yukle()
      .catch((err) => setHata(`Yüklenemedi: ${err.message}`))
      .finally(() => !iptal && setYukleniyor(false))
    return () => {
      iptal = true
      aboneler.forEach((u) => u())
    }
  }, [etkinlikId, kullanici])

  // Yazdırma bittiğinde (ya da iptal edildiğinde) şablon modunu kapat.
  useEffect(() => {
    const kapat = () => setYazdirModu(null)
    window.addEventListener('afterprint', kapat)
    return () => window.removeEventListener('afterprint', kapat)
  }, [])

  async function yazdir(mod) {
    if (mod === 'dolu') {
      // En güncel puanlar/cümle basılsın diye yazdırmadan hemen önce yeniden çek.
      const puanlar = await kulupPuanlariniGetir(etkinlik).catch(() => [])
      setYazdirmaVerisi({ puanlar })
    }
    setYazdirModu(mod)
    setTimeout(() => window.print(), 500) // afiş görselinin yüklenmesi için kısa bekleme
  }

  async function bolumKaydet(bolumId, metin, taban) {
    return incelemeBolumuKaydet(etkinlikId, bolumId, metin, taban, kullanici, adim)
  }

  async function sahneKaydet(alanlar) {
    await sahneNotuKaydet(etkinlikId, kullanici, adim, alanlar)
  }

  async function kisiselKaydet() {
    if (kisiselNot === kisiselKayitli) return
    setKisiselDurum('Kaydediliyor…')
    try {
      await kisiselNotKaydet(etkinlikId, kullanici.uid, kisiselNot)
      setKisiselKayitli(kisiselNot)
      setKisiselDurum('Kaydedildi ✓')
    } catch (err) {
      setKisiselDurum(`Kaydedilemedi: ${err.message}`)
    }
  }

  if (hata) return <p className="text-sm text-muhur">{hata}</p>
  if (yukleniyor || !etkinlik) return <p className="text-sm text-kraft">Yükleniyor…</p>
  if (uyeMi === false) {
    return <p className="text-sm text-kraft">Bu defter yalnızca {etkinlik.topluluklAd} üyelerine açık.</p>
  }

  const benim = yazdirmaVerisi.puanlar.find((p) => p.kullaniciId === kullanici.uid)
  const tarih = etkinlik.tarih
    ? new Date(etkinlik.tarih).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div>
      <Link to={`/topluluk/${etkinlik.topluluklId}`} className="mb-2 inline-block text-xs text-kraft hover:text-deniz">
        ← {etkinlik.topluluklAd}
      </Link>

      {/* Sinemasal başlık */}
      <div className="overflow-hidden rounded-sm ring-1 ring-cizgi" style={{ background: 'linear-gradient(135deg,#14141f 0%,#2b1b3d 55%,#5c1a1a 100%)' }}>
        <div className="h-2" style={{ background: 'repeating-linear-gradient(90deg,transparent 0 8px,rgba(245,240,225,.85) 8px 16px)' }} />
        <div className="flex gap-4 p-4">
          {etkinlik.eserPosterUrl && (
            <img src={etkinlik.eserPosterUrl} alt={etkinlik.eserBaslik} className="h-40 w-[6.7rem] shrink-0 rounded-sm object-cover ring-2 ring-yellow-400/70" />
          )}
          <div className="min-w-0 text-white">
            <p className="text-[10px] uppercase tracking-[0.25em] text-yellow-300">🎬 İnceleme Defteri</p>
            <h1 className="font-baslik text-2xl leading-tight">{etkinlik.eserBaslik}</h1>
            <p className="mt-1 text-xs text-yellow-200/90">
              {[etkinlik.eserYil, kunye?.sureDk && `${kunye.sureDk} dk`, kunye?.turler?.join(', ')].filter(Boolean).join(' · ')}
            </p>
            {kunye?.yonetmenler?.length > 0 && <p className="mt-1 text-xs">Yönetmen: {kunye.yonetmenler.join(', ')}</p>}
            {kunye?.oyuncular?.length > 0 && <p className="text-xs text-white/80">Oyuncular: {kunye.oyuncular.join(', ')}</p>}
            {tarih && <p className="mt-1 text-[11px] text-white/70">📅 {tarih}</p>}
          </div>
        </div>
        <div className="h-2" style={{ background: 'repeating-linear-gradient(90deg,transparent 0 8px,rgba(245,240,225,.85) 8px 16px)' }} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => yazdir('bos')} className="rounded-full bg-gise px-4 py-1.5 font-govde text-xs text-murekkep">
          🖨️ Boş Şablonu Yazdır
        </button>
        <button onClick={() => yazdir('dolu')} className="rounded-full bg-kagitKoyu px-4 py-1.5 font-govde text-xs text-murekkep ring-1 ring-cizgi">
          🖨️ Yazılanlarla Yazdır
        </button>
      </div>

      <SahneBolumu kullanici={kullanici} adim={adim} kayitlar={sahneKayitlari} onKaydet={sahneKaydet} />

      {/* Ortak bölümler */}
      <h2 className="mb-2 mt-6 font-baslik text-lg text-murekkep">📓 Ortak Defter</h2>
      <p className="mb-3 text-xs text-kraft">
        Kutudan çıkınca otomatik kaydedilir. Kulüp üyelerinin hepsi görür ve düzenleyebilir; iki kişi aynı bölüme yazarsa metinler birleştirilir, kimse kimsenin yazısını ezmez.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {INCELEME_BOLUMLERI.map((b) => (
          <BolumKutusu key={b.id} bolum={b} sunucuMetin={bolumler[b.id]?.metin} sonDuzenleyen={bolumler[b.id]?.guncelleyenAd} onKaydet={bolumKaydet} />
        ))}
      </div>

      {/* Kişisel notlar */}
      <h2 className="mb-2 mt-6 font-baslik text-lg text-murekkep">✍️ Kişisel Notlarım</h2>
      <div className="overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
        <div className="p-3">
          <p className="mb-1.5 text-[11px] italic text-kraft">🔒 Sadece sen görürsün — ilk izlenim, sorular, aklına takılanlar…</p>
          <textarea
            value={kisiselNot}
            onChange={(e) => {
              setKisiselNot(e.target.value)
              setKisiselDurum('')
            }}
            onBlur={kisiselKaydet}
            rows={5}
            maxLength={5000}
            className="w-full rounded-sm bg-kagit px-2 py-1.5 text-sm text-murekkep ring-1 ring-cizgi"
          />
          <p className="mt-1 text-[10px] text-kraft">{kisiselDurum}</p>
        </div>
      </div>

      {/* Puanlama */}
      <h2 className="mb-1 mt-6 font-baslik text-lg text-murekkep">⭐ Puanlama</h2>
      <ElestirmenIzgarasi etkinlik={etkinlik} />

      <IncelemeYazdirma
        mod={yazdirModu}
        etkinlik={etkinlik}
        kunye={kunye}
        bolumler={bolumler}
        kisiselNot={kisiselNot}
        puanlar={yazdirmaVerisi.puanlar}
        benimPuanim={benim?.puan != null ? benim.puan * 2 : null}
        benimCumlem={benim?.cumle}
        kullaniciAdi={adim}
        sahne={sahneKayitlari.find((k) => k.id === kullanici.uid)}
        digerSorular={sahneKayitlari.filter((k) => k.id !== kullanici.uid && k.soru).map((k) => ({ ad: k.kullaniciAdi, soru: k.soru }))}
      />
    </div>
  )
}

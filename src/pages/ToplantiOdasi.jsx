import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from '../components/Avatar.jsx'
import { gorunenAdGetir } from '../utils/gorunenAd.js'
import { filmKunyesiGetir, incelemeBolumleriniDinle, sahneNotlariniDinle } from '../utils/incelemeDefteri.js'
import { medyaDinle } from '../utils/incelemeMedya.js'
import { anNotlariniDinle } from '../utils/altyazi.js'
import { kulupPuanlariniGetir } from '../utils/kulupPuanlari.js'
import {
  BOS_DURUM,
  klaketBirak,
  klaketDinle,
  klaketIste,
  odaDurumuDinle,
  odaDurumuGuncelle,
  oylariDinle,
  oyVerenleriDinle,
} from '../utils/sinemaOdasiCanli.js'
import { odaAcikMi, toplantiGirisiAl } from '../utils/toplantiOdasi.js'
import VideoSahnesi from '../components/toplanti/VideoSahnesi.jsx'
import KunyeCekmecesi from '../components/toplanti/KunyeCekmecesi.jsx'
import KlaketSirasi from '../components/toplanti/KlaketSirasi.jsx'
import PuanlamaToreni from '../components/toplanti/PuanlamaToreni.jsx'
import OrtakSunum from '../components/toplanti/OrtakSunum.jsx'
import EkranYansitma from '../components/toplanti/EkranYansitma.jsx'
import YansitPaneli from '../components/toplanti/YansitPaneli.jsx'
import AdayPaneli from '../components/toplanti/AdayPaneli.jsx'
import NotlarimKarti from '../components/toplanti/NotlarimKarti.jsx'
import { filmOdulAdayliklariGetir } from '../utils/odulAdayliklari.js'
import { BOS_EKRAN, adayOylariniDinle, adayOyumuGeriCek, adaylariDinle, adaySayimi, ekranDinle, ekranaYansit, ekraniKapat } from '../utils/odaEkrani.js'

// 🎬 Sinema Odası — /toplanti/:etkinlikId
// Site içi görüntülü kulüp toplantısı: Daily.co kameraları + filmin bulanık afiş zemini
// (ambiyans) + Tiyatro Modu + künye/kadro ve odadakiler paneli (Faz 1);
// klaketle söz isteme, gizli oylamalı puanlama töreni, senkron ortak sunum (Faz 2).
// Tam ekran katman olarak açılır (site menüsü görünmez). Renkler sabit sinema paleti.

const ALTIN = '#C9A227'

function Dugme({ children, onClick, aktif, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        aktif ? 'bg-[#C9A227] text-[#0b0b10]' : 'bg-white/10 text-[#f5f0e1] ring-1 ring-white/20 hover:bg-white/20'
      }`}
    >
      {children}
    </button>
  )
}

function Odadakiler({ katilimcilar, profiller }) {
  if (katilimcilar.length === 0) return <p className="text-sm text-[#b9b2a3]">Odaya girince katılımcılar burada görünür.</p>
  return (
    <ul className="space-y-2">
      {katilimcilar.map((k) => {
        const p = profiller[k.uid]
        const ad = p ? gorunenAdGetir(p, k.ad) : k.ad
        return (
          <li key={k.uid} className="flex items-center gap-3 rounded-sm bg-white/5 px-3 py-2 ring-1 ring-white/10">
            <Avatar adSoyad={ad} avatarUrl={p?.avatarUrl} boyut="h-9 w-9" />
            <span className="text-sm text-white">{ad}</span>
            {k.yerel && <span className="ml-auto text-[10px] uppercase tracking-wider text-[#C9A227]">sen</span>}
          </li>
        )
      })}
    </ul>
  )
}

export default function ToplantiOdasi() {
  const { etkinlikId } = useParams()
  const { kullanici, profil } = useAuth()
  const [etkinlik, setEtkinlik] = useState(null)
  const [kunye, setKunye] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')
  const [giris, setGiris] = useState(null)
  const [baglaniyor, setBaglaniyor] = useState(false)
  const [ayrildi, setAyrildi] = useState(false)
  const [tiyatro, setTiyatro] = useState(false)
  const [panel, setPanel] = useState('kunye')
  const [mobilPanel, setMobilPanel] = useState(false)
  const [katilimcilar, setKatilimcilar] = useState([])
  const [profiller, setProfiller] = useState({})
  // Faz 2 canlı katman
  const [durum, setDurum] = useState(BOS_DURUM)
  const [klaket, setKlaket] = useState([])
  const [oyVerenler, setOyVerenler] = useState([])
  const [oylar, setOylar] = useState([])
  const [toren, setToren] = useState(false)
  // Faz 2.5: ekrana yansıt, gelecek film oylaması, notlarım
  const [ekran, setEkran] = useState(BOS_EKRAN)
  const [topluluk, setTopluluk] = useState(null)
  const [adaylar, setAdaylar] = useState([])
  const [adayOylari, setAdayOylari] = useState([])
  const [notlarAcik, setNotlarAcik] = useState(false)
  const [adayliklar, setAdayliklar] = useState(null) // ödül adaylıkları (Oscar vb.)
  // Yankı önlemleri: Daily örneği + yerel mikrofon durumu + kısa bildirim
  const cagriRef = useRef(null)
  const [mikAcik, setMikAcik] = useState(false)
  const [bildirim, setBildirim] = useState('')
  const [defter, setDefter] = useState({ sahneKayitlari: [], bolumler: {}, medya: [], anNotlari: [], puanlar: [] })
  const adim = gorunenAdGetir(profil, kullanici?.displayName)
  const benimUid = kullanici?.uid
  const moderatorMu = !!giris?.moderatorMu

  useEffect(() => {
    let iptal = false
    async function yukle() {
      const s = await getDoc(doc(db, 'gelecekEtkinlikler', etkinlikId))
      if (!s.exists()) throw new Error('Etkinlik bulunamadı.')
      const e = { id: s.id, ...s.data() }
      if (iptal) return
      setEtkinlik(e)
      if (e.eserTmdbId) {
        filmOdulAdayliklariGetir(e.eserTmdbId)
          .then((a) => !iptal && setAdayliklar(a))
          .catch(() => !iptal && setAdayliklar({ toplam: 0, sezonlar: [] }))
        const k = await filmKunyesiGetir(e.eserTmdbId)
        if (!iptal) setKunye(k)
      }
    }
    yukle()
      .catch((err) => !iptal && setHata(err.message))
      .finally(() => !iptal && setYukleniyor(false))
    return () => {
      iptal = true
    }
  }, [etkinlikId])

  // Tam ekran katman açıkken sayfanın kaymasını kapat; Esc ile Tiyatro Modundan çık.
  useEffect(() => {
    const eski = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const tus = (e) => e.key === 'Escape' && setTiyatro(false)
    window.addEventListener('keydown', tus)
    return () => {
      document.body.style.overflow = eski
      window.removeEventListener('keydown', tus)
    }
  }, [])

  // Odadakilerin profil fotoğraflarını (bir kez) getir.
  useEffect(() => {
    const eksik = katilimcilar.map((k) => k.uid).filter((u) => u && !(u in profiller))
    if (eksik.length === 0) return
    Promise.all(eksik.map((u) => getDoc(doc(db, 'kullanicilar', u)).then((s) => [u, s.exists() ? s.data() : null]).catch(() => [u, null]))).then(
      (ciftler) => setProfiller((o) => ({ ...o, ...Object.fromEntries(ciftler) }))
    )
  }, [katilimcilar, profiller])

  // Odaya girince canlı katmana abone ol (üyelik sunucuda doğrulandı).
  useEffect(() => {
    if (!giris || !benimUid) return
    const sessiz = () => {}
    const aboneler = [
      odaDurumuDinle(etkinlikId, setDurum, sessiz),
      klaketDinle(etkinlikId, setKlaket, sessiz),
      oyVerenleriDinle(etkinlikId, setOyVerenler, sessiz),
      sahneNotlariniDinle(etkinlikId, (l) => setDefter((d) => ({ ...d, sahneKayitlari: l })), sessiz),
      incelemeBolumleriniDinle(etkinlikId, (b) => setDefter((d) => ({ ...d, bolumler: b })), sessiz),
      medyaDinle(etkinlikId, (l) => setDefter((d) => ({ ...d, medya: l })), sessiz),
      anNotlariniDinle(etkinlikId, benimUid, (l) => setDefter((d) => ({ ...d, anNotlari: l })), sessiz),
      ekranDinle(etkinlikId, setEkran, sessiz),
      adayOylariniDinle(etkinlikId, setAdayOylari, sessiz),
    ]
    return () => aboneler.forEach((u) => u && u())
  }, [giris, benimUid, etkinlikId])

  // Topluluk + kalıcı aday havuzu (Etkinlik Önerileri).
  const topluluklId = etkinlik?.topluluklId
  useEffect(() => {
    if (!giris || !topluluklId) return
    getDoc(doc(db, 'topluluklar', topluluklId))
      .then((s) => s.exists() && setTopluluk({ id: s.id, ...s.data() }))
      .catch(() => {})
    return adaylariDinle(topluluklId, setAdaylar, () => {})
  }, [giris, topluluklId])

  // Puan slaytı için kulüp puanları (bir kez).
  useEffect(() => {
    if (!giris || !etkinlik) return
    kulupPuanlariniGetir(etkinlik)
      .then((p) => setDefter((d) => ({ ...d, puanlar: p })))
      .catch(() => {})
  }, [giris, etkinlik])

  // Puanlar açılınca o turun oylarını dinle (açılmadan önce kural zaten reddeder).
  const { durum: puanDurumu, turId } = durum.puanlama
  useEffect(() => {
    if (!giris || puanDurumu !== 'acik' || !turId) return setOylar([])
    return oylariDinle(etkinlikId, turId, setOylar, () => {})
  }, [giris, etkinlikId, puanDurumu, turId])

  // Moderatör oylamayı başlatınca ya da puanları açınca tören herkesin ekranında açılır.
  useEffect(() => {
    if (puanDurumu === 'oylama' || puanDurumu === 'acik') setToren(true)
    else setToren(false)
  }, [puanDurumu, turId])

  const durumYaz = useCallback((veri) => odaDurumuGuncelle(etkinlikId, benimUid, veri), [etkinlikId, benimUid])
  const siradakiIndeks = useMemo(() => klaket.findIndex((k) => k.uid === benimUid), [klaket, benimUid])
  const klaketDegistir = () => {
    if (!benimUid) return
    const islem = siradakiIndeks >= 0 ? klaketBirak(etkinlikId, benimUid) : klaketIste(etkinlikId, benimUid, adim)
    islem.catch((e) => setHata(e?.message?.includes('permission') ? 'Söz isteği gönderilemedi (yetki).' : 'Söz isteği gönderilemedi.'))
  }
  const sunumAcik = !!giris && durum.sunum.acik
  const ekranAktif = !!giris && ekran.tur && ekran.tur !== 'yok'
  const yansit = useCallback((veri) => ekranaYansit(etkinlikId, benimUid, adim, veri), [etkinlikId, benimUid, adim])
  const ekranKapat = () => ekraniKapat(etkinlikId, benimUid, adim).catch(() => {})
  const adaySonuc = useMemo(() => adaySayimi(adaylar, adayOylari), [adaylar, adayOylari])
  const oylariSifirla = async () => {
    await Promise.all(adayOylari.map((o) => adayOyumuGeriCek(etkinlikId, o.uid)))
    await durumYaz({ adayOylamasi: { durum: 'kapali', kazananId: '' } })
  }

  async function odayaGir() {
    setHata('')
    setBaglaniyor(true)
    try {
      const g = await toplantiGirisiAl(etkinlikId)
      setAyrildi(false)
      setGiris(g)
    } catch (err) {
      setHata(err.message)
    } finally {
      setBaglaniyor(false)
    }
  }

  const ayril = useCallback(() => {
    if (benimUid) klaketBirak(etkinlikId, benimUid).catch(() => {})
    setGiris(null)
    setKatilimcilar([])
    setTiyatro(false)
    setAyrildi(true)
    setDurum(BOS_DURUM)
    setKlaket([])
    setEkran(BOS_EKRAN)
    setNotlarAcik(false)
  }, [etkinlikId, benimUid])
  const videoHatasi = useCallback((m) => setHata(m), [])
  const cagriAl = useCallback((c) => (cagriRef.current = c), [])

  // --- Yankı önlemleri ---
  const bildir = useCallback((m) => {
    setBildirim(m)
    clearTimeout(bildir.t)
    bildir.t = setTimeout(() => setBildirim(''), 6000)
  }, [])
  const mikrofonuKapat = useCallback(
    (neden) => {
      const c = cagriRef.current
      if (!c || !c.localAudio?.()) return
      c.setLocalAudio(false)
      if (neden) bildir(neden)
    },
    [bildir]
  )
  const mikrofonuAc = () => cagriRef.current?.setLocalAudio(true)
  const herkesiSustur = () => {
    try {
      cagriRef.current?.updateParticipants({ '*': { setAudio: false } })
      bildir('🔇 Herkesin mikrofonu kapatıldı.')
    } catch {
      setHata('Mikrofonlar kapatılamadı.')
    }
  }

  // 1) Senkron video oynamaya başlayınca herkesin mikrofonu kapanır (film sesi mikrofona girmesin).
  const videoOynuyor = ekran.tur === 'video' && !!ekran.oynatma?.oynuyor
  useEffect(() => {
    if (videoOynuyor) mikrofonuKapat('🎬 Video oynarken yankı olmasın diye mikrofonun kapatıldı.')
  }, [videoOynuyor, mikrofonuKapat])

  // 2) Söz sırası bitince (moderatör "✓ Konuştu" deyince ya da vazgeçince) mikrofon kapanır.
  const oncekiSira = useRef(-1)
  useEffect(() => {
    if (oncekiSira.current >= 0 && siradakiIndeks < 0) mikrofonuKapat('✓ Sözün bitti, mikrofonun kapatıldı.')
    oncekiSira.current = siradakiIndeks
  }, [siradakiIndeks, mikrofonuKapat])
  const sozSende = !!giris && siradakiIndeks === 0 && !mikAcik

  const arkaPlan = kunye?.backdropUrl || etkinlik?.eserPosterUrl || ''
  const tarihMetni = etkinlik?.tarih
    ? new Date(etkinlik.tarih).toLocaleString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', hour: '2-digit', minute: '2-digit' })
    : ''

  const panelIcerik = (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <Dugme aktif={panel === 'kunye'} onClick={() => setPanel('kunye')}>
          🎞️ Künye
        </Dugme>
        <Dugme aktif={panel === 'odadakiler'} onClick={() => setPanel('odadakiler')}>
          👥{katilimcilar.length > 0 ? ` ${katilimcilar.length}` : ' Odadakiler'}
        </Dugme>
        {giris && (
          <Dugme aktif={panel === 'sira'} onClick={() => setPanel('sira')}>
            🎬 Sıra{klaket.length > 0 ? ` (${klaket.length})` : ''}
          </Dugme>
        )}
        {giris && (
          <Dugme aktif={panel === 'puan'} onClick={() => setPanel('puan')}>
            ⭐ Puan
          </Dugme>
        )}
        {giris && (
          <Dugme aktif={panel === 'yansit'} onClick={() => setPanel('yansit')}>
            📺 Yansıt
          </Dugme>
        )}
        {giris && (
          <Dugme aktif={panel === 'aday'} onClick={() => setPanel('aday')}>
            🗳️ Adaylar{durum.adayOylamasi.durum === 'acik' ? ' •' : ''}
          </Dugme>
        )}
      </div>
      {panel === 'kunye' && <KunyeCekmecesi etkinlik={etkinlik} kunye={kunye} adayliklar={adayliklar} />}
      {panel === 'odadakiler' && <Odadakiler katilimcilar={katilimcilar} profiller={profiller} />}
      {panel === 'sira' && giris && <KlaketSirasi etkinlikId={etkinlikId} sira={klaket} benimUid={benimUid} moderatorMu={moderatorMu} />}
      {panel === 'yansit' && giris && etkinlik && (
        <YansitPaneli etkinlik={etkinlik} benimUid={benimUid} adim={adim} ekran={ekran} yansit={yansit} kapat={ekranKapat} medya={defter.medya} adayliklar={adayliklar} />
      )}
      {panel === 'aday' && giris && etkinlik && topluluk && (
        <AdayPaneli
          etkinlik={etkinlik}
          topluluk={topluluk}
          sonuc={adaySonuc}
          oylar={adayOylari}
          oylama={durum.adayOylamasi}
          benimUid={benimUid}
          adim={adim}
          moderatorMu={moderatorMu}
          durumYaz={durumYaz}
          yansit={yansit}
          oylariSifirla={oylariSifirla}
        />
      )}
      {panel === 'puan' && giris && etkinlik && toren && (
        <div className="rounded-sm bg-white/5 p-4 text-center ring-1 ring-white/10">
          <p className="text-sm text-[#d9d2c3]">⭐ Puanlama töreni ana ekranda açık.</p>
        </div>
      )}
      {panel === 'puan' && giris && etkinlik && !toren && (
        <PuanlamaToreni
          etkinlik={etkinlik}
          puanlama={durum.puanlama}
          oyVerenler={oyVerenler}
          oylar={oylar}
          benimUid={benimUid}
          adim={adim}
          moderatorMu={moderatorMu}
          durumYaz={durumYaz}
        />
      )}
      {panel === 'puan' && giris && !toren && puanDurumu !== 'bos' && (
        <button
          type="button"
          onClick={() => setToren(true)}
          className="mt-3 block w-full rounded-sm bg-white/10 px-3 py-2 text-xs text-white ring-1 ring-white/20 hover:bg-white/20"
        >
          ⛶ Töreni büyük ekranda aç
        </button>
      )}
      <Link
        to={`/inceleme/${etkinlikId}`}
        target="_blank"
        rel="noreferrer"
        className="mt-5 block rounded-sm bg-white/10 px-3 py-2 text-center text-xs text-[#f5f0e1] ring-1 ring-white/20 hover:bg-white/20"
      >
        📓 İnceleme Defterini yeni sekmede aç
      </Link>
    </>
  )

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden text-[#f5f0e1]" style={{ background: '#0b0b10' }}>
      {/* Ambiyans: filmin görseli, bulanık ve soluk */}
      {arkaPlan && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-700"
          style={{
            backgroundImage: `url(${arkaPlan})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(28px) saturate(1.25)',
            transform: 'scale(1.12)',
            opacity: tiyatro ? 0.1 : 0.6,
          }}
        />
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(11,11,16,.35) 0%, rgba(11,11,16,.7) 55%, rgba(11,11,16,.92) 100%)' }}
      />

      {/* Üst bar */}
      {!tiyatro ? (
        <header className="relative z-10 flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
          <Link to={`/inceleme/${etkinlikId}`} className="text-xs text-[#b9b2a3] hover:text-white" title="İnceleme Defterine dön">
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-baslik text-base text-white sm:text-lg">
              🎬 {etkinlik?.eserBaslik || 'Sinema Odası'}
              {etkinlik?.eserYil ? <span className="text-[#b9b2a3]"> ({etkinlik.eserYil})</span> : null}
            </p>
            <p className="truncate text-[11px] text-[#b9b2a3]">
              {etkinlik?.topluluklAd}
              {tarihMetni && ` · ${tarihMetni}`}
            </p>
          </div>
          {giris?.moderatorMu && (
            <span className="hidden rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0b0b10] sm:inline" style={{ background: ALTIN }}>
              Moderatör
            </span>
          )}
          <span className="lg:hidden">
            <Dugme aktif={mobilPanel} onClick={() => setMobilPanel((a) => !a)}>
              ℹ️<span className="hidden sm:inline"> Künye</span>
            </Dugme>
          </span>
          {giris && (
            <button
              type="button"
              onClick={klaketDegistir}
              title={siradakiIndeks >= 0 ? 'Söz isteğini geri çek' : 'Söz iste'}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                siradakiIndeks >= 0 ? 'text-[#0b0b10]' : 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20'
              }`}
              style={siradakiIndeks >= 0 ? { background: ALTIN } : undefined}
            >
              🎬<span className="hidden sm:inline">{siradakiIndeks >= 0 ? ` Sıradasın (${siradakiIndeks + 1}.)` : ' Söz İste'}</span>
              {siradakiIndeks >= 0 && <span className="sm:hidden"> {siradakiIndeks + 1}.</span>}
            </button>
          )}
          {giris && klaket.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setPanel('sira')
                setMobilPanel(true)
              }}
              className="hidden rounded-full bg-white/10 px-2.5 py-1.5 text-[11px] text-[#ffd84d] ring-1 ring-[#C9A227]/60 sm:inline"
              title="Söz sırası"
            >
              Klaket Sırası: {klaket.length}
            </button>
          )}
          {giris && moderatorMu && (
            <Dugme onClick={herkesiSustur} title="Herkesin mikrofonunu kapat (yankı/gürültü olunca)">
              🔇<span className="hidden sm:inline"> Herkesi Sustur</span>
            </Dugme>
          )}
          {giris && moderatorMu && (
            <Dugme aktif={durum.sunum.acik} onClick={() => {
                if (!durum.sunum.acik && ekranAktif) ekranKapat()
                durumYaz({ sunum: { acik: !durum.sunum.acik } }).catch((e) => setHata(e.message))
              }} title="Tartışma slaytlarını herkesin ekranında aç/kapat">
              🎞️<span className="hidden sm:inline"> {durum.sunum.acik ? 'Sunumu Kapat' : 'Ortak Sunum'}</span>
            </Dugme>
          )}
          {giris && (
            <Dugme aktif={notlarAcik} onClick={() => setNotlarAcik((a) => !a)} title="Yalnızca senin gördüğün konuşma notların">
              📝<span className="hidden sm:inline"> Notlarım</span>
            </Dugme>
          )}
          <Dugme onClick={() => setTiyatro(true)} title="Yan paneli ve menüyü gizle (Esc ile çık)">
            🌑<span className="hidden sm:inline"> Tiyatro Modu</span>
          </Dugme>
          {giris && (
            <button type="button" onClick={ayril} className="rounded-full bg-[#9b1c1c] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#b42323]">
              Ayrıl
            </button>
          )}
        </header>
      ) : (
        <button
          type="button"
          onClick={() => setTiyatro(false)}
          className="absolute right-3 top-3 z-20 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white ring-1 ring-white/20 hover:bg-black/80"
        >
          ☀️ Tiyatro Modundan Çık
        </button>
      )}

      {/* Sahne + yan panel */}
      <div className={`relative z-10 flex min-h-0 flex-1 gap-3 ${tiyatro ? 'p-1 sm:p-2' : 'p-2 sm:p-3'}`}>
        <section className="relative flex min-w-0 flex-1 flex-col gap-2 overflow-hidden rounded-md bg-black/40 ring-1 ring-white/10 lg:flex-row">
          {(sunumAcik || ekranAktif) && (
            <div className="min-h-0 flex-1 overflow-hidden lg:order-first">
              {ekranAktif ? (
                <EkranYansitma
                  ekran={ekran}
                  adaySonuc={adaySonuc}
                  adayOylamasi={durum.adayOylamasi}
                  onKapat={ekranKapat}
                  onVurgu={(i) =>
                    yansit({ tur: ekran.tur, ...(ekran.liste ? { liste: ekran.liste } : {}), ...(ekran.odul ? { odul: ekran.odul } : {}), vurgu: i }).catch(() => {})
                  }
                  kontrolEdebilir={ekran.yansitanId === benimUid || moderatorMu}
                  onOynatma={(oynatma) => yansit({ tur: 'video', video: ekran.video, oynatma }).catch(() => {})}
                />
              ) : (
                <OrtakSunum etkinlik={etkinlik} kunye={kunye} veri={defter} sunum={durum.sunum} moderatorMu={moderatorMu} durumYaz={durumYaz} />
              )}
            </div>
          )}
          {giris ? (
            <div className={sunumAcik || ekranAktif ? 'h-44 shrink-0 sm:h-56 lg:h-auto lg:w-[34%]' : 'min-h-0 flex-1'}>
              <VideoSahnesi giris={giris} onAyrildi={ayril} onKatilimcilar={setKatilimcilar} onHata={videoHatasi} onCagri={cagriAl} onMikrofon={setMikAcik} />
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 overflow-y-auto p-6 text-center">
              {yukleniyor ? (
                <p className="text-sm text-[#b9b2a3]">Yükleniyor…</p>
              ) : (
                <>
                  {(kunye?.posterUrl || etkinlik?.eserPosterUrl) && (
                    <img
                      src={kunye?.posterUrl || etkinlik.eserPosterUrl}
                      alt={etkinlik?.eserBaslik}
                      className="w-32 rounded-sm shadow-2xl ring-1 ring-white/20 sm:w-40"
                    />
                  )}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#C9A227]">{ayrildi ? 'Perde kapandı' : 'Sinema Odası'}</p>
                    <h1 className="mt-1 font-baslik text-3xl text-white sm:text-4xl">{etkinlik?.eserBaslik}</h1>
                    {tarihMetni && <p className="mt-1 text-sm text-[#d9d2c3]">{tarihMetni}</p>}
                  </div>
                  {etkinlik && (
                    <button
                      type="button"
                      onClick={odayaGir}
                      disabled={baglaniyor || !kullanici}
                      className="rounded-full px-8 py-3 text-base font-bold text-[#0b0b10] shadow-lg transition hover:brightness-110 disabled:opacity-50"
                      style={{ background: ALTIN }}
                    >
                      {baglaniyor ? 'Oda hazırlanıyor…' : ayrildi ? '🎬 Tekrar Gir' : '🎬 Odaya Gir'}
                    </button>
                  )}
                  {etkinlik && !odaAcikMi(etkinlik) && !ayrildi && (
                    <p className="text-xs text-[#d9d2c3]">Oda, etkinlikten 3 saat önce açılır (moderatörler deneme için her zaman girebilir).</p>
                  )}
                  {hata && <p className="max-w-md rounded-sm bg-[#9b1c1c]/80 px-3 py-2 text-sm text-white">{hata}</p>}
                  {ayrildi ? (
                    <div className="flex flex-wrap justify-center gap-2">
                      <Link to={`/inceleme/${etkinlikId}`} className="rounded-full bg-white/10 px-4 py-1.5 text-xs text-white ring-1 ring-white/20">
                        📓 İnceleme Defteri
                      </Link>
                      <Link to={`/inceleme/${etkinlikId}/ozet`} className="rounded-full bg-white/10 px-4 py-1.5 text-xs text-white ring-1 ring-white/20">
                        📄 Kulüp Özeti
                      </Link>
                    </div>
                  ) : (
                    <p className="max-w-md text-xs leading-relaxed text-[#b9b2a3]">
                      Kamera ve mikrofon izni istenecek; girmeden önce görüntünü ve sesini deneyebilirsin. Oda yalnızca kulüp üyelerine açık, kayıt alınmaz.
                      <br />
                      <span className="text-[#ffd84d]">🎧 Yankı olmaması için kulaklık tak; aynı odadan iki cihazla bağlanma. Mikrofonun kapalı başlar, konuşurken aç.</span>
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          {giris && notlarAcik && (
            <div className="absolute inset-x-0 bottom-0 z-10 h-[62%] p-1 lg:static lg:h-auto lg:w-80 lg:shrink-0 lg:p-0">
              <NotlarimKarti etkinlikId={etkinlikId} benimUid={benimUid} defter={defter} kapat={() => setNotlarAcik(false)} />
            </div>
          )}
          {giris && toren && etkinlik && (
            <div className="absolute inset-0 z-20 overflow-y-auto bg-[#0b0b10]/90 p-4 backdrop-blur-sm sm:p-8">
              <div className="mx-auto max-w-2xl">
                <PuanlamaToreni
                  etkinlik={etkinlik}
                  puanlama={durum.puanlama}
                  oyVerenler={oyVerenler}
                  oylar={oylar}
                  benimUid={benimUid}
                  adim={adim}
                  moderatorMu={moderatorMu}
                  durumYaz={durumYaz}
                  kucult={() => {
                    setToren(false)
                    setPanel('puan')
                  }}
                />
              </div>
            </div>
          )}
          {giris && sozSende && (
            <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#0b0b10]/95 px-4 py-2 shadow-2xl ring-2 ring-[#ffd84d]">
              <span className="text-sm font-bold text-[#ffd84d]">🎬 Söz sende!</span>
              <button type="button" onClick={mikrofonuAc} className="rounded-full px-3 py-1 text-xs font-bold text-[#0b0b10]" style={{ background: '#ffd84d' }}>
                🎙️ Mikrofonumu aç
              </button>
            </div>
          )}
          {giris && bildirim && !sozSende && (
            <p className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full bg-[#0b0b10]/95 px-4 py-2 text-xs text-white shadow-xl ring-1 ring-white/20">
              {bildirim}
            </p>
          )}
          {giris && hata && (
            <p className="absolute inset-x-3 bottom-3 rounded-sm bg-[#9b1c1c]/90 px-3 py-2 text-sm text-white">{hata}</p>
          )}
        </section>

        {!tiyatro && (
          <aside className="hidden w-80 shrink-0 overflow-y-auto rounded-md bg-black/45 p-4 ring-1 ring-white/10 backdrop-blur-md lg:block">{panelIcerik}</aside>
        )}

        {/* Mobil / tablet: alttan açılan çekmece */}
        {!tiyatro && mobilPanel && (
          <div className="absolute inset-x-0 bottom-0 z-20 max-h-[75%] overflow-y-auto rounded-t-xl bg-[#121219]/95 p-4 ring-1 ring-white/15 backdrop-blur-md lg:hidden">
            <button type="button" onClick={() => setMobilPanel(false)} className="mb-2 block w-full text-center text-xs text-[#b9b2a3]">
              ▾ Kapat
            </button>
            {panelIcerik}
          </div>
        )}
      </div>
    </div>
  )
}

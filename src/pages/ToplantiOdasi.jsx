import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from '../components/Avatar.jsx'
import { gorunenAdGetir } from '../utils/gorunenAd.js'
import { filmKunyesiGetir } from '../utils/incelemeDefteri.js'
import { odaAcikMi, toplantiGirisiAl } from '../utils/toplantiOdasi.js'
import VideoSahnesi from '../components/toplanti/VideoSahnesi.jsx'
import KunyeCekmecesi from '../components/toplanti/KunyeCekmecesi.jsx'

// 🎬 Sinema Odası — /toplanti/:etkinlikId
// Site içi görüntülü kulüp toplantısı (Faz 1): Daily.co kameraları + filmin
// bulanık afiş zemini (ambiyans) + Tiyatro Modu + künye/kadro ve odadakiler paneli.
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
  const { kullanici } = useAuth()
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

  useEffect(() => {
    let iptal = false
    async function yukle() {
      const s = await getDoc(doc(db, 'gelecekEtkinlikler', etkinlikId))
      if (!s.exists()) throw new Error('Etkinlik bulunamadı.')
      const e = { id: s.id, ...s.data() }
      if (iptal) return
      setEtkinlik(e)
      if (e.eserTmdbId) {
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
    setGiris(null)
    setKatilimcilar([])
    setTiyatro(false)
    setAyrildi(true)
  }, [])
  const videoHatasi = useCallback((m) => setHata(m), [])

  const arkaPlan = kunye?.backdropUrl || etkinlik?.eserPosterUrl || ''
  const tarihMetni = etkinlik?.tarih
    ? new Date(etkinlik.tarih).toLocaleString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', hour: '2-digit', minute: '2-digit' })
    : ''

  const panelIcerik = (
    <>
      <div className="mb-3 flex gap-2">
        <Dugme aktif={panel === 'kunye'} onClick={() => setPanel('kunye')}>
          🎞️ Künye
        </Dugme>
        <Dugme aktif={panel === 'odadakiler'} onClick={() => setPanel('odadakiler')}>
          👥 Odadakiler{katilimcilar.length > 0 ? ` (${katilimcilar.length})` : ''}
        </Dugme>
      </div>
      {panel === 'kunye' ? <KunyeCekmecesi etkinlik={etkinlik} kunye={kunye} /> : <Odadakiler katilimcilar={katilimcilar} profiller={profiller} />}
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
        <section className="relative min-w-0 flex-1 overflow-hidden rounded-md bg-black/40 ring-1 ring-white/10">
          {giris ? (
            <VideoSahnesi giris={giris} onAyrildi={ayril} onKatilimcilar={setKatilimcilar} onHata={videoHatasi} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 overflow-y-auto p-6 text-center">
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
                    </p>
                  )}
                </>
              )}
            </div>
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

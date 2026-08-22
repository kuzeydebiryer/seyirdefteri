import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ULKELER } from '../data/ulkeler.js'
import { geziPlaniGetir, geziPlaniGuncelle, geziPlaniSil } from '../utils/geziPlanlari.js'
import GeziPlaniPaylasim from '../components/GeziPlaniPaylasim.jsx'
import KisiselBilgilerBolumu from '../components/KisiselBilgilerBolumu.jsx'

const HAVAYOLLARI = ['Pegasus', 'THY', 'AJet', 'Diğer']
const MADDE_TIPI_IKONU = { gezilecek: '📍', 'yeme-icme': '🍽️', ulasim: '🚕', diger: '📌' }
const MADDE_TIPI_ETIKETI = { gezilecek: 'Gezilecek Yer', 'yeme-icme': 'Yeme-İçme', ulasim: 'Ulaşım', diger: 'Diğer' }
const UCUS_ALANLARI = [
  { key: 'pnr', etiket: 'PNR', tip: 'text' },
  { key: 'ucret', etiket: 'Ücret', tip: 'number' },
]
const UCRET_ALANI = [{ key: 'ucret', etiket: 'Ücret', tip: 'number' }]

function benzersizId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function butceToplamHesapla(kisiselBilgiler = {}) {
  return Object.values(kisiselBilgiler).reduce((t, v) => t + (Number(v?.ucret) || 0), 0)
}

// Ard arda gelen günleri aynı ülke/şehirse tek grupta birleştirir — "1-2.
// Gün: İstanbul, Türkiye → 3-5. Gün: Roma, İtalya" gibi bir rota özeti için.
function rotaOzetiHesapla(gunler = []) {
  const gruplar = []
  gunler.forEach((g) => {
    const konumAnahtari = `${g.ulkeKodu || ''}|${g.sehir || ''}`
    const sonGrup = gruplar[gruplar.length - 1]
    if (sonGrup && sonGrup.konumAnahtari === konumAnahtari) {
      sonGrup.gunSonu = g.gunNo
    } else {
      gruplar.push({ konumAnahtari, gunBasi: g.gunNo, gunSonu: g.gunNo, sehir: g.sehir, ulkeAdi: g.ulkeAdi })
    }
  })
  return gruplar.filter((gr) => gr.sehir || gr.ulkeAdi)
}

// ---------------------------------------------------------------------
// Uçuş bölümü
// ---------------------------------------------------------------------
function UcusForm({ onEkle, onVazgec, currentUid }) {
  const [havayolu, setHavayolu] = useState('Pegasus')
  const [digerHavayolu, setDigerHavayolu] = useState('')
  const [gidisTarihSaat, setGidisTarihSaat] = useState('')
  const [donusTarihSaat, setDonusTarihSaat] = useState('')
  const [ucret, setUcret] = useState('')
  const [pnr, setPnr] = useState('')

  function ekle(e) {
    e.preventDefault()
    const kisiselBilgiler = {}
    if (ucret || pnr) kisiselBilgiler[currentUid] = { ucret: ucret ? Number(ucret) : null, pnr: pnr.trim() }
    onEkle({
      id: benzersizId(),
      havayolu: havayolu === 'Diğer' ? digerHavayolu.trim() || 'Diğer' : havayolu,
      gidisTarihSaat,
      donusTarihSaat,
      kisiselBilgiler,
      tik: false,
    })
  }

  return (
    <form onSubmit={ekle} className="mt-2 space-y-2 rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
      <div className="grid grid-cols-2 gap-2">
        <select value={havayolu} onChange={(e) => setHavayolu(e.target.value)} className="rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi">
          {HAVAYOLLARI.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        {havayolu === 'Diğer' && (
          <input
            type="text"
            value={digerHavayolu}
            onChange={(e) => setDigerHavayolu(e.target.value)}
            placeholder="Havayolu adı"
            className="rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
          />
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-0.5 block text-[10px] text-kraft">Gidiş</label>
          <input
            type="datetime-local"
            value={gidisTarihSaat}
            onChange={(e) => setGidisTarihSaat(e.target.value)}
            required
            className="w-full rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] text-kraft">Dönüş</label>
          <input
            type="datetime-local"
            value={donusTarihSaat}
            onChange={(e) => setDonusTarihSaat(e.target.value)}
            className="w-full rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
          />
        </div>
      </div>
      <p className="text-[10px] text-kraft">Aşağıdaki PNR/ücret SENİN bilgin olarak kaydedilir — plan paylaşıldığında herkes kendi bilgisini ayrıca ekleyebilir.</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={pnr}
          onChange={(e) => setPnr(e.target.value)}
          placeholder="Senin PNR'in (opsiyonel)"
          className="rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
        />
        <input
          type="number"
          value={ucret}
          onChange={(e) => setUcret(e.target.value)}
          placeholder="Senin ücretin (₺, opsiyonel)"
          className="rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit">
          Ekle
        </button>
        <button type="button" onClick={onVazgec} className="text-xs text-kraft hover:text-murekkep">
          Vazgeç
        </button>
      </div>
    </form>
  )
}

function UcusSatiri({ ucus, onTikDegistir, onSil, onKisiselKaydet, currentUid, isimHaritasi }) {
  const gidis = ucus.gidisTarihSaat ? new Date(ucus.gidisTarihSaat).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
  const donus = ucus.donusTarihSaat ? new Date(ucus.donusTarihSaat).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className="flex items-start gap-2 rounded-sm bg-kagit p-2.5 ring-1 ring-cizgi">
      <input type="checkbox" checked={!!ucus.tik} onChange={onTikDegistir} className="mt-1 h-4 w-4 shrink-0 accent-muhur" />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${ucus.tik ? 'text-kraft line-through' : 'text-murekkep'}`}>✈️ {ucus.havayolu}</p>
        <p className="text-xs text-kraft">
          Gidiş: {gidis || '—'}
          {donus && <> · Dönüş: {donus}</>}
        </p>
        <KisiselBilgilerBolumu kisiselBilgiler={ucus.kisiselBilgiler} alanlar={UCUS_ALANLARI} currentUid={currentUid} isimHaritasi={isimHaritasi} onKaydet={onKisiselKaydet} />
      </div>
      <button onClick={onSil} className="shrink-0 text-[11px] text-kraft hover:text-muhur">
        Sil
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------
// Konaklama bölümü
// ---------------------------------------------------------------------
function KonaklamaForm({ onEkle, onVazgec, currentUid }) {
  const [ad, setAd] = useState('')
  const [konum, setKonum] = useState('')
  const [girisTarihi, setGirisTarihi] = useState('')
  const [cikisTarihi, setCikisTarihi] = useState('')
  const [ucret, setUcret] = useState('')

  function ekle(e) {
    e.preventDefault()
    if (!ad.trim()) return
    const kisiselBilgiler = {}
    if (ucret) kisiselBilgiler[currentUid] = { ucret: Number(ucret) }
    onEkle({
      id: benzersizId(),
      ad: ad.trim(),
      konum: konum.trim(),
      girisTarihi,
      cikisTarihi,
      kisiselBilgiler,
      tik: false,
    })
  }

  return (
    <form onSubmit={ekle} className="mt-2 space-y-2 rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
      <input
        type="text"
        value={ad}
        onChange={(e) => setAd(e.target.value)}
        placeholder="Otel / ev adı"
        required
        className="w-full rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
      />
      <input
        type="text"
        value={konum}
        onChange={(e) => setKonum(e.target.value)}
        placeholder="Konum / adres"
        className="w-full rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-0.5 block text-[10px] text-kraft">Giriş</label>
          <input
            type="date"
            value={girisTarihi}
            onChange={(e) => setGirisTarihi(e.target.value)}
            className="w-full rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] text-kraft">Çıkış</label>
          <input
            type="date"
            value={cikisTarihi}
            onChange={(e) => setCikisTarihi(e.target.value)}
            className="w-full rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
          />
        </div>
      </div>
      <p className="text-[10px] text-kraft">Aşağıdaki ücret SENİN bilgin olarak kaydedilir — herkes kendi payını ayrıca ekleyebilir.</p>
      <input
        type="number"
        value={ucret}
        onChange={(e) => setUcret(e.target.value)}
        placeholder="Senin ödediğin ücret (₺, opsiyonel)"
        className="w-full rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
      />
      <div className="flex gap-2">
        <button type="submit" className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit">
          Ekle
        </button>
        <button type="button" onClick={onVazgec} className="text-xs text-kraft hover:text-murekkep">
          Vazgeç
        </button>
      </div>
    </form>
  )
}

function KonaklamaSatiri({ konaklama, onTikDegistir, onSil, onKisiselKaydet, currentUid, isimHaritasi }) {
  const giris = konaklama.girisTarihi ? new Date(konaklama.girisTarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : ''
  const cikis = konaklama.cikisTarihi ? new Date(konaklama.cikisTarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : ''
  return (
    <div className="flex items-start gap-2 rounded-sm bg-kagit p-2.5 ring-1 ring-cizgi">
      <input type="checkbox" checked={!!konaklama.tik} onChange={onTikDegistir} className="mt-1 h-4 w-4 shrink-0 accent-muhur" />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${konaklama.tik ? 'text-kraft line-through' : 'text-murekkep'}`}>🏨 {konaklama.ad}</p>
        {konaklama.konum && <p className="text-xs text-kraft">📍 {konaklama.konum}</p>}
        {(giris || cikis) && (
          <p className="text-xs text-kraft">
            {giris || '—'} → {cikis || '—'}
          </p>
        )}
        <KisiselBilgilerBolumu kisiselBilgiler={konaklama.kisiselBilgiler} alanlar={UCRET_ALANI} currentUid={currentUid} isimHaritasi={isimHaritasi} onKaydet={onKisiselKaydet} />
      </div>
      <button onClick={onSil} className="shrink-0 text-[11px] text-kraft hover:text-muhur">
        Sil
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------
// Gün gün program bölümü
// ---------------------------------------------------------------------
function MaddeForm({ onEkle, onVazgec, currentUid }) {
  const [tip, setTip] = useState('gezilecek')
  const [baslik, setBaslik] = useState('')
  const [konum, setKonum] = useState('')
  const [saat, setSaat] = useState('')
  const [not_, setNot_] = useState('')
  const [ucret, setUcret] = useState('')

  function ekle(e) {
    e.preventDefault()
    if (!baslik.trim()) return
    const kisiselBilgiler = {}
    if (ucret) kisiselBilgiler[currentUid] = { ucret: Number(ucret) }
    onEkle({
      id: benzersizId(),
      tip,
      baslik: baslik.trim(),
      konum: konum.trim(),
      saat,
      not: not_.trim(),
      kisiselBilgiler,
      tik: false,
    })
  }

  return (
    <form onSubmit={ekle} className="mt-2 space-y-2 rounded-sm bg-kagitKoyu p-2.5 ring-1 ring-cizgi">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(MADDE_TIPI_ETIKETI).map(([deger, etiket]) => (
          <button
            key={deger}
            type="button"
            onClick={() => setTip(deger)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-govde ring-1 ${
              tip === deger ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagit text-kraft ring-cizgi'
            }`}
          >
            {MADDE_TIPI_IKONU[deger]} {etiket}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={baslik}
        onChange={(e) => setBaslik(e.target.value)}
        placeholder={tip === 'yeme-icme' ? 'Restoran adı' : tip === 'ulasim' ? 'Ulaşım (örn. Havalimanı → Otel, taksi)' : 'Ne yapılacak / nereye gidilecek'}
        required
        className="w-full rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={konum}
          onChange={(e) => setKonum(e.target.value)}
          placeholder="Konum (opsiyonel)"
          className="rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
        />
        <input
          type="time"
          value={saat}
          onChange={(e) => setSaat(e.target.value)}
          className="rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
        />
      </div>
      <input
        type="number"
        value={ucret}
        onChange={(e) => setUcret(e.target.value)}
        placeholder="Senin ücretin (₺, opsiyonel)"
        className="w-full rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
      />
      <textarea
        value={not_}
        onChange={(e) => setNot_(e.target.value)}
        rows={2}
        placeholder="Not (opsiyonel)"
        className="w-full rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
      />
      <div className="flex gap-2">
        <button type="submit" className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit">
          Ekle
        </button>
        <button type="button" onClick={onVazgec} className="text-xs text-kraft hover:text-murekkep">
          Vazgeç
        </button>
      </div>
    </form>
  )
}

function MaddeSatiri({ madde, onTikDegistir, onSil, onKisiselKaydet, currentUid, isimHaritasi }) {
  return (
    <div className="flex items-start gap-2 rounded-sm bg-kagitKoyu p-2 ring-1 ring-cizgi">
      <input type="checkbox" checked={!!madde.tik} onChange={onTikDegistir} className="mt-0.5 h-4 w-4 shrink-0 accent-muhur" />
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${madde.tik ? 'text-kraft line-through' : 'text-murekkep'}`}>
          {MADDE_TIPI_IKONU[madde.tip]} {madde.baslik}
          {madde.saat && <span className="text-kraft"> · {madde.saat}</span>}
        </p>
        {madde.konum && <p className="text-[11px] text-kraft">📍 {madde.konum}</p>}
        {madde.not && <p className="text-[11px] text-kraft">{madde.not}</p>}
        <KisiselBilgilerBolumu kisiselBilgiler={madde.kisiselBilgiler} alanlar={UCRET_ALANI} currentUid={currentUid} isimHaritasi={isimHaritasi} onKaydet={onKisiselKaydet} />
      </div>
      <button onClick={onSil} className="shrink-0 text-[11px] text-kraft hover:text-muhur">
        Sil
      </button>
    </div>
  )
}

function GunKarti({ gun, onGunSil, onMaddeEkle, onMaddeSil, onMaddeTikDegistir, onMaddeKisiselKaydet, onBaslikDegistir, onKonumDegistir, currentUid, isimHaritasi }) {
  const [maddeFormAcik, setMaddeFormAcik] = useState(false)

  return (
    <div className="rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
      <div className="mb-2 flex items-center justify-between gap-2">
        <input
          type="text"
          value={gun.baslik}
          onChange={(e) => onBaslikDegistir(e.target.value)}
          className="min-w-0 flex-1 bg-transparent font-baslik text-sm text-murekkep focus:outline-none"
        />
        <button onClick={onGunSil} className="shrink-0 text-[11px] text-kraft hover:text-muhur">
          Günü Sil
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-2">
        <select
          value={gun.ulkeKodu || ''}
          onChange={(e) => {
            const secilen = ULKELER.find((u) => u.kod === e.target.value)
            onKonumDegistir({ ulkeKodu: secilen?.kod || '', ulkeAdi: secilen?.ad || '', sehir: gun.sehir || '' })
          }}
          className="rounded-sm bg-kagitKoyu px-2 py-1 text-[11px] text-murekkep ring-1 ring-cizgi"
        >
          <option value="">Ülke seç...</option>
          {ULKELER.map((u) => (
            <option key={u.kod} value={u.kod}>
              {u.ad}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={gun.sehir || ''}
          onChange={(e) => onKonumDegistir({ ulkeKodu: gun.ulkeKodu || '', ulkeAdi: gun.ulkeAdi || '', sehir: e.target.value })}
          placeholder="Şehir (opsiyonel)"
          className="w-32 rounded-sm bg-kagitKoyu px-2 py-1 text-[11px] text-murekkep ring-1 ring-cizgi"
        />
      </div>

      <div className="space-y-1.5">
        {(gun.maddeler || []).map((m) => (
          <MaddeSatiri
            key={m.id}
            madde={m}
            onTikDegistir={() => onMaddeTikDegistir(m.id)}
            onSil={() => onMaddeSil(m.id)}
            onKisiselKaydet={(uid, veri) => onMaddeKisiselKaydet(m.id, uid, veri)}
            currentUid={currentUid}
            isimHaritasi={isimHaritasi}
          />
        ))}
        {(gun.maddeler || []).length === 0 && !maddeFormAcik && <p className="text-xs text-kraft">Henüz madde eklenmedi.</p>}
      </div>

      {maddeFormAcik ? (
        <MaddeForm
          currentUid={currentUid}
          onEkle={(madde) => {
            onMaddeEkle(madde)
            setMaddeFormAcik(false)
          }}
          onVazgec={() => setMaddeFormAcik(false)}
        />
      ) : (
        <button onClick={() => setMaddeFormAcik(true)} className="mt-2 text-xs text-deniz hover:underline">
          + Madde Ekle
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// Ana sayfa
// ---------------------------------------------------------------------
export default function GeziPlaniDetay() {
  const { id } = useParams()
  const { kullanici, profil } = useAuth()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(undefined) // undefined: yükleniyor, null: bulunamadı
  const [ucusFormAcik, setUcusFormAcik] = useState(false)
  const [konaklamaFormAcik, setKonaklamaFormAcik] = useState(false)
  const [yeniGunBasligi, setYeniGunBasligi] = useState('')

  useEffect(() => {
    geziPlaniGetir(id).then(setPlan)
  }, [id])

  const sahipMi = plan && kullanici && plan.sahipId === kullanici.uid
  const yetkiliMi = plan && kullanici && (plan.sahipId === kullanici.uid || (plan.ortakDuzenleyenler || []).includes(kullanici.uid))

  async function planiYenidenYukle() {
    geziPlaniGetir(id).then(setPlan)
  }

  async function alanGuncelle(alan, deger) {
    setPlan((p) => ({ ...p, [alan]: deger }))
    await geziPlaniGuncelle(id, { [alan]: deger })
  }

  function ucusEkle(ucus) {
    alanGuncelle('ucuslar', [...(plan.ucuslar || []), ucus])
    setUcusFormAcik(false)
  }
  function ucusSil(ucusId) {
    alanGuncelle('ucuslar', plan.ucuslar.filter((u) => u.id !== ucusId))
  }
  function ucusTikDegistir(ucusId) {
    alanGuncelle('ucuslar', plan.ucuslar.map((u) => (u.id === ucusId ? { ...u, tik: !u.tik } : u)))
  }
  function ucusKisiselKaydet(ucusId, uid, veri) {
    alanGuncelle(
      'ucuslar',
      plan.ucuslar.map((u) => (u.id === ucusId ? { ...u, kisiselBilgiler: { ...u.kisiselBilgiler, [uid]: veri } } : u))
    )
  }

  function konaklamaEkle(konaklama) {
    alanGuncelle('konaklamalar', [...(plan.konaklamalar || []), konaklama])
    setKonaklamaFormAcik(false)
  }
  function konaklamaSil(konaklamaId) {
    alanGuncelle('konaklamalar', plan.konaklamalar.filter((k) => k.id !== konaklamaId))
  }
  function konaklamaTikDegistir(konaklamaId) {
    alanGuncelle('konaklamalar', plan.konaklamalar.map((k) => (k.id === konaklamaId ? { ...k, tik: !k.tik } : k)))
  }
  function konaklamaKisiselKaydet(konaklamaId, uid, veri) {
    alanGuncelle(
      'konaklamalar',
      plan.konaklamalar.map((k) => (k.id === konaklamaId ? { ...k, kisiselBilgiler: { ...k.kisiselBilgiler, [uid]: veri } } : k))
    )
  }

  function gunEkle(e) {
    e.preventDefault()
    const gunNo = (plan.gunler?.length || 0) + 1
    // Kolaylık: yeni gün, bir önceki günün ülke/şehrini devralır — çoğu
    // zaman art arda günler aynı yerde geçer, değişiklik varsa tek tıkla
    // düzeltiliyor. Ülke/şehir DEĞİŞtiyse kullanıcı zaten güncelleyecek.
    const oncekiGun = plan.gunler?.[plan.gunler.length - 1]
    const yeniGun = {
      id: benzersizId(),
      gunNo,
      baslik: yeniGunBasligi.trim() || `${gunNo}. Gün`,
      ulkeKodu: oncekiGun?.ulkeKodu || '',
      ulkeAdi: oncekiGun?.ulkeAdi || '',
      sehir: oncekiGun?.sehir || '',
      maddeler: [],
    }
    alanGuncelle('gunler', [...(plan.gunler || []), yeniGun])
    setYeniGunBasligi('')
  }
  function gunSil(gunId) {
    alanGuncelle('gunler', plan.gunler.filter((g) => g.id !== gunId))
  }
  function gunBasligiDegistir(gunId, baslik) {
    alanGuncelle('gunler', plan.gunler.map((g) => (g.id === gunId ? { ...g, baslik } : g)))
  }
  function gunKonumDegistir(gunId, konum) {
    alanGuncelle('gunler', plan.gunler.map((g) => (g.id === gunId ? { ...g, ...konum } : g)))
  }
  function maddeEkle(gunId, madde) {
    alanGuncelle(
      'gunler',
      plan.gunler.map((g) => (g.id === gunId ? { ...g, maddeler: [...(g.maddeler || []), madde] } : g))
    )
  }
  function maddeSil(gunId, maddeId) {
    alanGuncelle(
      'gunler',
      plan.gunler.map((g) => (g.id === gunId ? { ...g, maddeler: g.maddeler.filter((m) => m.id !== maddeId) } : g))
    )
  }
  function maddeTikDegistir(gunId, maddeId) {
    alanGuncelle(
      'gunler',
      plan.gunler.map((g) =>
        g.id === gunId ? { ...g, maddeler: g.maddeler.map((m) => (m.id === maddeId ? { ...m, tik: !m.tik } : m)) } : g
      )
    )
  }
  function maddeKisiselKaydet(gunId, maddeId, uid, veri) {
    alanGuncelle(
      'gunler',
      plan.gunler.map((g) =>
        g.id === gunId
          ? {
              ...g,
              maddeler: g.maddeler.map((m) => (m.id === maddeId ? { ...m, kisiselBilgiler: { ...m.kisiselBilgiler, [uid]: veri } } : m)),
            }
          : g
      )
    )
  }

  async function planiSil() {
    if (!window.confirm('Bu gezi planını tamamen silmek istediğine emin misin?')) return
    await geziPlaniSil(id)
    navigate('/gezi-planlarim')
  }

  if (plan === undefined) return <p className="text-sm text-kraft">Yükleniyor...</p>
  if (plan === null) return <p className="text-sm text-kraft">Bu gezi planı bulunamadı.</p>
  if (!yetkiliMi) return <p className="text-sm text-kraft">Bu gezi planını görüntüleme yetkin yok.</p>

  const currentUid = kullanici.uid
  const isimHaritasi = {
    [plan.sahipId]: plan.sahipAdi,
    ...Object.fromEntries(Object.entries(plan.ortakDuzenleyenlerBilgi || {}).map(([uid, v]) => [uid, v.adSoyad])),
  }

  const tumMaddeler = [...(plan.ucuslar || []), ...(plan.konaklamalar || []), ...(plan.gunler || []).flatMap((g) => g.maddeler || [])]
  const tamamlanan = tumMaddeler.filter((m) => m.tik).length
  const butceToplam = tumMaddeler.reduce((t, m) => t + butceToplamHesapla(m.kisiselBilgiler), 0)

  return (
    <div>
      <Link to="/gezi-planlarim" className="text-xs text-kraft hover:text-deniz">
        ← Gezi Planlarım
      </Link>

      <div className="mt-1 mb-4 flex items-start justify-between gap-3">
        <input
          type="text"
          value={plan.baslik}
          onChange={(e) => alanGuncelle('baslik', e.target.value)}
          className="min-w-0 flex-1 bg-transparent font-baslik text-2xl text-murekkep focus:outline-none"
        />
        {sahipMi && (
          <button onClick={planiSil} className="shrink-0 text-xs text-kraft hover:text-muhur">
            Planı Sil
          </button>
        )}
      </div>

      {!sahipMi && <p className="mb-4 text-xs text-kraft">👥 {plan.sahipAdi} tarafından seninle paylaşıldı</p>}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={plan.durum}
          onChange={(e) => alanGuncelle('durum', e.target.value)}
          className="rounded-full bg-kagitKoyu px-3 py-1 text-xs font-govde text-murekkep ring-1 ring-cizgi"
        >
          <option value="planlaniyor">Planlanıyor</option>
          <option value="tamamlandi">✓ Tamamlandı</option>
        </select>
        <input
          type="date"
          value={plan.baslangicTarihi || ''}
          onChange={(e) => alanGuncelle('baslangicTarihi', e.target.value)}
          className="rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
        />
        <span className="text-xs text-kraft">—</span>
        <input
          type="date"
          value={plan.bitisTarihi || ''}
          onChange={(e) => alanGuncelle('bitisTarihi', e.target.value)}
          className="rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
        />
      </div>

      {sahipMi && (
        <GeziPlaniPaylasim
          planId={id}
          sahipId={plan.sahipId}
          ortakDuzenleyenler={plan.ortakDuzenleyenler || []}
          ortakDuzenleyenlerBilgi={plan.ortakDuzenleyenlerBilgi || {}}
          onDegisti={planiYenidenYukle}
        />
      )}

      {tumMaddeler.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
          <p className="text-sm text-murekkep">
            ✓ {tamamlanan}/{tumMaddeler.length} tamamlandı
          </p>
          {butceToplam > 0 && <p className="text-sm text-murekkep">💰 Toplam bütçe: {butceToplam.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}</p>}
        </div>
      )}

      {/* Uçuşlar */}
      <div className="mb-6">
        <h2 className="mb-2 font-baslik text-lg text-murekkep">✈️ Uçuşlar</h2>
        <div className="space-y-2">
          {(plan.ucuslar || []).map((u) => (
            <UcusSatiri
              key={u.id}
              ucus={u}
              onTikDegistir={() => ucusTikDegistir(u.id)}
              onSil={() => ucusSil(u.id)}
              onKisiselKaydet={(uid, veri) => ucusKisiselKaydet(u.id, uid, veri)}
              currentUid={currentUid}
              isimHaritasi={isimHaritasi}
            />
          ))}
        </div>
        {ucusFormAcik ? (
          <UcusForm currentUid={currentUid} onEkle={ucusEkle} onVazgec={() => setUcusFormAcik(false)} />
        ) : (
          <button onClick={() => setUcusFormAcik(true)} className="mt-2 text-xs text-deniz hover:underline">
            + Uçuş Ekle
          </button>
        )}
      </div>

      {/* Konaklamalar */}
      <div className="mb-6">
        <h2 className="mb-2 font-baslik text-lg text-murekkep">🏨 Konaklama</h2>
        <div className="space-y-2">
          {(plan.konaklamalar || []).map((k) => (
            <KonaklamaSatiri
              key={k.id}
              konaklama={k}
              onTikDegistir={() => konaklamaTikDegistir(k.id)}
              onSil={() => konaklamaSil(k.id)}
              onKisiselKaydet={(uid, veri) => konaklamaKisiselKaydet(k.id, uid, veri)}
              currentUid={currentUid}
              isimHaritasi={isimHaritasi}
            />
          ))}
        </div>
        {konaklamaFormAcik ? (
          <KonaklamaForm currentUid={currentUid} onEkle={konaklamaEkle} onVazgec={() => setKonaklamaFormAcik(false)} />
        ) : (
          <button onClick={() => setKonaklamaFormAcik(true)} className="mt-2 text-xs text-deniz hover:underline">
            + Konaklama Ekle
          </button>
        )}
      </div>

      {/* Gün gün program */}
      <div className="mb-6">
        <h2 className="mb-2 font-baslik text-lg text-murekkep">📅 Gün Gün Program</h2>
        {(() => {
          const rota = rotaOzetiHesapla(plan.gunler)
          if (rota.length === 0) return null
          return (
            <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-kraft">
              {rota.map((gr, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span>→</span>}
                  <span className="rounded-full bg-kagitKoyu px-2 py-1 ring-1 ring-cizgi">
                    {gr.gunBasi === gr.gunSonu ? `${gr.gunBasi}. Gün` : `${gr.gunBasi}-${gr.gunSonu}. Gün`} — {[gr.sehir, gr.ulkeAdi].filter(Boolean).join(', ')}
                  </span>
                </span>
              ))}
            </div>
          )
        })()}
        <div className="space-y-3">
          {(plan.gunler || []).map((g) => (
            <GunKarti
              key={g.id}
              gun={g}
              onGunSil={() => gunSil(g.id)}
              onBaslikDegistir={(baslik) => gunBasligiDegistir(g.id, baslik)}
              onKonumDegistir={(konum) => gunKonumDegistir(g.id, konum)}
              onMaddeEkle={(madde) => maddeEkle(g.id, madde)}
              onMaddeSil={(maddeId) => maddeSil(g.id, maddeId)}
              onMaddeTikDegistir={(maddeId) => maddeTikDegistir(g.id, maddeId)}
              onMaddeKisiselKaydet={(maddeId, uid, veri) => maddeKisiselKaydet(g.id, maddeId, uid, veri)}
              currentUid={currentUid}
              isimHaritasi={isimHaritasi}
            />
          ))}
        </div>
        <form onSubmit={gunEkle} className="mt-3 flex gap-2">
          <input
            type="text"
            value={yeniGunBasligi}
            onChange={(e) => setYeniGunBasligi(e.target.value)}
            placeholder={`${(plan.gunler?.length || 0) + 1}. Gün başlığı (opsiyonel)`}
            className="flex-1 rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
          <button type="submit" className="rounded-sm bg-muhur px-4 py-2 font-govde text-xs text-kagit">
            + Gün Ekle
          </button>
        </form>
      </div>
    </div>
  )
}

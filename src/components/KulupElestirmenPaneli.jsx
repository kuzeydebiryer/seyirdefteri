import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { filmEtkinligiGetir, filmEtkinligiKaydet, kulupPuanlariniGetir } from '../utils/kulupPuanlari.js'

// Film/dizi sayfasındaki "🎭 Kulüp Eleştirmenleri" paneli: kulüp etkinliğinin
// tarih/saatini girince etkinliği oluşturur (varsa tarihini günceller) ve
// üyelerin bu esere ZATEN verdiği puanları kendiliğinden çeker. Yaklaşan
// etkinlik anasayfa vitrininde "YARIN"/"BUGÜN" bandıyla görünür.
// Film şeridi görünümü: koyu şerit + üstte/altta delikler. Renkler sabit (tema bağımsız).
function Delikler() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: 12,
        backgroundImage: 'linear-gradient(90deg, #f5f0e1 9px, transparent 9px)',
        backgroundSize: '18px 8px',
        backgroundRepeat: 'repeat-x',
        backgroundPosition: '4px center',
      }}
    />
  )
}

export default function KulupElestirmenPaneli({ tur, tmdbId, detay }) {
  const { kullanici, profil } = useAuth()
  const [acik, setAcik] = useState(false)
  const [topluluklar, setTopluluklar] = useState([])
  const [seciliId, setSeciliId] = useState('')
  const [etkinlik, setEtkinlik] = useState(null)
  const [puanlar, setPuanlar] = useState([])
  const [tarih, setTarih] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState('')

  // Kullanıcının üyesi olduğu Sinema topluluklarını bul.
  useEffect(() => {
    if (!kullanici) return
    let iptal = false
    async function bul() {
      const snap = await getDocs(query(collection(db, 'topluluklar'), where('tur', '==', 'Sinema')))
      const uyeOlunanlar = []
      for (const d of snap.docs) {
        const u = await getDoc(doc(db, 'topluluklar', d.id, 'uyeler', kullanici.uid))
        if (u.exists()) uyeOlunanlar.push({ id: d.id, ...d.data() })
      }
      if (iptal) return
      setTopluluklar(uyeOlunanlar)
      if (uyeOlunanlar.length > 0) setSeciliId(uyeOlunanlar[0].id)
    }
    bul().catch((err) => console.error('Sinema toplulukları bulunamadı:', err))
    return () => {
      iptal = true
    }
  }, [kullanici])

  async function yukle(topluluklId) {
    setYukleniyor(true)
    try {
      const e = await filmEtkinligiGetir(topluluklId, tmdbId)
      setEtkinlik(e)
      setTarih(e?.tarih || '')
      setPuanlar(e ? await kulupPuanlariniGetir(e) : [])
    } finally {
      setYukleniyor(false)
    }
  }

  useEffect(() => {
    if (acik && seciliId) yukle(seciliId).catch((err) => console.error(err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, seciliId])

  if (!kullanici || topluluklar.length === 0) return null
  const topluluk = topluluklar.find((t) => t.id === seciliId)

  async function kaydet(e) {
    e.preventDefault()
    if (!tarih) return setMesaj('Etkinlik tarih ve saatini seç.')
    setKaydediliyor(true)
    setMesaj('')
    try {
      const eser = {
        eserTur: tur,
        eserTmdbId: Number(tmdbId),
        eserBaslik: detay.baslik,
        eserYil: detay.yil,
        eserPosterUrl: detay.posterUrl || '',
        yonetmen: (detay.yonetmenler || []).map((y) => y.name).join(', '),
      }
      const { yeniMi } = await filmEtkinligiKaydet({
        topluluk,
        eser,
        tarih,
        kullanici: { uid: kullanici.uid, displayName: profil?.adSoyad || kullanici.displayName },
      })
      setMesaj(yeniMi ? 'Etkinlik oluşturuldu. Anasayfada yaklaşan film olarak görünecek.' : 'Etkinlik tarihi güncellendi.')
      await yukle(seciliId)
    } catch (err) {
      setMesaj(`Kaydedilemedi: ${err.message}`)
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        aria-expanded={acik}
        className="block w-full max-w-xl overflow-hidden rounded-sm text-left shadow ring-1 ring-black/30"
        style={{ background: '#14141f' }}
      >
        <Delikler />
        <span className="flex items-center justify-between gap-3 px-4 py-2">
          <span className="font-baslik text-base tracking-wide" style={{ color: '#ffd84d' }}>
            🎞️ Kulüp Eleştirmenleri
          </span>
          <span className="text-sm font-bold text-white">{acik ? '▴ Kapat' : '▾ Aç'}</span>
        </span>
        <Delikler />
      </button>

      {acik && (
        <div className="mt-2 overflow-hidden rounded-sm shadow ring-1 ring-black/30" style={{ background: '#14141f' }}>
        <Delikler />
        <div className="m-2 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          {topluluklar.length > 1 && (
            <select
              value={seciliId}
              onChange={(e) => setSeciliId(e.target.value)}
              className="w-full rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
            >
              {topluluklar.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ad}
                </option>
              ))}
            </select>
          )}
          {topluluklar.length === 1 && <p className="text-xs text-kraft">🏛 {topluluk?.ad}</p>}

          <form onSubmit={kaydet} className="space-y-2">
            <label className="block text-xs text-kraft">Etkinlik tarihi ve saati</label>
            <input
              type="datetime-local"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
              className="w-full rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
            />
            <button
              type="submit"
              disabled={kaydediliyor}
              className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
            >
              {kaydediliyor ? 'Kaydediliyor...' : etkinlik ? 'Tarihi Güncelle' : 'Etkinliği Oluştur'}
            </button>
            {mesaj && <p className="text-[11px] text-deniz">{mesaj}</p>}
          </form>

          {etkinlik && (
            <div className="border-t border-cizgi pt-3">
              <p className="mb-1 text-xs uppercase tracking-widest text-kraft">Üyelerin puanları</p>
              {yukleniyor ? (
                <p className="text-xs text-kraft">Yükleniyor...</p>
              ) : puanlar.length === 0 ? (
                <p className="text-xs text-kraft">Henüz kimse bu filme puan vermedi. Puanlar film sayfasındaki yıldızlardan otomatik gelir.</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto rounded-sm p-2" style={{ background: '#14141f' }}>
                  {puanlar.map((p) => (
                    <div key={p.kullaniciId} className="w-36 shrink-0 rounded-sm p-2" style={{ background: '#1f1f2e', border: '2px solid #f5f0e1' }}>
                      <p className="truncate text-xs font-bold text-white">{p.kullaniciAdi}</p>
                      <p className="font-baslik text-3xl leading-none" style={{ color: '#ffd84d' }}>
                        {p.puan != null ? p.puan * 2 : '-'}
                        <span className="text-xs text-white">/10</span>
                      </p>
                      {p.cumle && <p className="mt-1 text-[11px] italic leading-snug text-gray-100">“{p.cumle}”</p>}
                    </div>
                  ))}
                </div>
              )}
              {tur === 'sinema' && (
                <Link to={`/inceleme/${etkinlik.id}`} className="mt-3 inline-block rounded-full bg-gise px-3 py-1 font-govde text-[11px] text-kagit">
                  📓 İnceleme Defterini Aç
                </Link>
              )}
            </div>
          )}
        </div>
        <Delikler />
        </div>
      )}
    </div>
  )
}

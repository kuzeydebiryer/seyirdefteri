import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import KitapSecici from '../components/KitapSecici.jsx'
import AlintiKarti from '../components/AlintiKarti.jsx'
import { alintiBegenDegistir, alintiEkle, alintiSil, sonAlintilariGetir } from '../utils/alinti.js'

export default function AlintiDuvari() {
  const { kullanici, profil } = useAuth()
  const [alintilar, setAlintilar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  const [seciliKitap, setSeciliKitap] = useState(null)
  const [metin, setMetin] = useState('')
  const [sayfa, setSayfa] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  async function yeniden() {
    const liste = await sonAlintilariGetir(40)
    setAlintilar(liste)
    setYukleniyor(false)
  }

  useEffect(() => {
    yeniden()
  }, [])

  async function paylas(e) {
    e.preventDefault()
    if (!kullanici || !seciliKitap || !metin.trim()) return
    setKaydediliyor(true)
    try {
      await alintiEkle(kullanici, profil, {
        kitapId: seciliKitap.id,
        kitapBaslik: seciliKitap.baslik,
        kitapYazar: seciliKitap.yazar,
        kitapPosterUrl: seciliKitap.posterUrl,
        metin,
        sayfa,
      })
      setSeciliKitap(null)
      setMetin('')
      setSayfa('')
      await yeniden()
    } finally {
      setKaydediliyor(false)
    }
  }

  async function begenTiklandi(alinti) {
    if (!kullanici) return
    const begeniyorMu = (alinti.begenenler || []).includes(kullanici.uid)
    setAlintilar((liste) =>
      liste.map((a) =>
        a.id === alinti.id
          ? { ...a, begenenler: begeniyorMu ? a.begenenler.filter((u) => u !== kullanici.uid) : [...(a.begenenler || []), kullanici.uid] }
          : a
      )
    )
    await alintiBegenDegistir(alinti.id, kullanici.uid, begeniyorMu)
  }

  async function silTiklandi(alintiId) {
    if (!window.confirm('Bu alıntıyı silmek istediğine emin misin?')) return
    await alintiSil(alintiId)
    setAlintilar((liste) => liste.filter((a) => a.id !== alintiId))
  }

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep mb-1">💬 Alıntı Duvarı</h1>
      <p className="mb-4 text-sm text-kraft">Topluluğun kitaplardan paylaştığı en son alıntılar.</p>

      {kullanici && (
        <form onSubmit={paylas} className="mb-6 space-y-2 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
          <p className="text-xs uppercase tracking-widest text-gise">Alıntı Ekle</p>
          <KitapSecici secili={seciliKitap} onSecim={setSeciliKitap} onTemizle={() => setSeciliKitap(null)} />
          <textarea
            value={metin}
            onChange={(e) => setMetin(e.target.value.slice(0, 400))}
            placeholder="Beğendiğin bir alıntıyı buraya yaz..."
            rows={3}
            maxLength={400}
            className="w-full rounded-sm bg-kagit px-2 py-1 text-sm text-murekkep ring-1 ring-cizgi"
          />
          <p className="text-right text-[11px] text-kraft">{metin.length}/400</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={sayfa}
              onChange={(e) => setSayfa(e.target.value)}
              placeholder="Sayfa (opsiyonel)"
              className="w-32 rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
            />
            <button
              type="submit"
              disabled={kaydediliyor || !seciliKitap || !metin.trim()}
              className="ml-auto rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
            >
              {kaydediliyor ? 'Paylaşılıyor...' : 'Paylaş'}
            </button>
          </div>
        </form>
      )}

      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {!yukleniyor && alintilar.length === 0 && <p className="text-sm text-kraft">Henüz kimse alıntı paylaşmadı.</p>}

      <ul className="space-y-3">
        {alintilar.map((a) => (
          <AlintiKarti key={a.id} alinti={a} kullanici={kullanici} onBegenTiklandi={begenTiklandi} onSilTiklandi={silTiklandi} />
        ))}
      </ul>
    </div>
  )
}

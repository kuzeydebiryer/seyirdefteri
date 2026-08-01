import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from '../components/Avatar.jsx'
import KitapSecici from '../components/KitapSecici.jsx'
import { alintiBegenDegistir, alintiEkle, sonAlintilariGetir } from '../utils/alinti.js'

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
            onChange={(e) => setMetin(e.target.value)}
            placeholder="Beğendiğin bir alıntıyı buraya yaz..."
            rows={3}
            className="w-full rounded-sm bg-kagit px-2 py-1 text-sm text-murekkep ring-1 ring-cizgi"
          />
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
        {alintilar.map((a) => {
          const begeniyorMu = kullanici && (a.begenenler || []).includes(kullanici.uid)
          return (
            <li key={a.id} className="rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
              <p className="font-baslik text-sm italic text-murekkep">"{a.metin}"</p>
              <Link to={`/kitap/${a.kitapId}`} className="mt-1 block text-xs text-kraft hover:text-deniz hover:underline">
                {a.kitapBaslik}{a.kitapYazar && ` · ${a.kitapYazar}`}{a.sayfa && ` · s. ${a.sayfa}`}
              </Link>
              <div className="mt-2 flex items-center gap-2 text-xs text-kraft">
                <Link to={`/profil/${a.kullaniciId}`} className="flex items-center gap-2">
                  <Avatar adSoyad={a.kullaniciAdi} avatarUrl={a.kullaniciAvatarUrl} boyut="h-5 w-5" />
                  <span className="font-medium text-murekkep">{a.kullaniciAdi}</span>
                </Link>
                <button
                  onClick={() => begenTiklandi(a)}
                  disabled={!kullanici}
                  className={`ml-auto ${begeniyorMu ? 'text-muhur' : 'text-kraft hover:text-muhur'}`}
                >
                  {begeniyorMu ? '♥' : '♡'} {(a.begenenler || []).length || ''}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

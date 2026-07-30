import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useTopluluklar } from '../hooks/useTopluluklar.js'

const TURLER = ['Sinema', 'Kitap', 'Genel']

export default function Topluluklar() {
  const { kullanici, profil } = useAuth()
  const { topluluklar, yukleniyor, yenidenYukle } = useTopluluklar()

  const [formuAcik, setFormuAcik] = useState(false)
  const [ad, setAd] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [tur, setTur] = useState('Sinema')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  async function olustur(e) {
    e.preventDefault()
    if (!ad.trim() || !kullanici) return
    setKaydediliyor(true)
    try {
      const ref = await addDoc(collection(db, 'topluluklar'), {
        ad: ad.trim(),
        aciklama,
        tur,
        kurucuId: kullanici.uid,
        kurucuAdi: profil?.adSoyad || kullanici.displayName || 'İsimsiz',
        kurulmaTarihi: serverTimestamp(),
        uyeSayisi: 1,
      })
      // Kurucu otomatik olarak ilk üye
      await setDoc(doc(db, 'topluluklar', ref.id, 'uyeler', kullanici.uid), { katilmaTarihi: serverTimestamp() })
      setAd('')
      setAciklama('')
      setFormuAcik(false)
      yenidenYukle()
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-baslik text-2xl text-murekkep">Topluluklar</h1>
        <button
          onClick={() => setFormuAcik((a) => !a)}
          className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-sm text-kagit"
        >
          {formuAcik ? 'Vazgeç' : '+ Topluluk Kur'}
        </button>
      </div>

      {formuAcik && (
        <form onSubmit={olustur} className="mb-8 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Topluluk Adı</label>
              <input
                type="text"
                value={ad}
                onChange={(e) => setAd(e.target.value)}
                required
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Tür</label>
              <select
                value={tur}
                onChange={(e) => setTur(e.target.value)}
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              >
                {TURLER.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Açıklama</label>
            <textarea
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              rows={2}
              className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
          </div>
          <button
            type="submit"
            disabled={kaydediliyor}
            className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {kaydediliyor ? 'Kuruluyor...' : 'Kur'}
          </button>
        </form>
      )}

      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {!yukleniyor && topluluklar.length === 0 && <p className="text-sm text-kraft">Henüz bir topluluk yok.</p>}

      <ul className="space-y-3">
        {topluluklar.map((t) => (
          <li key={t.id}>
            <Link
              to={`/topluluk/${t.id}`}
              className="block rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi hover:ring-muhur"
            >
              <div className="flex items-center justify-between">
                <p className="font-baslik text-lg text-murekkep">{t.ad}</p>
                <span className="rounded-full bg-kagit px-2 py-0.5 text-[10px] uppercase tracking-wide text-kraft ring-1 ring-cizgi">
                  {t.tur}
                </span>
              </div>
              {t.aciklama && <p className="mt-1 text-sm text-murekkep/90">{t.aciklama}</p>}
              <p className="mt-2 text-xs text-kraft">{t.uyeSayisi || 0} üye</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

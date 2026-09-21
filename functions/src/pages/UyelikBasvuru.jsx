import { useState } from 'react'
import { Link } from 'react-router-dom'
import { basvuruGonder } from '../utils/uyelikBasvuru.js'

export default function UyelikBasvuru() {
  const [ad, setAd] = useState('')
  const [eposta, setEposta] = useState('')
  const [mesaj, setMesaj] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [gonderildi, setGonderildi] = useState(false)
  const [hata, setHata] = useState('')

  async function gonder(e) {
    e.preventDefault()
    setHata('')
    setGonderiliyor(true)
    try {
      await basvuruGonder({ ad, eposta, mesaj })
      setGonderildi(true)
    } catch (err) {
      setHata('Bir şeyler ters gitti, biraz sonra tekrar dener misin?')
    } finally {
      setGonderiliyor(false)
    }
  }

  if (gonderildi) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <h1 className="font-baslik text-2xl text-murekkep mb-2">Başvurun alındı</h1>
        <p className="text-sm text-kraft">
          Bir üye başvurunu inceleyip onaylarsa, davet kodunu belirttiğin e-postaya iletecek. Bir yanıt için biraz sabırlı ol.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="font-baslik text-2xl text-murekkep mb-1">Üyelik Başvurusu</h1>
      <p className="text-sm text-kraft mb-6">
        Seyirdefteri davet koduyla katılınan, küçük ve kapalı bir topluluk. Davet koduna sahip değilsen, aşağıdan başvurabilirsin —
        bir üye başvurunu görüp uygun bulursa sana bir davet kodu iletir.
      </p>

      <form onSubmit={gonder} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Adın</label>
          <input
            type="text"
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            required
            className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-kraft mb-1">E-posta</label>
          <input
            type="email"
            value={eposta}
            onChange={(e) => setEposta(e.target.value)}
            required
            className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Neden katılmak istiyorsun? (opsiyonel)</label>
          <textarea
            value={mesaj}
            onChange={(e) => setMesaj(e.target.value)}
            rows={3}
            className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
        </div>

        {hata && <p className="text-xs text-muhur">{hata}</p>}

        <button
          type="submit"
          disabled={gonderiliyor}
          className="w-full rounded-sm bg-muhur px-4 py-2 font-govde text-sm font-medium text-kagit disabled:opacity-40"
        >
          {gonderiliyor ? 'Gönderiliyor...' : 'Başvur'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-kraft">
        Davet kodun var mı? <Link to="/kayit" className="text-muhur">Onunla katıl</Link>
      </p>
    </div>
  )
}

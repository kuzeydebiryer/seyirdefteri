import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function KayitOl() {
  const { kayitOl } = useAuth()
  const navigate = useNavigate()

  const [davetKodu, setDavetKodu] = useState('')
  const [adSoyad, setAdSoyad] = useState('')
  const [kullaniciAdi, setKullaniciAdi] = useState('')
  const [eposta, setEposta] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)

  async function gonder(e) {
    e.preventDefault()
    setHata('')
    setGonderiliyor(true)
    try {
      await kayitOl({ eposta, sifre, adSoyad, kullaniciAdi, davetKodu })
      navigate('/')
    } catch (err) {
      setHata(err.message)
    } finally {
      setGonderiliyor(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="font-baslik text-2xl text-murekkep mb-1">Seyirdefteri'ne Katıl</h1>
      <p className="text-sm text-kraft mb-6">
        Film, dizi, kitap ve sanatla ilgili günlüğünü tuttuğun, küçük ve kapalı bir topluluk. Sadece davet koduyla üye olunabilir —
        kodun yoksa <Link to="/uyelik-basvuru" className="text-muhur">başvurabilirsin</Link>.
      </p>

      <form onSubmit={gonder} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Davet Kodu</label>
          <input
            type="text"
            value={davetKodu}
            onChange={(e) => setDavetKodu(e.target.value.toUpperCase())}
            required
            className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi tracking-widest"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Ad Soyad</label>
          <input
            type="text"
            value={adSoyad}
            onChange={(e) => setAdSoyad(e.target.value)}
            required
            className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Kullanıcı Adı</label>
          <input
            type="text"
            value={kullaniciAdi}
            onChange={(e) => setKullaniciAdi(e.target.value.trim().toLowerCase())}
            required
            placeholder="benzersiz-kullanici-adi"
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
          <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Şifre</label>
          <input
            type="password"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
        </div>

        {hata && <p className="text-xs text-muhur">{hata}</p>}

        <button
          type="submit"
          disabled={gonderiliyor}
          className="w-full rounded-sm bg-muhur px-4 py-2 font-govde text-sm font-medium text-kagit disabled:opacity-40"
        >
          {gonderiliyor ? 'Kaydediliyor...' : 'Katıl'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-kraft">
        Zaten üye misin? <Link to="/giris" className="text-muhur">Giriş yap</Link>
      </p>
    </div>
  )
}

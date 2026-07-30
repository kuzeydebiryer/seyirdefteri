import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function GirisYap() {
  const { girisYap } = useAuth()
  const navigate = useNavigate()
  const [eposta, setEposta] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)

  async function gonder(e) {
    e.preventDefault()
    setHata('')
    setGonderiliyor(true)
    try {
      await girisYap(eposta, sifre)
      navigate('/')
    } catch (err) {
      setHata('E-posta veya şifre hatalı.')
    } finally {
      setGonderiliyor(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="font-baslik text-2xl text-murekkep mb-6">Giriş Yap</h1>
      <form onSubmit={gonder} className="space-y-4">
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
            className="w-full rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
        </div>
        {hata && <p className="text-xs text-muhur">{hata}</p>}
        <button
          type="submit"
          disabled={gonderiliyor}
          className="w-full rounded-sm bg-muhur px-4 py-2 font-govde text-sm font-medium text-kagit disabled:opacity-40"
        >
          {gonderiliyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-kraft">
        Hesabın yok mu? <Link to="/kayit" className="text-muhur">Davet koduyla katıl</Link>
      </p>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { geziPlanlariniGetir, geziPlaniOlustur, geziPlaniSil } from '../utils/geziPlanlari.js'

function tarihAraligi(p) {
  if (!p.baslangicTarihi) return null
  const bas = new Date(p.baslangicTarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  if (!p.bitisTarihi) return bas
  const bit = new Date(p.bitisTarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${bas} — ${bit}`
}

function ilerlemeHesapla(p) {
  const maddeler = [...(p.ucuslar || []), ...(p.konaklamalar || []), ...(p.gunler || []).flatMap((g) => g.maddeler || [])]
  if (maddeler.length === 0) return null
  const tamamlanan = maddeler.filter((m) => m.tik).length
  return { tamamlanan, toplam: maddeler.length }
}

export default function GeziPlanlarim() {
  const { kullanici, profil } = useAuth()
  const [planlar, setPlanlar] = useState(null)
  const [olusturuluyor, setOlusturuluyor] = useState(false)
  const [yeniBaslik, setYeniBaslik] = useState('')

  useEffect(() => {
    if (!kullanici) return
    geziPlanlariniGetir(kullanici.uid).then(setPlanlar)
  }, [kullanici])

  async function planOlustur(e) {
    e.preventDefault()
    if (!yeniBaslik.trim()) return
    setOlusturuluyor(true)
    try {
      await geziPlaniOlustur(kullanici, profil, { baslik: yeniBaslik.trim() })
      setYeniBaslik('')
      geziPlanlariniGetir(kullanici.uid).then(setPlanlar)
    } finally {
      setOlusturuluyor(false)
    }
  }

  async function planSil(id) {
    if (!window.confirm('Bu gezi planını tamamen silmek istediğine emin misin?')) return
    await geziPlaniSil(id)
    setPlanlar((liste) => liste.filter((p) => p.id !== id))
  }

  if (!kullanici) return null

  return (
    <div>
      <Link to="/gezi" className="text-xs text-kraft hover:text-deniz">
        ← Gezi
      </Link>
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">🗺️ Gezi Planlarım</h1>
      <p className="mb-6 text-sm text-kraft">
        Uçuş, konaklama ve gün gün programıyla A'dan Z'ye planlanmış gezileriniz — size özel, dilerseniz paylaşılabilir.
      </p>

      <form onSubmit={planOlustur} className="mb-6 flex gap-2">
        <input
          type="text"
          value={yeniBaslik}
          onChange={(e) => setYeniBaslik(e.target.value)}
          placeholder="Yeni plan başlığı — örn. Roma Balayı"
          className="flex-1 rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
        />
        <button
          type="submit"
          disabled={olusturuluyor}
          className="rounded-sm bg-muhur px-4 py-2 font-govde text-xs text-kagit disabled:opacity-40"
        >
          {olusturuluyor ? 'Oluşturuluyor...' : '+ Yeni Plan'}
        </button>
      </form>

      {planlar === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {planlar?.length === 0 && <p className="text-sm text-kraft">Henüz bir gezi planın yok — yukarıdan ilkini oluştur.</p>}

      <div className="space-y-3">
        {planlar?.map((p) => {
          const ilerleme = ilerlemeHesapla(p)
          return (
            <div key={p.id} className="rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
              <div className="flex items-start justify-between gap-3">
                <Link to={`/gezi-plani/${p.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-baslik text-lg text-murekkep">{p.baslik}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-govde ${
                        p.durum === 'tamamlandi' ? 'bg-deniz/20 text-deniz' : 'bg-gise/20 text-gise'
                      }`}
                    >
                      {p.durum === 'tamamlandi' ? '✓ Tamamlandı' : 'Planlanıyor'}
                    </span>
                  </div>
                  {tarihAraligi(p) && <p className="mt-0.5 text-xs text-kraft">{tarihAraligi(p)}</p>}
                  {ilerleme && (
                    <p className="mt-1 text-xs text-kraft">
                      {ilerleme.tamamlanan}/{ilerleme.toplam} madde tamamlandı
                    </p>
                  )}
                </Link>
                <button onClick={() => planSil(p.id)} className="shrink-0 text-[11px] text-kraft hover:text-muhur">
                  Sil
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

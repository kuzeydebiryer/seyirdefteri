import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { kitapElleEkle } from '../utils/kitapKatalog.js'

// NOT: Bu bileşen başta Kitapyurdu linkinden otomatik bilgi çekmeyi de
// deniyordu, ama Kitapyurdu'nun sunucu tarafı isteklerini (Cloud Function'ın
// IP'sinden geleni) engelleyen bir bot koruması olduğu doğrulandı — başlıkları
// gerçek tarayıcı gibi değiştirmek bile çözmedi (IP tabanlı bir engelleme,
// aşılması güvenilir bir yolu yok). Bu yüzden sade, her zaman çalışan manuel
// girişe döndürüldü — kullanıcı Kitapyurdu (ya da başka bir) sayfayı kendi
// tarayıcısında açıp bilgileri elle kopyalayabiliyor.
//
// "varsayilanYazar" — yazar sayfasından açıldığında yazar adını önceden
// dolduruyor (KitaplarKesfet/KitapArama'dan açıldığında boş kalır).
export default function KitapyurdundanKitapEkle({ varsayilanYazar = '' }) {
  const { kullanici } = useAuth()
  const navigate = useNavigate()
  const [acik, setAcik] = useState(false)
  const [taslak, setTaslak] = useState(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  function ac() {
    setTaslak({ baslik: '', yazar: varsayilanYazar, yayinevi: '', yil: '', sayfaSayisi: '', ozet: '', posterUrl: '' })
    setAcik(true)
  }

  function kapat() {
    setAcik(false)
    setTaslak(null)
  }

  async function kaydet(e) {
    e.preventDefault()
    if (!taslak?.baslik?.trim() || !kullanici) return
    setKaydediliyor(true)
    try {
      const kitap = await kitapElleEkle(taslak, kullanici)
      navigate(`/kitap/${kitap.id}`)
    } finally {
      setKaydediliyor(false)
    }
  }

  if (!kullanici) return null

  return (
    <div className="mb-4">
      <button onClick={acik ? kapat : ac} className="text-xs text-kraft hover:text-deniz hover:underline">
        {acik ? '▲ Vazgeç' : '+ Kitap Ekle (Manuel)'}
      </button>

      {acik && taslak && (
        <form onSubmit={kaydet} className="mt-2 space-y-2 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <p className="text-xs text-kraft">
            Kitap sistemde yoksa (genelde çok yeni ya da az bilinen baskılar), bilgileri Kitapyurdu/D&R/İdefix gibi bir
            siteden bakıp elle girebilirsin. Kapak için sağ tık → "Görsel adresini kopyala" işe yarar.
          </p>
          <div className="flex items-start gap-3">
            <div className="h-24 w-16 shrink-0 overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
              {taslak.posterUrl && <img src={taslak.posterUrl} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="flex-1 space-y-2">
              <input
                value={taslak.baslik}
                onChange={(e) => setTaslak((t) => ({ ...t, baslik: e.target.value }))}
                placeholder="Başlık *"
                required
                className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
              />
              <input
                value={taslak.yazar}
                onChange={(e) => setTaslak((t) => ({ ...t, yazar: e.target.value }))}
                placeholder="Yazar"
                className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              value={taslak.yayinevi}
              onChange={(e) => setTaslak((t) => ({ ...t, yayinevi: e.target.value }))}
              placeholder="Yayınevi"
              className="rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
            />
            <input
              value={taslak.yil}
              onChange={(e) => setTaslak((t) => ({ ...t, yil: e.target.value }))}
              placeholder="Yıl"
              className="rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
            />
            <input
              value={taslak.sayfaSayisi}
              onChange={(e) => setTaslak((t) => ({ ...t, sayfaSayisi: e.target.value }))}
              placeholder="Sayfa Sayısı"
              className="rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
            />
          </div>
          <input
            value={taslak.posterUrl}
            onChange={(e) => setTaslak((t) => ({ ...t, posterUrl: e.target.value }))}
            placeholder="Kapak Görsel URL'i"
            className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
          />
          <textarea
            value={taslak.ozet}
            onChange={(e) => setTaslak((t) => ({ ...t, ozet: e.target.value }))}
            placeholder="Özet"
            rows={2}
            className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!taslak.baslik.trim() || kaydediliyor}
              className="rounded-sm bg-muhur px-3 py-1.5 text-xs text-kagit disabled:opacity-40"
            >
              {kaydediliyor ? 'Kaydediliyor...' : 'Kitabı Kaydet'}
            </button>
            <button type="button" onClick={kapat} className="text-[11px] text-kraft hover:text-muhur">
              Vazgeç
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { kitapyurdundanBilgiCek } from '../utils/kapakCek.js'
import { kitapElleEkle } from '../utils/kitapKatalog.js'

// Google Books ve 67 bin kitaplık Türkçe Kitap Veri Tabanı'nda bulunmayan
// (genelde çok yeni — ör. bu yılki Nobel kazananı — ya da az bilinen) bir
// kitabı, Kitapyurdu ürün linkinden bilgi çekerek elle eklemek için.
// "varsayilanYazar" — yazar sayfasından açıldığında yazar adını önceden
// dolduruyor (KitaplarKesfet/KitapArama'dan açıldığında boş kalır).
export default function KitapyurdundanKitapEkle({ varsayilanYazar = '' }) {
  const { kullanici } = useAuth()
  const navigate = useNavigate()
  const [acik, setAcik] = useState(false)
  const [link, setLink] = useState('')
  const [cekiliyor, setCekiliyor] = useState(false)
  const [cekHatasi, setCekHatasi] = useState('')
  const [taslak, setTaslak] = useState(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  async function bilgileriCek() {
    if (!link.trim()) return
    setCekiliyor(true)
    setCekHatasi('')
    try {
      const bilgi = await kitapyurdundanBilgiCek(link.trim())
      setTaslak({
        baslik: bilgi.baslik || '',
        yazar: bilgi.yazar || varsayilanYazar,
        yayinevi: bilgi.yayinevi || '',
        yil: '',
        sayfaSayisi: bilgi.sayfaSayisi || '',
        ozet: bilgi.ozet || '',
        posterUrl: bilgi.kapakUrl || '',
      })
      const eksikAlanlar = ['baslik', 'yazar', 'yayinevi', 'sayfaSayisi', 'ozet', 'kapakUrl'].filter((a) => !bilgi[a])
      if (eksikAlanlar.length > 0) {
        setCekHatasi(`Şu alanlar sayfada bulunamadı, elle doldurman gerekebilir: ${eksikAlanlar.join(', ')}`)
      }
    } catch (e) {
      setCekHatasi(e.message)
      setTaslak({ baslik: '', yazar: varsayilanYazar, yayinevi: '', yil: '', sayfaSayisi: '', ozet: '', posterUrl: '' })
    } finally {
      setCekiliyor(false)
    }
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
      <button onClick={() => setAcik((a) => !a)} className="text-xs text-kraft hover:text-deniz hover:underline">
        {acik ? '▲ Vazgeç' : '+ Kitapyurdu Linkinden Kitap Ekle'}
      </button>

      {acik && (
        <div className="mt-2 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          {!taslak ? (
            <>
              <p className="text-xs text-kraft">
                Aradığın kitap sistemde yoksa (genelde çok yeni ya da az bilinen baskılar), Kitapyurdu ürün linkini
                yapıştır — başlık/yazar/yayınevi/sayfa sayısı/özet/kapak otomatik çekilir.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://www.kitapyurdu.com/kitap/..."
                  className="flex-1 rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
                />
                <button
                  onClick={bilgileriCek}
                  disabled={!link.trim() || cekiliyor}
                  className="shrink-0 rounded-sm bg-deniz px-3 py-1.5 text-xs text-kagit disabled:opacity-40"
                >
                  {cekiliyor ? 'Çekiliyor...' : 'Bilgileri Çek'}
                </button>
              </div>
              <button
                onClick={() => setTaslak({ baslik: '', yazar: varsayilanYazar, yayinevi: '', yil: '', sayfaSayisi: '', ozet: '', posterUrl: '' })}
                className="text-[11px] text-kraft hover:text-deniz hover:underline"
              >
                ya da doğrudan elle gir →
              </button>
            </>
          ) : (
            <form onSubmit={kaydet} className="space-y-2">
              {cekHatasi && <p className="text-[11px] text-muhur">{cekHatasi}</p>}
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
                <button type="button" onClick={() => setTaslak(null)} className="text-[11px] text-kraft hover:text-muhur">
                  Vazgeç
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

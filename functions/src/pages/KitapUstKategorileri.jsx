import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ustKategorideKitaplariGetir, tumUstKategorileriGetir, turkceKitaptanKaydet } from '../utils/turkceKitapVeriTabani.js'
import { KITAP_UST_KATEGORILERI } from '../utils/kitapUstKategorileri.js'

// Türkçe Kitap Veri Tabanı (67 bin+ kitap) için, Storytel'de Olanlar
// sayfasındaki (bkz. StorytelKitaplari.jsx) renkli kategori kartı dilini
// aynen yansıtan bir kategori keşif sayfası. Storytel'den farkı: kartlar
// canlı işaretlenmiş kitap değil, statik veri setinden sayım gösteriyor
// (bkz. tumUstKategorileriGetir), çünkü 67 bin kayıtta kapak görseli yok.
export default function KitapUstKategorileri() {
  const { ustKategoriId } = useParams()
  const navigate = useNavigate()
  const [sayaclar, setSayaclar] = useState(null)

  const [kitaplar, setKitaplar] = useState([])
  const [limit, setLimit] = useState(60)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [inceleniyorId, setInceleniyorId] = useState(null)

  useEffect(() => {
    tumUstKategorileriGetir().then(setSayaclar)
  }, [])

  const seciliKategori = ustKategoriId ? KITAP_UST_KATEGORILERI.find((k) => k.id === ustKategoriId) : null

  useEffect(() => {
    if (!seciliKategori) return
    setYukleniyor(true)
    ustKategorideKitaplariGetir(seciliKategori.id, limit).then((liste) => {
      setKitaplar(liste)
      setYukleniyor(false)
    })
  }, [seciliKategori, limit])

  async function incele(kitap) {
    setInceleniyorId(kitap.id)
    try {
      const kaydedilen = await turkceKitaptanKaydet(kitap)
      navigate(`/kitap/${kaydedilen.id}`)
    } finally {
      setInceleniyorId(null)
    }
  }

  if (seciliKategori) {
    return (
      <div>
        <Link to="/kitap-kategorileri" className="text-xs text-kraft hover:text-deniz">
          ← Kitap Kategorileri
        </Link>
        <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">{seciliKategori.ad}</h1>
        <p className="mb-6 text-sm text-kraft">Türkçe Kitap Veri Tabanı</p>

        {yukleniyor && kitaplar.length === 0 && <p className="text-sm text-kraft">Yükleniyor...</p>}
        {!yukleniyor && kitaplar.length === 0 && <p className="text-sm text-kraft">Bu kategoride kitap bulunamadı.</p>}

        <div className="space-y-2">
          {kitaplar.map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
              <div className="min-w-0">
                <button
                  onClick={() => incele(k)}
                  disabled={inceleniyorId === k.id}
                  className="truncate text-left text-sm font-medium text-murekkep hover:text-deniz hover:underline disabled:opacity-40"
                >
                  {inceleniyorId === k.id ? 'Açılıyor...' : k.baslik}
                </button>
                <p className="truncate text-xs text-kraft">
                  {[k.yazar, k.yayinevi, k.yil, k.sayfaSayisi && `${k.sayfaSayisi} s.`].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {!yukleniyor && kitaplar.length === limit && (
          <button
            onClick={() => setLimit((l) => l + 60)}
            className="mt-4 rounded-sm bg-kagitKoyu px-4 py-2 font-govde text-sm text-kraft ring-1 ring-cizgi hover:text-murekkep"
          >
            Daha Fazla Göster
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <Link to="/kitaplar" className="text-xs text-kraft hover:text-deniz">
        ← Kitap
      </Link>
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">Kitap Kategorileri</h1>
      <p className="mb-6 text-sm text-kraft">Türkçe Kitap Veri Tabanı'ndaki 67.000'den fazla kitap, türüne göre gruplandı.</p>

      {sayaclar === null && <p className="text-sm text-kraft">Yükleniyor...</p>}

      {sayaclar !== null && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {KITAP_UST_KATEGORILERI.map((kat) => (
            <Link
              key={kat.id}
              to={`/kitap-kategorileri/${kat.id}`}
              className="overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi transition hover:ring-murekkep/30"
            >
              <div style={{ backgroundColor: kat.renk }} className="flex h-16 items-center justify-center px-3">
                <p className="text-center font-baslik text-base font-bold text-black">{kat.ad}</p>
              </div>
              <div className="p-2 text-center">
                <p className="text-[11px] text-kraft">{(sayaclar.get(kat.id) || 0).toLocaleString('tr-TR')} kitap</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

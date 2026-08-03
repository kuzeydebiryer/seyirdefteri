import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { kategorideKitaplariGetir, turkceKitaptanKaydet } from '../utils/turkceKitapVeriTabani.js'

export default function KitapKategoriSayfasi() {
  const { kategori } = useParams()
  const navigate = useNavigate()
  const [aramaParametreleri] = useSearchParams()
  const kategoriAdi = decodeURIComponent(kategori)
  const gosterilenAd = aramaParametreleri.get('ad') || kategoriAdi

  const [kitaplar, setKitaplar] = useState([])
  const [limit, setLimit] = useState(60)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [inceleniyorId, setInceleniyorId] = useState(null)

  async function incele(kitap) {
    setInceleniyorId(kitap.id)
    try {
      const kaydedilen = await turkceKitaptanKaydet(kitap)
      navigate(`/kitap/${kaydedilen.id}`)
    } finally {
      setInceleniyorId(null)
    }
  }

  useEffect(() => {
    setYukleniyor(true)
    kategorideKitaplariGetir(kategoriAdi, limit).then((liste) => {
      setKitaplar(liste)
      setYukleniyor(false)
    })
  }, [kategoriAdi, limit])

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep mb-1">{gosterilenAd}</h1>
      <p className="mb-6 text-sm text-kraft">Türkçe Kitap Veri Tabanı (Kitapyurdu)</p>

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

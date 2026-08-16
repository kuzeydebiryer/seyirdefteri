import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { favoriEkle, favoriKaldir } from '../utils/favori.js'
import { favoriMi } from '../hooks/useFavoriler.js'
import { yazarinKitaplariniGetir, turkceKitaptanKaydet } from '../utils/turkceKitapVeriTabani.js'
import YazarBiyografisi from '../components/YazarBiyografisi.jsx'

export default function YazarSayfasi() {
  const { ad } = useParams()
  const navigate = useNavigate()
  const yazarAdi = decodeURIComponent(ad)
  const { kullanici } = useAuth()

  const [kitaplar, setKitaplar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [favoriMi_, setFavoriMi_] = useState(false)
  const [favoriIsleniyor, setFavoriIsleniyor] = useState(false)
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
    let iptal = false
    setYukleniyor(true)
    yazarinKitaplariniGetir(yazarAdi).then((liste) => {
      if (!iptal) {
        setKitaplar(liste)
        setYukleniyor(false)
      }
    })

    if (kullanici) {
      favoriMi(kullanici.uid, 'yazar', ad).then((v) => {
        if (!iptal) setFavoriMi_(v)
      })
    }
    return () => {
      iptal = true
    }
  }, [ad, yazarAdi, kullanici])

  async function favoriDegistir() {
    if (!kullanici) return
    setFavoriIsleniyor(true)
    try {
      if (favoriMi_) {
        await favoriKaldir(kullanici.uid, 'yazar', ad)
      } else {
        await favoriEkle(kullanici, { tur: 'yazar', disId: ad, baslik: yazarAdi })
      }
      setFavoriMi_(!favoriMi_)
    } finally {
      setFavoriIsleniyor(false)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <h1 className="font-baslik text-2xl text-murekkep">{yazarAdi}</h1>
        {kullanici && (
          <button
            onClick={favoriDegistir}
            disabled={favoriIsleniyor}
            className={`shrink-0 rounded-sm px-3 py-1.5 font-govde text-xs ${
              favoriMi_ ? 'bg-muhur text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
            } disabled:opacity-40`}
          >
            {favoriMi_ ? '★ Favorilerimde' : '☆ Favorilere Ekle'}
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-kraft">
        {yukleniyor ? 'Yükleniyor...' : `${kitaplar.length} kitap · Türkçe Kitap Veri Tabanı`}
      </p>

      <YazarBiyografisi yazarAdi={yazarAdi} />

      <div className="defter-cizgi my-6" />

      <h2 className="font-baslik text-lg text-murekkep mb-3">Kitapları</h2>
      {!yukleniyor && kitaplar.length === 0 && (
        <p className="text-sm text-kraft">Bu yazara ait kitap bulunamadı (yazar adı yazımı farklı olabilir).</p>
      )}

      <div className="space-y-2">
        {kitaplar.map((k) => (
          <div key={k.id} className="flex items-center gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
            {k.posterUrl ? (
              <img src={k.posterUrl} alt={k.baslik} className="h-20 w-14 shrink-0 rounded-sm object-cover ring-1 ring-cizgi" />
            ) : (
              <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-sm bg-kagit text-lg ring-1 ring-cizgi">📖</div>
            )}
            <div className="min-w-0 flex-1">
              <button
                onClick={() => incele(k)}
                disabled={inceleniyorId === k.id}
                className="truncate text-left text-sm font-medium text-murekkep hover:text-deniz hover:underline disabled:opacity-40"
              >
                {inceleniyorId === k.id ? 'Açılıyor...' : k.baslik}
              </button>
              <p className="truncate text-xs text-kraft">
                {[k.yayinevi, k.yil, k.sayfaSayisi && `${k.sayfaSayisi} s.`].filter(Boolean).join(' · ')}
              </p>
              {k.kategori && <p className="truncate text-[11px] text-kraft">{k.kategori}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

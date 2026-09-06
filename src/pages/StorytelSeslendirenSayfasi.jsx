import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { storytelKitaplariSeslendireneGoreGetir } from '../utils/storytelKitaplari.js'
import StorytelIkon from '../components/ikonlar/StorytelIkon.jsx'

// Storytel'de Olanlar'ın "Seslendiren" alt sayfası — bir kitabın Storytel
// kartındaki (bkz. EserSayfasi.jsx) seslendiren adına tıklanınca buraya
// düşülüyor. StorytelKitaplari.jsx'teki kategori-detay görünümüyle aynı
// poster ızgarası dilini kullanıyor.
export default function StorytelSeslendirenSayfasi() {
  const { isim } = useParams()
  const gosterilenIsim = decodeURIComponent(isim)
  const [kitaplar, setKitaplar] = useState(null)

  useEffect(() => {
    let iptal = false
    storytelKitaplariSeslendireneGoreGetir(gosterilenIsim).then((liste) => {
      if (!iptal) setKitaplar(liste)
    })
    return () => {
      iptal = true
    }
  }, [gosterilenIsim])

  return (
    <div>
      <Link to="/storytel-kitaplari" className="text-xs text-kraft hover:text-deniz">
        ← Storytel'de Olanlar
      </Link>
      <h1 className="mt-1 mb-1 flex items-center gap-2 font-baslik text-2xl text-murekkep">
        <StorytelIkon className="h-6 w-6 text-[#FF5B22]" /> {gosterilenIsim}
      </h1>
      <p className="mb-6 text-sm text-kraft">Seslendiren — Storytel'de Olanlar</p>

      {kitaplar === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {kitaplar !== null && kitaplar.length === 0 && (
        <p className="text-sm text-kraft">Bu seslendirenden henüz işaretlenmiş bir kitap yok.</p>
      )}

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {kitaplar?.map((kitap) => (
          <Link key={kitap.id} to={`/kitap/${kitap.id}`} className="block">
            <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
              {kitap.posterUrl ? (
                <img src={kitap.posterUrl} alt={kitap.baslik} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">📖</div>
              )}
            </div>
            <p className="mt-1 truncate text-xs text-murekkep">{kitap.baslik}</p>
            {kitap.storytelSure && <p className="truncate text-[10px] text-kraft">🎧 {kitap.storytelSure}</p>}
          </Link>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { storytelKitaplariGetir } from '../utils/storytelKitaplari.js'

// Storytel'in resmi bir API'si olmadığı için (bu oturumda araştırdık) bu
// liste tamamen ELLE işaretlenmiş kitaplardan oluşuyor — Kitap sayfasındaki
// "🎧 Storytel" kartından erişiliyor.
export default function StorytelKitaplari() {
  const [kitaplar, setKitaplar] = useState(null)

  useEffect(() => {
    storytelKitaplariGetir().then(setKitaplar)
  }, [])

  return (
    <div>
      <Link to="/kitaplar" className="text-xs text-kraft hover:text-deniz">
        ← Kitap
      </Link>
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">🎧 Storytel'de Olanlar</h1>
      <p className="mb-6 text-sm text-kraft">
        Topluluğun elle işaretlediği, Storytel'de sesli kitap olarak bulunan kitaplar.
      </p>

      {kitaplar === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {kitaplar !== null && kitaplar.length === 0 && (
        <p className="text-sm text-kraft">Henüz hiç kitap işaretlenmemiş — bir kitap sayfasındaki 🎧 simgesiyle sen işaretleyebilirsin.</p>
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
            {kitap.alt && <p className="truncate text-[10px] text-kraft">{kitap.alt}</p>}
          </Link>
        ))}
      </div>
    </div>
  )
}

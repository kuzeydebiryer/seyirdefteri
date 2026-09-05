import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { storytelKitaplariGetir, storytelPopulerleriGetir } from '../utils/storytelKitaplari.js'
import { STORYTEL_KATEGORILERI } from '../utils/storytelKategorileri.js'
import YatayKaydirma from '../components/YatayKaydirma.jsx'

// Storytel'in resmi bir API'si olmadığı için (araştırdık) bu liste tamamen
// ELLE işaretlenmiş kitaplardan oluşuyor — Kitap sayfasındaki "🎧 Storytel"
// giriş şeridinden erişiliyor. Yapı Storytel'in kendi uygulamasındaki
// dile bilerek benziyor: en üstte "Popüler" şeridi (Serkan'ın haftalık
// elle güncellediği), altında renkli kategori kartları.
function KucukPosterKart({ kitap }) {
  return (
    <Link to={`/kitap/${kitap.id}`} className="shrink-0" style={{ width: 110 }}>
      <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
        {kitap.posterUrl ? (
          <img src={kitap.posterUrl} alt={kitap.baslik} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">📖</div>
        )}
      </div>
      <p className="mt-1 truncate text-xs text-murekkep">{kitap.baslik}</p>
    </Link>
  )
}

export default function StorytelKitaplari() {
  const { kategoriId } = useParams()
  const [tumKitaplar, setTumKitaplar] = useState(null)
  const [populerler, setPopulerler] = useState(null)

  useEffect(() => {
    storytelKitaplariGetir().then(setTumKitaplar)
    storytelPopulerleriGetir().then(setPopulerler)
  }, [])

  const kategoriGruplari = useMemo(() => {
    if (!tumKitaplar) return []
    return STORYTEL_KATEGORILERI.map((kat) => ({
      ...kat,
      kitaplar: tumKitaplar.filter((k) => k.kategori === kat.id),
    }))
  }, [tumKitaplar])

  const seciliKategori = kategoriId ? STORYTEL_KATEGORILERI.find((k) => k.id === kategoriId) : null

  if (seciliKategori) {
    const kitaplar = (tumKitaplar || []).filter((k) => k.kategori === seciliKategori.id)
    return (
      <div>
        <Link to="/storytel-kitaplari" className="text-xs text-kraft hover:text-deniz">
          ← Storytel'de Olanlar
        </Link>
        <h1 className="mt-1 mb-6 font-baslik text-2xl text-murekkep">🎧 {seciliKategori.ad}</h1>
        {tumKitaplar === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
        {tumKitaplar !== null && kitaplar.length === 0 && <p className="text-sm text-kraft">Bu kategoride henüz kitap yok.</p>}
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {kitaplar.map((kitap) => (
            <Link key={kitap.id} to={`/kitap/${kitap.id}`} className="block">
              <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                {kitap.posterUrl ? (
                  <img src={kitap.posterUrl} alt={kitap.baslik} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">📖</div>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-murekkep">{kitap.baslik}</p>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link to="/kitaplar" className="text-xs text-kraft hover:text-deniz">
        ← Kitap
      </Link>
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">🎧 Storytel'de Olanlar</h1>
      <p className="mb-6 text-sm text-kraft">Topluluğun elle işaretlediği, Storytel'de sesli kitap olarak bulunan kitaplar.</p>

      {populerler === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {populerler !== null && populerler.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-2 font-baslik text-lg text-murekkep">🔥 Storytel'de Popüler</h2>
          <YatayKaydirma>
            {populerler.map((k) => (
              <KucukPosterKart key={k.id} kitap={k} />
            ))}
          </YatayKaydirma>
        </div>
      )}

      <h2 className="mb-3 font-baslik text-lg text-murekkep">Kategoriler</h2>
      <div className="grid grid-cols-2 gap-3">
        {kategoriGruplari.map((kat) => (
          <Link
            key={kat.id}
            to={`/storytel-kitaplari/${kat.id}`}
            className="overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi transition hover:ring-murekkep/30"
          >
            <div style={{ backgroundColor: kat.renk }} className="flex h-16 items-center justify-center px-3">
              <p className="text-center font-baslik text-base font-bold text-black">{kat.ad}</p>
            </div>
            <div className="p-2">
              {kat.kitaplar.length > 0 ? (
                <div className="flex -space-x-2">
                  {kat.kitaplar.slice(0, 3).map((k) => (
                    <div key={k.id} className="h-16 w-11 shrink-0 overflow-hidden rounded-sm ring-2 ring-kagitKoyu">
                      {k.posterUrl ? (
                        <img src={k.posterUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-kagit text-sm opacity-40">📖</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-3 text-center text-[11px] text-kraft">Henüz kitap yok</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

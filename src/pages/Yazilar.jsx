import { useGonderiler } from '../hooks/useGonderiler.js'
import GonderiKarti from '../components/GonderiKarti.jsx'
import YaziArama from '../components/YaziArama.jsx'

const ALT_TUR_BASLIKLARI = [
  { id: 'deneme', baslik: 'Denemeler' },
  { id: 'film-incelemesi', baslik: 'Film İncelemeleri' },
  { id: 'kitap-incelemesi', baslik: 'Kitap İncelemeleri' },
  { id: 'sanat-elestirisi', baslik: 'Sanat Eleştirileri' },
  { id: 'kisi-yazisi', baslik: 'Kişi Yazıları' },
  { id: 'liste-yazisi', baslik: 'Liste Yazıları' },
  { id: 'soylesi', baslik: 'Söyleşiler' },
]

export default function Yazilar() {
  const { gonderiler, yukleniyor, hata, dahaFazlaVarMi, dahaFazlaYukle } = useGonderiler({ tur: 'yazi' })

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep mb-2">Yazı</h1>
      <p className="text-sm text-kraft mb-6">Denemeler, incelemeler, kişi yazıları, liste yazıları ve söyleşiler.</p>

      <YaziArama />

      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {hata && <p className="text-sm text-muhur">Bir hata oldu: {hata}</p>}

      {!yukleniyor &&
        ALT_TUR_BASLIKLARI.map(({ id, baslik }) => {
          const buGrup = gonderiler.filter((g) => g.altTur === id)
          return (
            <div key={id} className="mb-10">
              <h2 className="font-baslik text-lg text-murekkep mb-3">{baslik}</h2>
              {buGrup.length === 0 ? (
                <p className="text-sm text-kraft">Henüz bu türde bir yazı yok.</p>
              ) : (
                <div className="space-y-4">
                  {buGrup.map((g, i) => (
                    <div key={g.id}>
                      <GonderiKarti gonderi={g} />
                      {i < buGrup.length - 1 && <div className="defter-cizgi mt-4" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

      {!yukleniyor && dahaFazlaVarMi && (
        <button
          onClick={dahaFazlaYukle}
          className="rounded-sm bg-kagitKoyu px-4 py-2 font-govde text-sm text-kraft ring-1 ring-cizgi hover:text-murekkep"
        >
          Daha Fazla Göster
        </button>
      )}
    </div>
  )
}

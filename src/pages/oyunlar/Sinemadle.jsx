import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { populerFilmHavuzuGetir, filmDetayGetir, karistir, TMDB_POSTER } from '../../utils/oyunHavuzu.js'

// Günün hedefini, havuzdaki filmler arasından TARİHE göre deterministik
// seçiyoruz — sunucu tarafı bir "günün filmi" kaydı tutmadan (Cloud Function
// gerektirmeden) herkesin aynı gün aynı filmi görmesini sağlayan basit bir
// yöntem. Havuz sırası (puanSayisi'na göre) gün içinde büyük olasılıkla
// stabil kaldığından, aynı gün içindeki kullanıcılar aynı hedefi görür.
function gununIndeksi(uzunluk) {
  const bugun = new Date().toISOString().slice(0, 10)
  let toplam = 0
  for (let i = 0; i < bugun.length; i++) toplam += bugun.charCodeAt(i)
  return toplam % uzunluk
}

export default function Sinemadle() {
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hedef, setHedef] = useState(null)
  const [secenekler, setSecenekler] = useState([])
  const [ipucuSeviyesi, setIpucuSeviyesi] = useState(1)
  const [denenenler, setDenenenler] = useState([])
  const [durum, setDurum] = useState('oynaniyor') // 'oynaniyor' | 'kazandi' | 'kaybetti'

  useEffect(() => {
    async function kur() {
      setYukleniyor(true)
      const havuz = await populerFilmHavuzuGetir(40)
      if (havuz.length < 8) {
        setYukleniyor(false)
        return
      }
      const hedefHam = havuz[gununIndeksi(havuz.length)]
      const hedefDetay = await filmDetayGetir(hedefHam.disId)
      if (!hedefDetay) {
        setYukleniyor(false)
        return
      }
      const digerleri = karistir(havuz.filter((f) => f.disId !== hedefHam.disId)).slice(0, 7)
      setHedef(hedefDetay)
      setSecenekler(karistir([hedefHam, ...digerleri]))
      setYukleniyor(false)
    }
    kur()
  }, [])

  function tahminEt(filmHam) {
    if (durum !== 'oynaniyor') return
    if (filmHam.disId === hedef.id) {
      setDurum('kazandi')
      return
    }
    const yeniDenenenler = [...denenenler, filmHam.disId]
    setDenenenler(yeniDenenenler)
    if (ipucuSeviyesi >= 5) {
      setDurum('kaybetti')
    } else {
      setIpucuSeviyesi((s) => s + 1)
    }
  }

  if (yukleniyor) return <p className="text-sm text-kraft">Günün filmi hazırlanıyor...</p>
  if (!hedef) return <p className="text-sm text-kraft">Bugün için yeterli veri yok — biraz daha topluluk aktivitesi gerekiyor.</p>

  const yonetmen = hedef.credits?.crew?.find((k) => k.job === 'Director')?.name

  return (
    <div className="max-w-lg">
      <Link to="/oyunlar" className="text-xs text-kraft hover:text-deniz">
        ← Sinema Oyunları
      </Link>
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">Sinemadle</h1>
      <p className="mb-4 text-sm text-kraft">Günün filmi — her yanlış tahminde yeni bir ipucu açılır. 5 hakkın var.</p>

      <div className="mb-4 space-y-2 rounded-sm bg-kagitKoyu p-3 text-sm ring-1 ring-cizgi">
        <p>
          <span className="text-kraft">İpucu 1 — Tür:</span> <span className="text-murekkep">{hedef.genres?.map((g) => g.name).join(', ') || '?'}</span>
        </p>
        {ipucuSeviyesi >= 2 && (
          <p>
            <span className="text-kraft">İpucu 2 — Yıl:</span> <span className="text-murekkep">{hedef.release_date?.slice(0, 4) || '?'}</span>
          </p>
        )}
        {ipucuSeviyesi >= 3 && (
          <p>
            <span className="text-kraft">İpucu 3 — Yönetmen:</span> <span className="text-murekkep">{yonetmen || '?'}</span>
          </p>
        )}
        {ipucuSeviyesi >= 4 && hedef.tagline && (
          <p>
            <span className="text-kraft">İpucu 4 — Slogan:</span> <span className="text-murekkep italic">"{hedef.tagline}"</span>
          </p>
        )}
        {ipucuSeviyesi >= 5 && hedef.poster_path && (
          <div className="mt-2 overflow-hidden rounded-sm" style={{ height: 140 }}>
            <img
              src={`${TMDB_POSTER}${hedef.poster_path}`}
              alt=""
              className="w-full object-cover"
              style={{ transform: 'scale(2.2)', transformOrigin: '50% 30%', height: 140 }}
            />
          </div>
        )}
      </div>

      {durum === 'oynaniyor' && (
        <div className="space-y-2">
          {secenekler.map((f) => {
            const denendiMi = denenenler.includes(f.disId)
            return (
              <button
                key={f.disId}
                onClick={() => tahminEt(f)}
                disabled={denendiMi}
                className={`block w-full rounded-sm px-3 py-2 text-left text-sm ring-1 transition ${
                  denendiMi ? 'bg-muhur/10 text-kraft ring-muhur/40 line-through' : 'bg-kagitKoyu ring-cizgi hover:ring-deniz/50 text-murekkep'
                }`}
              >
                {f.baslik} {f.yil && `(${f.yil})`}
              </button>
            )
          })}
        </div>
      )}

      {durum === 'kazandi' && (
        <div className="rounded-sm bg-gise/20 p-4 text-center ring-1 ring-gise">
          <p className="font-baslik text-lg text-murekkep">🎉 Bildin! {hedef.title}</p>
          <p className="mt-1 text-sm text-kraft">{6 - ipucuSeviyesi} ipucu kalmışken bildin.</p>
        </div>
      )}

      {durum === 'kaybetti' && (
        <div className="rounded-sm bg-muhur/10 p-4 text-center ring-1 ring-muhur/40">
          <p className="font-baslik text-lg text-murekkep">Bugünlük olmadı — cevap: {hedef.title}</p>
          <p className="mt-1 text-sm text-kraft">Yarın yeni bir film var.</p>
        </div>
      )}
    </div>
  )
}

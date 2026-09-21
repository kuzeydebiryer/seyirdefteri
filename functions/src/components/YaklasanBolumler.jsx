import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { kullanicininIzlemekteOlduguDizileriGetir, topluluktaSuankiOkunanlariGetir } from '../utils/izlenecek.js'
import { sonrakiBolumBilgisiGetir } from '../utils/diziBolum.js'
import YatayKaydirma from './YatayKaydirma.jsx'

function gunSayisi(tarih) {
  const fark = new Date(tarih) - new Date(new Date().toISOString().slice(0, 10))
  return Math.round(fark / (1000 * 60 * 60 * 24))
}

async function bolumleriCoz(diziler) {
  const sonuclar = await Promise.all(
    diziler.map(async (d) => {
      const bilgi = await sonrakiBolumBilgisiGetir(d.disId)
      if (!bilgi) return null
      return { ...d, ...bilgi }
    })
  )
  return sonuclar.filter(Boolean).sort((a, b) => a.tarih.localeCompare(b.tarih))
}

// "İzliyorum" + "İzleyeceklerim" işaretlediğin dizilerin TMDB'deki resmi
// yayın takvimine göre bir sonraki bölümünün ne zaman geleceğini gösteriyor.
// Kendi listende hiç yaklaşan bölüm yoksa (dizilerin hepsi bitmiş/ara
// sezonda olabilir, ya da sadece az sayıda dizin var) sessizce kaybolmak
// yerine TOPLULUK genelinde yaklaşan bölümlere düşüyor — hem "neden boş"
// belirsizliğini gideriyor hem widget'ı çok daha sık dolu tutuyor.
export default function YaklasanBolumler() {
  const { kullanici } = useAuth()
  const [bolumler, setBolumler] = useState(null)
  const [kaynak, setKaynak] = useState('kisisel') // 'kisisel' | 'topluluk'

  useEffect(() => {
    if (!kullanici) {
      setBolumler([])
      return
    }
    kullanicininIzlemekteOlduguDizileriGetir(kullanici.uid).then(async (diziler) => {
      const kisiselSonuc = await bolumleriCoz(diziler)
      if (kisiselSonuc.length > 0) {
        setKaynak('kisisel')
        setBolumler(kisiselSonuc)
        return
      }
      // Kişisel listede yaklaşan bölüm yok — topluluk genelinde "izliyorum"
      // işaretlenmiş dizilere bakılıyor (aynı dizi birden fazla kişide
      // olabilir, disId'ye göre tekilleştiriliyor).
      const topluluk = await topluluktaSuankiOkunanlariGetir('dizi', 30)
      const tekil = [...new Map(topluluk.map((d) => [d.disId, d])).values()]
      const topluluksonuc = await bolumleriCoz(tekil)
      setKaynak('topluluk')
      setBolumler(topluluksonuc)
    })
  }, [kullanici])

  if (!kullanici) return null

  return (
    <div className="mb-10">
      <h2 className="mb-1 font-baslik text-lg text-murekkep">📅 Yaklaşan Bölümler</h2>
      {bolumler !== null && bolumler.length > 0 && kaynak === 'topluluk' && (
        <p className="mb-3 text-[11px] text-kraft">Kendi listende yaklaşan bölüm yok — topluluk genelinde yaklaşanlar gösteriliyor.</p>
      )}
      {bolumler !== null && bolumler.length === 0 && (
        <p className="text-sm text-kraft">Şu an takip ettiğin (ya da toplulukta izlenen) dizilerde yaklaşan bölüm yok.</p>
      )}
      {bolumler === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {bolumler && bolumler.length > 0 && (
        <YatayKaydirma>
          {bolumler.map((b) => {
            const gun = gunSayisi(b.tarih)
            return (
              <Link key={b.id || b.disId} to={`/dizi/${b.disId}`} className="shrink-0" style={{ width: 120 }}>
                <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                  {b.posterUrl ? (
                    <img src={b.posterUrl} alt={b.baslik} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">📺</div>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-murekkep">{b.baslik}</p>
                <p className="truncate text-[10px] text-kraft">
                  S{b.sezonNo}B{b.bolumNo}
                </p>
                <p className="text-[10px] text-gise">{gun === 0 ? 'Bugün! 🎉' : gun === 1 ? 'Yarın' : gun > 0 ? `${gun} gün sonra` : 'Yayınlandı'}</p>
              </Link>
            )
          })}
        </YatayKaydirma>
      )}
    </div>
  )
}

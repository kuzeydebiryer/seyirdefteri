import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { kullanicininIzlemekteOlduguDizileriGetir } from '../utils/izlenecek.js'
import { sonrakiBolumBilgisiGetir } from '../utils/diziBolum.js'
import YatayKaydirma from './YatayKaydirma.jsx'

function gunSayisi(tarih) {
  const fark = new Date(tarih) - new Date(new Date().toISOString().slice(0, 10))
  return Math.round(fark / (1000 * 60 * 60 * 24))
}

// "Şu An İzliyorum" işaretlediğin dizilerin TMDB'deki resmi yayın takvimine
// göre bir sonraki bölümünün ne zaman geleceğini gösteriyor — devam eden bir
// dizide, "gelecek bölüm ne zaman" sorusuna otomatik cevap. Bitmiş/ara verilmiş
// dizilerde next_episode_to_air zaten boş döndüğü için o diziler listede
// görünmüyor, elle bir şey filtrelemeye gerek yok.
export default function YaklasanBolumler() {
  const { kullanici } = useAuth()
  const [bolumler, setBolumler] = useState(null)

  useEffect(() => {
    if (!kullanici) {
      setBolumler([])
      return
    }
    kullanicininIzlemekteOlduguDizileriGetir(kullanici.uid).then(async (diziler) => {
      const sonuclar = await Promise.all(
        diziler.map(async (d) => {
          const bilgi = await sonrakiBolumBilgisiGetir(d.disId)
          if (!bilgi) return null
          return { ...d, ...bilgi }
        })
      )
      setBolumler(
        sonuclar
          .filter(Boolean)
          .sort((a, b) => a.tarih.localeCompare(b.tarih))
      )
    })
  }, [kullanici])

  if (!kullanici) return null
  if (bolumler !== null && bolumler.length === 0) return null

  return (
    <div className="mb-10">
      <h2 className="mb-3 font-baslik text-lg text-murekkep">📅 Yaklaşan Bölümler</h2>
      <YatayKaydirma>
        {bolumler?.map((b) => {
          const gun = gunSayisi(b.tarih)
          return (
            <Link key={b.id} to={`/dizi/${b.disId}`} className="shrink-0" style={{ width: 120 }}>
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
    </div>
  )
}

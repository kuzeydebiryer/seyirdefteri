import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTumGelecekEtkinlikler } from '../hooks/useTumGelecekEtkinlikler.js'
import { kulupPuanlariniGetir } from '../utils/kulupPuanlari.js'

// Ödül (Oscar vb.) sayfasında, adayların üstünde: film kulübümüzün bu sezonun
// adayları arasından incelediği/inceleyeceği filmler, yatay bir "film şeridi"
// olarak. Sıra: önce yaklaşan etkinlikler (en yakın tarih en başta — ilk sıradaki
// "şu an incelenecek" film), ardından geçmiş incelemeler (en yeniden en eskiye).
// Veri, anasayfadaki "Kulüp Eleştirmenleri" vitriniyle aynı etkinliklerden gelir.
export default function KulupOscarSeridi({ adaylar }) {
  const { etkinlikler, yukleniyor } = useTumGelecekEtkinlikler()
  const [puanlar, setPuanlar] = useState({}) // etkinlikId -> { ort (10 üzerinden), sayi }

  const sirali = useMemo(() => {
    if (yukleniyor) return []
    const adayIdleri = new Set(adaylar.filter((a) => a.tmdbId && (a.tur || 'film') === 'film').map((a) => Number(a.tmdbId)))
    const simdi = Date.now()

    // Aynı filmin birden fazla etkinliği olursa (farklı kulüpler) tek kart.
    const filmler = new Map()
    etkinlikler
      .filter((e) => e.topluluklTur === 'Sinema' && e.eserTur === 'sinema' && e.tarih && adayIdleri.has(Number(e.eserTmdbId)))
      .forEach((e) => {
        const onceki = filmler.get(e.eserTmdbId)
        if (!onceki) return filmler.set(e.eserTmdbId, e)
        const yeniYaklasan = new Date(e.tarih).getTime() >= simdi
        const eskiYaklasan = new Date(onceki.tarih).getTime() >= simdi
        if (yeniYaklasan && (!eskiYaklasan || e.tarih < onceki.tarih)) filmler.set(e.eserTmdbId, e)
      })

    const liste = [...filmler.values()]
    const yaklasanlar = liste.filter((e) => new Date(e.tarih).getTime() >= simdi).sort((a, b) => a.tarih.localeCompare(b.tarih))
    const gecmisler = liste.filter((e) => new Date(e.tarih).getTime() < simdi).sort((a, b) => b.tarih.localeCompare(a.tarih))
    return [...yaklasanlar, ...gecmisler]
  }, [etkinlikler, yukleniyor, adaylar])

  // Her filmin kulüp ortalaması: üyelerin o filme verdiği puanlardan (bkz.
  // kulupPuanlari.js) — etkinlik başına birkaç küçük okuma.
  useEffect(() => {
    if (sirali.length === 0) return
    let iptal = false
    Promise.all(sirali.map((e) => kulupPuanlariniGetir(e).catch(() => []))).then((sonuclar) => {
      if (iptal) return
      const harita = {}
      sirali.forEach((e, i) => {
        const verilenler = sonuclar[i].filter((p) => p.puan != null)
        if (verilenler.length > 0) {
          harita[e.id] = { ort: (verilenler.reduce((t, p) => t + p.puan, 0) / verilenler.length) * 2, sayi: verilenler.length }
        }
      })
      setPuanlar(harita)
    })
    return () => {
      iptal = true
    }
  }, [sirali])

  if (sirali.length === 0) return null
  const simdi = Date.now()
  const puanSiralamasi = sirali
    .filter((e) => puanlar[e.id])
    .sort((a, b) => puanlar[b.id].ort - puanlar[a.id].ort || puanlar[b.id].sayi - puanlar[a.id].sayi || a.eserBaslik.localeCompare(b.eserBaslik, 'tr'))

  return (
    <>
    <div className="mb-6">
      <h2 className="mb-2 font-baslik text-base text-gise">🎞️ Film Kulübümüzün İncelediği Adaylar</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {sirali.map((e, i) => {
          const yaklasanMi = new Date(e.tarih).getTime() >= simdi
          const siradaki = yaklasanMi && i === 0
          return (
            <Link key={e.id} to={`/film/${e.eserTmdbId}`} className="block w-24 shrink-0">
              <div className={`relative aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ${siradaki ? 'ring-2 ring-gise' : 'ring-1 ring-cizgi'}`}>
                {e.eserPosterUrl && <img src={e.eserPosterUrl} alt={e.eserBaslik} className="h-full w-full object-cover" />}
                <span
                  className={`absolute inset-x-0 top-0 py-0.5 text-center font-govde text-[9px] font-bold ${
                    siradaki ? 'bg-gise text-kagit' : yaklasanMi ? 'bg-deniz/90 text-kagit' : 'bg-murekkep/80 text-kagit'
                  }`}
                >
                  {siradaki ? 'SIRADAKİ · ' : ''}
                  {new Date(e.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }).toLocaleUpperCase('tr-TR')}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-murekkep">{e.eserBaslik}</p>
            </Link>
          )
        })}
      </div>
    </div>

    {puanSiralamasi.length > 0 && (
      <div className="mb-6">
        <h2 className="mb-2 font-baslik text-base text-gise">🏅 Kulüp Puan Sıralaması</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {puanSiralamasi.map((e, i) => {
            const { ort, sayi } = puanlar[e.id]
            return (
              <Link key={e.id} to={`/film/${e.eserTmdbId}`} className="block w-24 shrink-0">
                <div className={`relative aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ${i === 0 ? 'ring-2 ring-gise' : 'ring-1 ring-cizgi'}`}>
                  {e.eserPosterUrl && <img src={e.eserPosterUrl} alt={e.eserBaslik} className="h-full w-full object-cover" />}
                  <span className="absolute left-1 top-1 rounded-full bg-murekkep/85 px-1.5 py-0.5 font-govde text-[10px] font-bold text-kagit">{i + 1}</span>
                  <span className="absolute bottom-1 right-1 rounded-sm bg-gise px-1.5 py-0.5 font-govde text-sm font-bold leading-none text-kagit">
                    {Number.isInteger(ort) ? ort : ort.toFixed(1)}
                  </span>
                  <span className="absolute bottom-1 left-1 rounded-full bg-murekkep/80 px-1 py-0.5 font-govde text-[9px] text-kagit">{sayi} 🎭</span>
                </div>
                <p className="mt-1 truncate text-xs text-murekkep">{e.eserBaslik}</p>
              </Link>
            )
          })}
        </div>
      </div>
    )}
    </>
  )
}

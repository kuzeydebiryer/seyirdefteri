import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { sonHaberleriGetir } from '../utils/haber.js'
import { onizlemeMetniCikar } from '../utils/icerikAyristir.js'
import PaylasButonu from './PaylasButonu.jsx'

const KATEGORI_ETIKETI = { sinema: '🎬 Film', dizi: '📺 Dizi', kitap: '📚 Kitap', kisi: '🎭 Oyuncu', 'kultur-sanat': '🎨 Kültür-Sanat' }

function tarihGoster(deger) {
  if (!deger) return ''
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const OZET_UZUNLUGU = 220

// Anasayfa'nın en üstündeki büyük haber vitrini: en yeni haber "hero" kart
// olarak büyük gösteriliyor, altındaki yatay şeritteki küçük resimlerden
// birine tıklanınca hero o habere değişiyor (sayfa değişmeden). Aynı
// `haberler` koleksiyonunu kullanıyor — HaberBolumu'ndaki liste yapısından
// bağımsız, sadece Anasayfa'ya özel bir sunum katmanı.
export default function AnasayfaHaberVitrini() {
  const [haberler, setHaberler] = useState(null) // null = yükleniyor
  const [aktifIndeks, setAktifIndeks] = useState(0)
  const seritRef = useRef(null)

  useEffect(() => {
    sonHaberleriGetir(7).then(setHaberler)
  }, [])

  function seritKaydir(yon) {
    seritRef.current?.scrollBy({ left: yon * 260, behavior: 'smooth' })
  }

  if (haberler === null || haberler.length === 0) return null

  const hero = haberler[aktifIndeks] || haberler[0]
  const heroGorsel = hero.gorselUrl || hero.ilgiliPosterUrl
  const heroMetin = onizlemeMetniCikar(hero.icerik)
  const ozet = heroMetin.length > OZET_UZUNLUGU ? `${heroMetin.slice(0, OZET_UZUNLUGU).trim()}…` : heroMetin

  return (
    <div className="mb-10 overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
      <Link to={`/haber/${hero.id}`} className="block">
        <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
          {heroGorsel ? (
            <img src={heroGorsel} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-kagit text-4xl opacity-40">📰</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-murekkep/90 via-murekkep/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
            <p className="text-[11px] uppercase tracking-widest text-kagit/80">
              {KATEGORI_ETIKETI[hero.kategori] || '📰 Haber'}
              {hero.oneCikan && <span className="ml-1.5">⭐ Öne Çıkan</span>}
            </p>
            <h2 className="mt-1 font-baslik text-xl leading-snug text-kagit sm:text-2xl">{hero.baslik}</h2>
            {ozet && <p className="mt-1.5 hidden text-sm text-kagit/85 sm:block">{ozet}</p>}
          </div>
        </div>
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs text-kraft">
        <span>
          {hero.ekleyenAdi} · {tarihGoster(hero.tarih)}
          {hero.goruntulenmeSayisi > 0 && <> · 👁 {hero.goruntulenmeSayisi}</>}
        </span>
        <span className="ml-auto flex items-center gap-3">
          <PaylasButonu baslik={hero.baslik} url={`/haber/${hero.id}`} boyut="kucuk" />
          <Link to="/haberler" className="text-deniz hover:underline">
            Tüm Haberler →
          </Link>
        </span>
      </div>

      {haberler.length > 1 && (
        <div className="flex items-center gap-2 border-t border-cizgi p-3">
          <button
            onClick={() => seritKaydir(-1)}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-kagit text-xs text-kraft ring-1 ring-cizgi hover:text-deniz sm:flex"
            aria-label="Önceki"
          >
            ‹
          </button>
          <div ref={seritRef} className="flex flex-1 gap-2 overflow-x-auto scroll-smooth pb-1">
            {haberler.map((h, i) => {
              const gorsel = h.gorselUrl || h.ilgiliPosterUrl
              return (
                <button
                  key={h.id}
                  onClick={() => setAktifIndeks(i)}
                  className={`shrink-0 overflow-hidden rounded-sm ring-1 transition ${
                    i === aktifIndeks ? 'ring-2 ring-gise' : 'ring-cizgi opacity-80 hover:opacity-100'
                  }`}
                  style={{ width: 96 }}
                  title={h.baslik}
                >
                  <div className="aspect-video w-full bg-kagit">
                    {gorsel ? (
                      <img src={gorsel} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg opacity-40">📰</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
          <button
            onClick={() => seritKaydir(1)}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-kagit text-xs text-kraft ring-1 ring-cizgi hover:text-deniz sm:flex"
            aria-label="Sonraki"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}

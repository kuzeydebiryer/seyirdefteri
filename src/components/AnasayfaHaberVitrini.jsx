import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { sonHaberleriGetir } from '../utils/haber.js'
import { onizlemeMetniCikar } from '../utils/icerikAyristir.js'
import { gununKonusuGetir } from '../utils/dusunceHavuzu.js'

const KATEGORI_ETIKETI = { sinema: '🎬 Film', dizi: '📺 Dizi', kitap: '📚 Kitap', kisi: '🎭 Oyuncu', 'kultur-sanat': '🎨 Kültür-Sanat' }

const OZET_UZUNLUGU = 220

// Anasayfa'nın en üstündeki büyük haber vitrini: en yeni haber "hero" kart
// olarak büyük gösteriliyor, altındaki yatay şeritteki küçük resimlerden
// birine tıklanınca hero o habere değişiyor (sayfa değişmeden). Aynı
// `haberler` koleksiyonunu kullanıyor — HaberBolumu'ndaki liste yapısından
// bağımsız, sadece Anasayfa'ya özel bir sunum katmanı.
//
// Bilerek YOK: ekleyen/tarih/görüntülenme sayısı ve Paylaş butonu — bunlar
// sadece haberin kendi detay sayfasında var, vitrin sade kalsın (görsel +
// başlık + hemen altında şerit) diye buraya taşınmadı.
//
// Bugünün Düşüncesi entegrasyonu: aktif bir konu varsa, görselsiz/kraft
// tonlu ayrı bir kart tipi ("dusunce") olarak şeridin EN BAŞINA sabitlenip
// hero'ya da aday oluyor — böylece hem vitrin şeridinde göze çarpıyor hem
// istenirse hero'ya tıklanıp büyük görülebiliyor. Öneri gönderme/havuzu
// genişletme/yönetim gibi etkileşimli kısımlar bir hero kartına sığmadığı
// için BugununDusuncesiWidget aşağıdaki yerinde AYNEN kalmaya devam ediyor
// — bu kart sadece "bugün ne konuşuluyor" için hızlı bir giriş kapısı.
export default function AnasayfaHaberVitrini() {
  const [haberler, setHaberler] = useState(null) // null = yükleniyor
  const [konu, setKonu] = useState(undefined) // undefined = yükleniyor, null = aktif konu yok
  const [aktifIndeks, setAktifIndeks] = useState(0)
  const seritRef = useRef(null)

  useEffect(() => {
    sonHaberleriGetir(7).then(setHaberler)
    gununKonusuGetir().then(setKonu)
  }, [])

  function seritKaydir(yon) {
    seritRef.current?.scrollBy({ left: yon * 260, behavior: 'smooth' })
  }

  if (haberler === null || konu === undefined) return null
  if (haberler.length === 0 && !konu) return null

  const dusunceOgesi = konu
    ? {
        tip: 'dusunce',
        id: `dusunce-${konu.id}`,
        konu,
      }
    : null

  const ogeler = dusunceOgesi ? [dusunceOgesi, ...haberler.map((h) => ({ tip: 'haber', ...h }))] : haberler.map((h) => ({ tip: 'haber', ...h }))

  if (ogeler.length === 0) return null

  const hero = ogeler[aktifIndeks] || ogeler[0]
  const heroHaber = hero.tip === 'haber' ? hero : null
  const heroGorsel = heroHaber && (heroHaber.gorselUrl || heroHaber.ilgiliPosterUrl)
  const heroMetin = heroHaber ? onizlemeMetniCikar(heroHaber.icerik) : ''
  const ozet = heroMetin.length > OZET_UZUNLUGU ? `${heroMetin.slice(0, OZET_UZUNLUGU).trim()}…` : heroMetin

  return (
    <div className="mb-10 overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
      <div className="relative">
        {hero.tip === 'dusunce' ? (
          <Link to={`/dusunce/${encodeURIComponent(hero.konu.konu)}`} className="block">
            <div className="relative flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-kraft/25 via-kagitKoyu to-gise/20 p-6 text-center sm:aspect-[21/9] sm:p-10">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-gise">💭 Bugünün Düşüncesi</p>
                <h2 className="mt-2 font-baslik text-xl leading-snug text-murekkep sm:text-3xl">{hero.konu.konu}</h2>
                <p className="mt-2 text-xs text-kraft">
                  {hero.konu.gunSayisi} gün yayında{hero.konu.suresiDoldu ? ' · süresi doldu' : ` · ${hero.konu.bitisTarihi} tarihine kadar`}
                </p>
              </div>
            </div>
          </Link>
        ) : (
          <Link to={`/haber/${heroHaber.id}`} className="block">
            <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
              {heroGorsel ? (
                <img src={heroGorsel} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-kagit text-4xl opacity-40">📰</div>
              )}
              {/* Koyu, geniş bir zemin — arka plandaki görsel ne olursa olsun
                  başlık okunur kalsın diye gradyan güçlendirildi ve metne ayrıca
                  gölge eklendi. */}
              <div className="absolute inset-0 bg-gradient-to-t from-murekkep from-15% via-murekkep/70 via-45% to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                <p className="text-[11px] font-medium uppercase tracking-widest text-kagit drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  {KATEGORI_ETIKETI[heroHaber.kategori] || '📰 Haber'}
                  {heroHaber.oneCikan && <span className="ml-1.5">⭐ Öne Çıkan</span>}
                </p>
                <h2 className="mt-1 font-baslik text-xl leading-snug text-kagit drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] sm:text-2xl">
                  {heroHaber.baslik}
                </h2>
                {ozet && (
                  <p className="mt-1.5 hidden text-sm text-kagit/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] sm:block">{ozet}</p>
                )}
              </div>
            </div>
          </Link>
        )}
        <Link
          to="/haberler"
          className="absolute right-3 top-3 z-10 rounded-full bg-murekkep/70 px-3 py-1 text-xs text-kagit ring-1 ring-kagit/30 backdrop-blur hover:bg-murekkep/90"
        >
          Tüm Haberler →
        </Link>
      </div>

      {ogeler.length > 1 && (
        <div className="flex items-center gap-2 border-t border-cizgi p-3">
          <button
            onClick={() => seritKaydir(-1)}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-kagit text-xs text-kraft ring-1 ring-cizgi hover:text-deniz sm:flex"
            aria-label="Önceki"
          >
            ‹
          </button>
          <div ref={seritRef} className="flex flex-1 gap-2 overflow-x-auto scroll-smooth pb-1">
            {ogeler.map((o, i) => {
              const secili = i === aktifIndeks
              if (o.tip === 'dusunce') {
                return (
                  <button
                    key={o.id}
                    onClick={() => setAktifIndeks(i)}
                    className={`shrink-0 overflow-hidden rounded-sm ring-1 transition ${
                      secili ? 'ring-2 ring-gise' : 'ring-cizgi opacity-80 hover:opacity-100'
                    }`}
                    style={{ width: 96 }}
                    title={o.konu.konu}
                  >
                    <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-kraft/25 to-gise/20 text-lg">
                      💭
                    </div>
                  </button>
                )
              }
              const gorsel = o.gorselUrl || o.ilgiliPosterUrl
              return (
                <button
                  key={o.id}
                  onClick={() => setAktifIndeks(i)}
                  className={`shrink-0 overflow-hidden rounded-sm ring-1 transition ${
                    secili ? 'ring-2 ring-gise' : 'ring-cizgi opacity-80 hover:opacity-100'
                  }`}
                  style={{ width: 96 }}
                  title={o.baslik}
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

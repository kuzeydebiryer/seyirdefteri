import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w342'
const OMDB_API_KEY = import.meta.env.VITE_OMDB_API_KEY

const ULKELER = [
  { kod: '', ad: 'Tümü' },
  { kod: 'TR', ad: 'Türkiye' },
  { kod: 'US', ad: 'ABD' },
  { kod: 'GB', ad: 'İngiltere' },
  { kod: 'FR', ad: 'Fransa' },
  { kod: 'DE', ad: 'Almanya' },
  { kod: 'IT', ad: 'İtalya' },
  { kod: 'ES', ad: 'İspanya' },
  { kod: 'JP', ad: 'Japonya' },
  { kod: 'KR', ad: 'Güney Kore' },
]

const SIRALAMALAR = [
  { deger: 'popularity.desc', etiket: 'Popülerlik' },
  { deger: 'vote_average.desc', etiket: 'Puan (yüksekten)' },
  { deger: 'primary_release_date.desc', etiket: 'Tarih (yeniden)' },
  { deger: 'vote_count.desc', etiket: 'Oy sayısı' },
]

export default function FilmDiziArama({ tur, sabitPlatformId }) {
  const uc = tur === 'sinema' ? 'movie' : 'tv'
  // Filtreler ve sonuçlar URL'e senkronize ediliyor (query string) — önceden
  // sadece bileşenin kendi state'indeydi, bir filme/diziye girip "geri"ye
  // basınca bileşen sıfırdan kurulup her şey sıfırlanıyordu (tarayıcı "geri"
  // AYNI URL'ye döner ama URL'de hiçbir filtre bilgisi olmadığı için
  // kurtaracak bir şey yoktu). Şimdi ilk değerler URL'den okunuyor,
  // "Uygula"ya her basıldığında da URL güncelleniyor — geri dönüş, filtreleri
  // olduğu gibi geri getiriyor. Sayfa derinliği ("Daha Fazla Yükle" ile
  // inilen nokta) kasıtlı olarak senkronize edilmiyor — dönüşte 1. sayfadan
  // başlıyor, ama en azından hangi filtrelerle arandığı kayboldu.
  const [aramaParametreleri, setAramaParametreleri] = useSearchParams()

  // Platform sayfasında (sabitPlatformId verilmişse) "İsimle Ara" modu
  // anlamsız — TMDB'nin arama uç noktası with_watch_providers'ı
  // desteklemiyor, yani isimle arasak sonuçlar platformdan bağımsız
  // çıkardı. Bu yüzden platform sayfasında doğrudan "Filtrele" moduna
  // (discover — bu, with_watch_providers'ı destekliyor) sabitleniyor ve
  // sayfa açılır açılmaz otomatik ilk sonuçlar getiriliyor.
  const [mod, setMod] = useState(sabitPlatformId ? 'filtrele' : aramaParametreleri.get('mod') || 'ara')

  const [arama, setArama] = useState(aramaParametreleri.get('q') || '')
  const [sonuclar, setSonuclar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [aramaYapildi, setAramaYapildi] = useState(false)

  const [turler, setTurler] = useState([])
  const [seciliTur, setSeciliTur] = useState(aramaParametreleri.get('tur') || '')
  const [yilBaslangic, setYilBaslangic] = useState(aramaParametreleri.get('yilMin') || '')
  const [yilBitis, setYilBitis] = useState(aramaParametreleri.get('yilMaks') || '')
  const [minPuan, setMinPuan] = useState(aramaParametreleri.get('puanMin') || '')
  const [minImdbPuan, setMinImdbPuan] = useState(aramaParametreleri.get('imdbMin') || '')
  const [zenginlesiyor, setZenginlesiyor] = useState(false)
  const [ulke, setUlke] = useState(aramaParametreleri.get('ulke') || '')
  const [siralama, setSiralama] = useState(aramaParametreleri.get('sirala') || 'popularity.desc')
  const [sayfa, setSayfa] = useState(1)
  const [toplamSayfa, setToplamSayfa] = useState(1)
  const [dahaFazlaYukleniyor, setDahaFazlaYukleniyor] = useState(false)

  useEffect(() => {
    if (!TMDB_API_KEY) return
    fetch(`https://api.themoviedb.org/3/genre/${uc}/list?api_key=${TMDB_API_KEY}&language=tr-TR`)
      .then((res) => res.json())
      .then((data) => setTurler(data.genres || []))
      .catch(() => {})
  }, [uc])

  // İlk açılışta — ya platform sayfasıysa (her zaman), ya da URL'de zaten
  // bir arama/filtre varsa (bir sonuçtan geri dönülmüşse) — otomatik olarak
  // önceki aramayı/filtreyi tekrar çalıştırıyor. "Uygula"ya/Ara'ya basmadan
  // boş bir ekranla karşılaşmasın.
  useEffect(() => {
    const urlSayfa = parseInt(aramaParametreleri.get('sayfa') || '1', 10)
    if (sabitPlatformId) {
      if (urlSayfa > 1) hepsiniGeriYukle(urlSayfa)
      else filtreUygula()
    } else if (mod === 'filtrele' && aramaParametreleri.get('mod') === 'filtrele') {
      if (urlSayfa > 1) hepsiniGeriYukle(urlSayfa)
      else filtreUygula()
    } else if (mod === 'ara' && aramaParametreleri.get('q')) {
      isimleAra()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sabitPlatformId, uc])

  async function isimleAra(e) {
    e?.preventDefault()
    if (!arama.trim() || !TMDB_API_KEY) return
    setYukleniyor(true)
    setAramaYapildi(true)
    setAramaParametreleri((onceki) => {
      const guncel = new URLSearchParams(onceki)
      guncel.set('mod', 'ara')
      guncel.set('q', arama)
      return guncel
    })
    try {
      const url = `https://api.themoviedb.org/3/search/${uc}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(arama)}`
      const res = await fetch(url)
      const data = await res.json()
      setSonuclar(data.results || [])
    } finally {
      setYukleniyor(false)
    }
  }

  // OMDb'nin bir "keşfet/filtrele" uç noktası yok — sadece tek tek IMDb ID
  // ile sorgulanabiliyor. Bu yüzden TMDB'nin getirdiği TEK SAYFAYI (en fazla
  // 20 öğe) tek tek zenginleştirip client-side filtreliyoruz; TMDB'nin tüm
  // kataloğunu IMDb puanına göre taramak mümkün değil. Kullanıcı "Daha Fazla
  // Yükle" dedikçe bir sonraki sayfa da aynı şekilde taranıp mevcut listeye
  // ekleniyor — OMDb'nin günlük 1000 istek kotasını tek seferde tüketmemek
  // için tarama derinliği kullanıcının kendi hızında ilerliyor.
  // Platform sayfalarında (sabitPlatformId) bu fonksiyon hiç çağrılmıyor —
  // "Daha Fazla Yükle" ile hızlı art arda derinleşen bir gezinme burada,
  // OMDb'nin paylaşılan günlük kotasını (film/dizi sayfalarındaki "Dış
  // Puanlar" widget'ıyla ortak) hızla tüketirdi. Genel Film/Dizi keşfet
  // sayfalarında (tek seferlik, sığ arama) IMDb filtresi olduğu gibi kalıyor.
  async function omdbIleZenginlestirVeFiltrele(liste) {
    if (sabitPlatformId || !minImdbPuan || !OMDB_API_KEY) return liste
    setZenginlesiyor(true)
    try {
      const esikDeger = parseFloat(minImdbPuan)
      const zenginlesmis = await Promise.all(
        liste.map(async (item) => {
          try {
            const extRes = await fetch(`https://api.themoviedb.org/3/${uc}/${item.id}/external_ids?api_key=${TMDB_API_KEY}`)
            const ext = await extRes.json()
            if (!ext.imdb_id) return { ...item, imdbPuan: null }
            const omdbRes = await fetch(`https://www.omdbapi.com/?i=${ext.imdb_id}&apikey=${OMDB_API_KEY}`)
            const omdb = await omdbRes.json()
            const puan = omdb.imdbRating && omdb.imdbRating !== 'N/A' ? parseFloat(omdb.imdbRating) : null
            return { ...item, imdbPuan: puan }
          } catch {
            return { ...item, imdbPuan: null }
          }
        })
      )
      return zenginlesmis.filter((it) => it.imdbPuan != null && it.imdbPuan >= esikDeger)
    } finally {
      setZenginlesiyor(false)
    }
  }

  async function tekSayfaGetir(hedefSayfa) {
    const tarihAlani = tur === 'sinema' ? 'primary_release_date' : 'first_air_date'
    const parcalar = [`api_key=${TMDB_API_KEY}`, 'language=tr-TR', `sort_by=${siralama}`, `page=${hedefSayfa}`]
    if (seciliTur) parcalar.push(`with_genres=${seciliTur}`)
    if (yilBaslangic) parcalar.push(`${tarihAlani}.gte=${yilBaslangic}-01-01`)
    if (yilBitis) parcalar.push(`${tarihAlani}.lte=${yilBitis}-12-31`)
    if (minPuan) parcalar.push(`vote_average.gte=${minPuan}`, 'vote_count.gte=20')
    if (ulke) parcalar.push(`with_origin_country=${ulke}`)
    if (sabitPlatformId) parcalar.push(`with_watch_providers=${sabitPlatformId}`, 'watch_region=TR', 'with_watch_monetization_types=flatrate')
    const url = `https://api.themoviedb.org/3/discover/${uc}?${parcalar.join('&')}`
    const res = await fetch(url)
    const data = await res.json()
    const sonuc = await omdbIleZenginlestirVeFiltrele(data.results || [])
    return { sonuc, toplamSayfa: Math.min(data.total_pages || 1, 500) } // TMDB'nin kendi üst sınırı 500 sayfa
  }

  async function filtreUygula(e, ekleModuMu = false) {
    e?.preventDefault()
    if (!TMDB_API_KEY) return
    const hedefSayfa = ekleModuMu ? sayfa + 1 : 1
    if (ekleModuMu) setDahaFazlaYukleniyor(true)
    else {
      setYukleniyor(true)
      setSonuclar([])
      // Sadece gerçek "Uygula" anında URL'i güncelliyoruz — her tuşa
      // basışta değil, sadece arama gerçekten çalıştırıldığında. Mevcut TÜM
      // parametrelerden (platform sayfasındaki "ad"/"sekme" gibi, bu
      // bileşenin bilmediği/dokunmaması gereken alanlar dahil) başlayıp
      // sadece kendi filtre alanlarımızı güncelliyoruz/temizliyoruz — aksi
      // halde PlatformDetay'in yazdığı "sekme" parametresi burada
      // sessizce silinirdi.
      const guncelParametreler = new URLSearchParams(aramaParametreleri)
      if (!sabitPlatformId) guncelParametreler.set('mod', 'filtrele')
      const ayarla = (anahtar, deger) => {
        if (deger) guncelParametreler.set(anahtar, deger)
        else guncelParametreler.delete(anahtar)
      }
      ayarla('tur', seciliTur)
      ayarla('ulke', ulke)
      ayarla('yilMin', yilBaslangic)
      ayarla('yilMaks', yilBitis)
      ayarla('puanMin', minPuan)
      ayarla('imdbMin', minImdbPuan)
      ayarla('sirala', siralama !== 'popularity.desc' ? siralama : '')
      // Yeni bir arama — önceki "Daha Fazla Yükle" derinliği artık geçersiz.
      guncelParametreler.delete('sayfa')
      setAramaParametreleri(guncelParametreler)
    }
    setAramaYapildi(true)
    try {
      const { sonuc, toplamSayfa: yeniToplamSayfa } = await tekSayfaGetir(hedefSayfa)
      setSonuclar((mevcut) => (ekleModuMu ? [...mevcut, ...sonuc] : sonuc))
      setSayfa(hedefSayfa)
      setToplamSayfa(yeniToplamSayfa)
      // "Daha Fazla Yükle" ile inilen derinliği de URL'e yazıyoruz — bir
      // filme/diziye girip "geri" dönüldüğünde, kaldığın noktaya kadar
      // otomatik olarak yeniden yüklensin diye (bkz. hepsiniGeriYukle).
      if (ekleModuMu) {
        const guncel = new URLSearchParams(aramaParametreleri)
        guncel.set('sayfa', String(hedefSayfa))
        setAramaParametreleri(guncel, { replace: true })
      }
    } finally {
      setYukleniyor(false)
      setDahaFazlaYukleniyor(false)
    }
  }

  // Geri dönüşte URL'de sayfa=N varsa (kullanıcı N kez "Daha Fazla Yükle"
  // demişti), 1'den N'e kadar TÜM sayfaları sırayla çekip tek seferde
  // birleştiriyor — böylece kaldığı noktaya, tek tek "Daha Fazla Yükle"ye
  // basmadan otomatik olarak geri dönüyor.
  async function hepsiniGeriYukle(hedefSayfa) {
    setYukleniyor(true)
    setAramaYapildi(true)
    try {
      let birlesikSonuclar = []
      let sonToplamSayfa = 1
      for (let s = 1; s <= hedefSayfa; s++) {
        const { sonuc, toplamSayfa: t } = await tekSayfaGetir(s)
        birlesikSonuclar = [...birlesikSonuclar, ...sonuc]
        sonToplamSayfa = t
        setSonuclar(birlesikSonuclar)
      }
      setSayfa(hedefSayfa)
      setToplamSayfa(sonToplamSayfa)
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <div className="mb-10 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      {!sabitPlatformId && (
        <div className="mb-3 flex gap-2">
          <button
            onClick={() => setMod('ara')}
            className={`rounded-sm px-3 py-1 font-govde text-xs ${mod === 'ara' ? 'bg-murekkep text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
          >
            İsimle Ara
          </button>
          <button
            onClick={() => setMod('filtrele')}
            className={`rounded-sm px-3 py-1 font-govde text-xs ${mod === 'filtrele' ? 'bg-murekkep text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
          >
            Filtrele
          </button>
        </div>
      )}

      {mod === 'ara' ? (
        <form onSubmit={isimleAra} className="flex gap-2">
          <input
            type="text"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder={tur === 'sinema' ? 'Film adı ara...' : 'Dizi adı ara...'}
            aria-label={tur === 'sinema' ? 'Film adı ara' : 'Dizi adı ara'}
            className="flex-1 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
          <button type="submit" className="rounded-sm bg-deniz px-4 py-2 font-govde text-xs text-kagit">
            {yukleniyor ? 'Aranıyor...' : 'Ara'}
          </button>
        </form>
      ) : (
        <form onSubmit={filtreUygula} className="space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select value={seciliTur} onChange={(e) => setSeciliTur(e.target.value)} className="rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi">
              <option value="">Tür (tümü)</option>
              {turler.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select value={ulke} onChange={(e) => setUlke(e.target.value)} className="rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi">
              {ULKELER.map((u) => (
                <option key={u.kod} value={u.kod}>
                  {u.ad}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={yilBaslangic}
              onChange={(e) => setYilBaslangic(e.target.value)}
              placeholder="Yıl (min)"
              aria-label="Başlangıç yılı"
              className="rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
            />
            <input
              type="number"
              value={yilBitis}
              onChange={(e) => setYilBitis(e.target.value)}
              placeholder="Yıl (max)"
              aria-label="Bitiş yılı"
              className="rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
            />
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={minPuan}
              onChange={(e) => setMinPuan(e.target.value)}
              placeholder="Min TMDB puanı"
              aria-label="Minimum TMDB puanı"
              className="rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
            />
            {OMDB_API_KEY && !sabitPlatformId && (
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={minImdbPuan}
                onChange={(e) => setMinImdbPuan(e.target.value)}
                placeholder="Min IMDb puanı"
                aria-label="Minimum IMDb puanı"
                className="rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
              />
            )}
            <select value={siralama} onChange={(e) => setSiralama(e.target.value)} className="rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi">
              {SIRALAMALAR.map((s) => (
                <option key={s.deger} value={s.deger}>
                  {s.etiket}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-kraft">
            Not: TMDB puanı kendi kullanıcı puanı (IMDb değil).
            {OMDB_API_KEY &&
              !sabitPlatformId &&
              ' IMDb puanı filtresi, o an yüklü olan sonuçlara uygulanır (TMDB\'nin tüm kataloğuna değil) — az sonuç çıkarsa "Daha Fazla Yükle" ile taramayı derinleştirebilirsin.'}
          </p>
          <button type="submit" className="rounded-sm bg-deniz px-4 py-2 font-govde text-xs text-kagit">
            {yukleniyor ? (zenginlesiyor ? 'IMDb puanları kontrol ediliyor...' : 'Filtreleniyor...') : 'Uygula'}
          </button>
        </form>
      )}

      {aramaYapildi && (
        <div className="mt-4">
          {sonuclar.length === 0 && !yukleniyor && <p className="text-sm text-kraft">Sonuç bulunamadı.</p>}
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {sonuclar.map((item) => (
              <Link key={item.id} to={`/${uc === 'movie' ? 'film' : 'dizi'}/${item.id}`} className="block">
                <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                  {item.poster_path && (
                    <img
                      src={`${TMDB_POSTER}${item.poster_path}`}
                      alt={item.title || item.name}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-murekkep">{item.title || item.name}</p>
                {item.imdbPuan != null && <p className="text-[10px] text-kraft">IMDb {item.imdbPuan}</p>}
              </Link>
            ))}
          </div>
          {sonuclar.length > 0 && sayfa < toplamSayfa && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={(e) => filtreUygula(e, true)}
                disabled={dahaFazlaYukleniyor}
                className="rounded-full bg-kagit px-4 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi disabled:opacity-40"
              >
                {dahaFazlaYukleniyor ? (zenginlesiyor ? 'IMDb puanları kontrol ediliyor...' : 'Yükleniyor...') : 'Daha Fazla Yükle'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

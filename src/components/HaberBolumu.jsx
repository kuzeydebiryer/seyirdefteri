import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { haberEkle } from '../utils/haber.js'
import { eserReferanslariniBul, onizlemeMetniCikar } from '../utils/icerikAyristir.js'
import EserSecici from './EserSecici.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w185'
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

const ESER_KATEGORILERI = [
  { id: 'sinema', etiket: 'Film' },
  { id: 'dizi', etiket: 'Dizi' },
  { id: 'kitap', etiket: 'Kitap' },
]

function tarihGoster(deger) {
  if (!deger) return ''
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  if (isNaN(d.getTime())) return ''
  const bugun = new Date()
  const ayniGun = d.toDateString() === bugun.toDateString()
  if (ayniGun) return `Bugün ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function youtubeIdCikar(girdi) {
  if (!girdi) return ''
  const temiz = girdi.trim()
  const eslesme = temiz.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  if (eslesme) return eslesme[1]
  if (/^[a-zA-Z0-9_-]{11}$/.test(temiz)) return temiz
  return temiz
}


function HaberSatiri({ haber, kullanici }) {
  const kucukGorsel = haber.gorselUrl || haber.ilgiliPosterUrl

  return (
    <li className="rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
      <Link to={`/haber/${haber.id}`} className="flex w-full gap-3 p-3 text-left">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi sm:h-20 sm:w-28">
          {kucukGorsel ? (
            <img src={kucukGorsel} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg text-kraft">📰</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-govde text-sm font-medium text-murekkep line-clamp-2">
            {haber.oneCikan && <span title="Öne çıkan">⭐ </span>}
            {haber.baslik}
          </p>
          {haber.icerik && <p className="mt-0.5 line-clamp-1 text-xs text-kraft">{onizlemeMetniCikar(haber.icerik)}</p>}
          <p className="mt-1 text-[11px] text-kraft">
            {haber.ekleyenAdi} · {tarihGoster(haber.tarih)}
            {haber.begenenler?.length > 0 && <> · ♥ {haber.begenenler.length}</>}
          </p>
        </div>
      </Link>
    </li>
  )
}

// kategori: sabit tek kategori (Filmler/Diziler/Oyuncular/KitaplarKesfet'te
// olduğu gibi — o sayfada eklenen her haber otomatik o kategoriden sayılır).
// kategoriSecenekleri: bunun yerine (ör. /haberler hub'ında) bir kategori
// SEÇİCİSİ gösterilsin istiyorsak — [{id, etiket}] listesi.
// listeGizli: true ise bu bileşen sadece "+ Haber Ekle" formunu render eder,
// kendi liste/sayfalama UI'ını göstermez (hub sayfası zaten kendi listesini
// ayrıca çiziyor, iki kez göstermeyelim diye).
export default function HaberBolumu({
  kategori,
  kategoriSecenekleri,
  listeGizli = false,
  haberler,
  yenidenYukle,
  hepsiYuklendiMi = true,
  dahaFazlaYukleniyor = false,
  dahaFazlaYukle,
}) {
  const { kullanici, profil } = useAuth()
  const [formuAcik, setFormuAcik] = useState(false)
  const [secilenKategori, setSecilenKategori] = useState(kategori || kategoriSecenekleri?.[0]?.id)
  const aktifKategori = kategori || secilenKategori
  const [baslik, setBaslik] = useState('')
  const [icerik, setIcerik] = useState('')
  const [gorselUrl, setGorselUrl] = useState('')
  const [fragmanGirdi, setFragmanGirdi] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const [eserFormuAcik, setEserFormuAcik] = useState(false)
  const [eserKategori, setEserKategori] = useState(aktifKategori === 'dizi' ? 'dizi' : 'sinema')
  const [eserArama, setEserArama] = useState('')
  const [eserSonuclari, setEserSonuclari] = useState([])
  const [secilenEser, setSecilenEser] = useState(null)

  // İçeriğe gömülü film/dizi/kitap/oyuncu şeridi — GonderiEkle'deki "Eser
  // Ekle" akışının aynısı (bkz. icerikAyristir.js @@eser: bloğu), böylece
  // Bugünün Düşüncesi'ndeki gibi haber metninin içine de "en iyi 10 film"
  // tarzı bir liste/şerit eklenebiliyor.
  const [gomuluEserAcik, setGomuluEserAcik] = useState(false)
  const [gomuluEserKategori, setGomuluEserKategori] = useState('Film')
  const [gomuluEserDuzeni, setGomuluEserDuzeni] = useState('yatay')
  const icerikRef = useRef(null)

  function imlecKonumunaMetinEkle(eklenecek) {
    const ta = icerikRef.current
    const imlecKonumu = ta ? ta.selectionStart : icerik.length
    const eklenecekBlok = `\n\n${eklenecek}\n\n`
    const yeniMetin = icerik.slice(0, imlecKonumu) + eklenecekBlok + icerik.slice(imlecKonumu)
    setIcerik(yeniMetin)
    const yeniKonum = imlecKonumu + eklenecekBlok.length
    setTimeout(() => {
      if (ta) {
        ta.focus()
        ta.setSelectionRange(yeniKonum, yeniKonum)
      }
    }, 0)
  }

  function gomuluEserEklendi(secim) {
    imlecKonumunaMetinEkle(`@@eser:${JSON.stringify({ ...secim, duzen: gomuluEserDuzeni })}`)
    // Popover'ı bilerek kapatmıyoruz — art arda birkaç eser eklemek bir liste
    // oluştururken çok daha az tıklama gerektiriyor.
  }

  const gomuluEserler = useMemo(() => eserReferanslariniBul(icerik), [icerik])

  function gomuluEseriKaldir(indeks) {
    const hedef = gomuluEserler[indeks]
    if (!hedef) return
    setIcerik((icerik.slice(0, hedef.index) + icerik.slice(hedef.index + hedef.tamMetin.length)).replace(/\n{3,}/g, '\n\n'))
  }

  function gomuluEseriTasi(indeks, yon) {
    const hedefIndeks = indeks + yon
    const a = gomuluEserler[indeks]
    const b = gomuluEserler[hedefIndeks]
    if (!a || !b) return
    const [ilk, ikinci] = a.index < b.index ? [a, b] : [b, a]
    setIcerik(
      icerik.slice(0, ilk.index) +
        ikinci.tamMetin +
        icerik.slice(ilk.index + ilk.tamMetin.length, ikinci.index) +
        ilk.tamMetin +
        icerik.slice(ikinci.index + ikinci.tamMetin.length)
    )
  }

  async function eserAra(e) {
    e.preventDefault()
    if (!eserArama.trim()) return
    if (eserKategori === 'kitap') {
      const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(eserArama)}&maxResults=10${anahtarParcasi}`
      const res = await fetch(url)
      const data = await res.json()
      setEserSonuclari(data.items || [])
      return
    }
    if (!TMDB_API_KEY) return
    const uc = eserKategori === 'sinema' ? 'movie' : 'tv'
    const url = `https://api.themoviedb.org/3/search/${uc}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(eserArama)}`
    const res = await fetch(url)
    const data = await res.json()
    setEserSonuclari(data.results || [])
  }

  function eserSec(item) {
    if (eserKategori === 'kitap') {
      const v = item.volumeInfo || {}
      setSecilenEser({
        tur: 'kitap',
        disId: item.id,
        baslik: v.title || '',
        posterUrl: (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://'),
      })
    } else {
      setSecilenEser({
        tur: eserKategori,
        disId: item.id,
        baslik: eserKategori === 'sinema' ? item.title : item.name,
        posterUrl: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '',
      })
    }
    setEserSonuclari([])
    setEserArama('')
    setEserFormuAcik(false)
  }

  async function gonder(e) {
    e.preventDefault()
    if (!baslik.trim() || !kullanici) return
    setKaydediliyor(true)
    try {
      const yoneticiMi = profil?.yonetici === true
      await haberEkle({
        kategori: aktifKategori,
        baslik: baslik.trim(),
        icerik,
        gorselUrl,
        fragmanId: youtubeIdCikar(fragmanGirdi),
        ilgiliTur: secilenEser?.tur,
        ilgiliDisId: secilenEser?.disId,
        ilgiliBaslik: secilenEser?.baslik,
        ilgiliPosterUrl: secilenEser?.posterUrl,
        kullanici,
        yoneticiMi,
      })
      setBaslik('')
      setIcerik('')
      setGorselUrl('')
      setFragmanGirdi('')
      setSecilenEser(null)
      setGomuluEserAcik(false)
      setFormuAcik(false)
      if (kategoriSecenekleri) setSecilenKategori(kategoriSecenekleri[0]?.id)
      if (yoneticiMi) yenidenYukle()
      else window.alert('Haberin eklendi — yönetici onayından sonra yayına girecek.')
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <div className={listeGizli ? '' : 'mb-10'}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {!listeGizli && <h2 className="font-baslik text-lg text-murekkep">Haberler</h2>}
        <div className="flex items-center gap-3">
          {!listeGizli && (
            <Link to={`/haberler?kategori=${aktifKategori}`} className="shrink-0 whitespace-nowrap text-sm text-kraft hover:text-deniz">
              Tümünü Gör ›
            </Link>
          )}
          {kullanici && (
            <button
              onClick={() => setFormuAcik((a) => !a)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 font-govde text-xs ${formuAcik ? 'bg-kagitKoyu text-kraft ring-1 ring-cizgi' : 'bg-gise text-kagit'}`}
            >
              {formuAcik ? 'Vazgeç' : '+ Haber Ekle'}
            </button>
          )}
        </div>
      </div>

      {formuAcik && (
        <form onSubmit={gonder} className="mb-4 space-y-3 rounded-sm bg-kagitKoyu p-5 ring-1 ring-cizgi max-w-2xl">
          {kategoriSecenekleri && (
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-kraft mb-1">Kategori</label>
              <div className="flex flex-wrap gap-1.5">
                {kategoriSecenekleri.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setSecilenKategori(k.id)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      secilenKategori === k.id ? 'bg-deniz text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'
                    }`}
                  >
                    {k.etiket}
                  </button>
                ))}
              </div>
            </div>
          )}
          <input
            type="text"
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            required
            placeholder="Haber başlığı"
            className="w-full rounded-sm bg-kagit px-3 py-2.5 text-base text-murekkep ring-1 ring-cizgi"
          />
          <textarea
            ref={icerikRef}
            value={icerik}
            onChange={(e) => setIcerik(e.target.value)}
            rows={4}
            placeholder="Kısa içerik (opsiyonel)"
            className="w-full rounded-sm bg-kagit px-3 py-2.5 text-sm text-murekkep ring-1 ring-cizgi"
          />

          <div>
            <button
              type="button"
              onClick={() => setGomuluEserAcik((a) => !a)}
              className="rounded-sm bg-kagit px-3 py-1 font-govde text-xs text-kraft ring-1 ring-cizgi hover:ring-deniz/50"
            >
              🎬📚 İçeriğe Film/Dizi/Kitap Şeridi Ekle
            </button>

            {gomuluEserAcik && (
              <div className="mt-2 rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {['Film', 'Dizi', 'Kitap', 'Oyuncu'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setGomuluEserKategori(k)}
                      className={`rounded-full px-2.5 py-1 text-[11px] ${
                        gomuluEserKategori === k ? 'bg-gise text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setGomuluEserAcik(false)}
                    className="ml-auto rounded-full px-2.5 py-1 text-[11px] text-kraft hover:text-muhur"
                  >
                    ✕ Kapat
                  </button>
                </div>
                <div className="mb-2 flex items-center gap-2 text-[11px] text-kraft">
                  <span>2+ eser eklersen görünüm:</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setGomuluEserDuzeni('yatay')}
                      className={`rounded-full px-2 py-0.5 ${
                        gomuluEserDuzeni === 'yatay' ? 'bg-gise text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
                      }`}
                    >
                      ↔ Şerit
                    </button>
                    <button
                      type="button"
                      onClick={() => setGomuluEserDuzeni('dikey')}
                      className={`rounded-full px-2 py-0.5 ${
                        gomuluEserDuzeni === 'dikey' ? 'bg-gise text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
                      }`}
                    >
                      ☰ Liste
                    </button>
                  </div>
                </div>
                <EserSecici kategori={gomuluEserKategori} secili={null} onSecim={gomuluEserEklendi} onTemizle={() => {}} />
                <p className="mt-2 text-[11px] text-kraft">
                  Seçtiğin her eser içeriğin içine eklenir — "en iyi 10 film" gibi bir liste için sırayla birden fazla ekleyebilirsin.
                </p>
              </div>
            )}

            {gomuluEserler.length > 0 && (
              <div className="mt-2 rounded-sm bg-kagit p-2.5 ring-1 ring-cizgi">
                <p className="mb-1.5 text-[11px] text-kraft">
                  İçeriğe eklenen eserler ({gomuluEserler.length}) — sırayı değiştirebilir ya da çıkarabilirsin:
                </p>
                <ul className="space-y-1">
                  {gomuluEserler.map((oge, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-sm bg-kagitKoyu px-2 py-1">
                      <div className="h-8 w-6 shrink-0 overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                        {oge.veri.posterUrl && <img src={oge.veri.posterUrl} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-xs text-murekkep">{oge.veri.baslik}</span>
                      <button
                        type="button"
                        onClick={() => gomuluEseriTasi(i, -1)}
                        disabled={i === 0}
                        className="text-xs text-kraft hover:text-deniz disabled:opacity-30"
                        title="Yukarı taşı"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => gomuluEseriTasi(i, 1)}
                        disabled={i === gomuluEserler.length - 1}
                        className="text-xs text-kraft hover:text-deniz disabled:opacity-30"
                        title="Aşağı taşı"
                      >
                        ▼
                      </button>
                      <button type="button" onClick={() => gomuluEseriKaldir(i)} className="text-xs text-kraft hover:text-muhur" title="Kaldır">
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-kraft mb-1">Görsel URL (opsiyonel)</label>
              <input
                type="text"
                value={gorselUrl}
                onChange={(e) => setGorselUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-kraft mb-1">
                Fragman linki/ID (opsiyonel)
              </label>
              <input
                type="text"
                value={fragmanGirdi}
                onChange={(e) => setFragmanGirdi(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-kraft mb-1">
              İlgili Film/Dizi/Kitap Kartı (opsiyonel)
            </label>
            {secilenEser ? (
              <div className="flex items-center gap-3 rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
                {secilenEser.posterUrl && <img src={secilenEser.posterUrl} alt="" className="h-16 w-11 rounded-sm object-cover" />}
                <p className="flex-1 text-sm text-murekkep">{secilenEser.baslik}</p>
                <button type="button" onClick={() => setSecilenEser(null)} className="text-xs text-kraft hover:text-muhur">
                  Kaldır
                </button>
              </div>
            ) : eserFormuAcik ? (
              <div className="space-y-2 rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
                <div className="flex gap-2">
                  {ESER_KATEGORILERI.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => {
                        setEserKategori(k.id)
                        setEserSonuclari([])
                      }}
                      className={`rounded-sm px-3 py-1 text-xs ${eserKategori === k.id ? 'bg-deniz text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'}`}
                    >
                      {k.etiket}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={eserArama}
                    onChange={(e) => setEserArama(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        eserAra(e)
                      }
                    }}
                    placeholder="Ara..."
                    className="flex-1 rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                  />
                  <button onClick={eserAra} type="button" className="rounded-sm bg-deniz px-3 py-2 text-xs text-kagit">
                    Ara
                  </button>
                </div>
                {eserSonuclari.length > 0 && (
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
                    {eserSonuclari.slice(0, 14).map((item) => {
                      const gorselVeAd =
                        eserKategori === 'kitap'
                          ? {
                              url: (item.volumeInfo?.imageLinks?.thumbnail || '').replace('http://', 'https://'),
                              ad: item.volumeInfo?.title,
                            }
                          : { url: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '', ad: item.title || item.name }
                      return (
                        <button key={item.id} type="button" onClick={() => eserSec(item)} className="text-left">
                          <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                            {gorselVeAd.url && <img src={gorselVeAd.url} alt="" className="h-full w-full object-cover" />}
                          </div>
                          <p className="mt-1 truncate text-[10px] text-murekkep">{gorselVeAd.ad}</p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEserFormuAcik(true)}
                className="rounded-sm bg-kagit px-3 py-1.5 text-xs text-kraft ring-1 ring-cizgi"
              >
                + Film/Dizi/Kitap Ekle
              </button>
            )}
          </div>

          {!profil?.yonetici && (
            <p className="text-[11px] text-kraft">Eklediğin haber yönetici onayından sonra yayına girer.</p>
          )}

          <button
            type="submit"
            disabled={kaydediliyor}
            className="rounded-sm bg-muhur px-5 py-2 font-govde text-sm text-kagit disabled:opacity-40"
          >
            {kaydediliyor ? 'Ekleniyor...' : 'Paylaş'}
          </button>
        </form>
      )}

      {!listeGizli &&
        (haberler.length === 0 ? (
          <p className="text-sm text-kraft">Henüz haber yok.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {haberler.map((h) => (
                <HaberSatiri key={h.id} haber={h} kullanici={kullanici} />
              ))}
            </ul>
            {!hepsiYuklendiMi && (
              <button
                onClick={dahaFazlaYukle}
                disabled={dahaFazlaYukleniyor}
                className="mt-3 rounded-sm bg-kagitKoyu px-4 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi hover:text-murekkep disabled:opacity-40"
              >
                {dahaFazlaYukleniyor ? 'Yükleniyor...' : 'Daha Fazla Haber Göster'}
              </button>
            )}
          </>
        ))}
    </div>
  )
}

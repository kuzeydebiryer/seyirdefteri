import { useEffect, useState } from 'react'
import GorselYukleButonu from './GorselYukleButonu.jsx'
import MedyaGomulusu from './MedyaGomulusu.jsx'
import FilmMuzigiWidget from './FilmMuzigiWidget.jsx'
import {
  VIDEO_MAKS_MB,
  linkCoz,
  linkHatasi,
  medyaBaslikGuncelle,
  medyaEkle,
  medyaSil,
  tmdbKareleriGetir,
  tmdbVideolariGetir,
  videoGomuGetir,
  videoYukle,
} from '../utils/incelemeMedya.js'

// İnceleme Defteri "Medya Kutusu": filmden kareler, kesit videoları, müzik ve sosyal medya
// paylaşımları. Sekmeler halinde; hepsi etkinliğin topluluk üyelerine açık, düzenleme/silme
// yalnızca ekleyen kişiye (kurallar da denetler). Kareler ve videolar Tartışma Modu'nda ve
// Kulüp Özeti'nde de görünür.

const SEKMELER = [
  { id: 'kare', etiket: '🖼️ Kareler' },
  { id: 'video', etiket: '🎬 Kesitler' },
  { id: 'muzik', etiket: '🎵 Müzik' },
  { id: 'sosyal', etiket: '📣 Paylaşımlar' },
]

// Tıklayınca yüklenen YouTube oynatıcı (sayfa ağır iframe'lerle şişmesin).
function YoutubeOynatici({ id, baslangic = 0, baslik }) {
  const [oynat, setOynat] = useState(false)
  if (oynat) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-sm bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&start=${baslangic}`}
          title={baslik || 'YouTube'}
          className="h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    )
  }
  return (
    <button type="button" onClick={() => setOynat(true)} className="group relative block aspect-video w-full overflow-hidden rounded-sm bg-black">
      <img src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt={baslik || ''} className="h-full w-full object-cover opacity-90" loading="lazy" />
      <span className="absolute inset-0 flex items-center justify-center text-5xl text-white drop-shadow group-hover:scale-110">▶</span>
    </button>
  )
}

function VideoGosterimi({ kayit }) {
  const c = linkCoz(kayit.url)
  if (kayit.kaynak !== 'yukleme' && c.tip === 'youtube') return <YoutubeOynatici id={c.id} baslangic={c.baslangic} baslik={kayit.baslik} />
  const gomu = videoGomuGetir(kayit)
  if (!gomu) return <a href={kayit.url} target="_blank" rel="noreferrer" className="text-xs text-deniz underline">{kayit.url}</a>
  if (gomu.tip === 'dosya') return <video src={gomu.src} controls preload="metadata" className="max-h-96 w-full rounded-sm bg-black" />
  return (
    <div className="aspect-video w-full overflow-hidden rounded-sm bg-black">
      <iframe src={gomu.src} title={kayit.baslik || 'Video'} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy" />
    </div>
  )
}

function MuzikGosterimi({ kayit }) {
  const c = linkCoz(kayit.url)
  if (c.tip === 'spotify') {
    return (
      <iframe
        src={`https://open.spotify.com/embed/${c.tur}/${c.id}?utm_source=generator&theme=0`}
        width="100%"
        height={['track', 'episode'].includes(c.tur) ? 152 : 352}
        style={{ borderRadius: 8, border: 'none' }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title={kayit.baslik || 'Spotify'}
      />
    )
  }
  if (c.tip === 'youtube') return <YoutubeOynatici id={c.id} baslangic={c.baslangic} baslik={kayit.baslik} />
  return <a href={kayit.url} target="_blank" rel="noreferrer" className="text-xs text-deniz underline">{kayit.url}</a>
}

function MedyaOgesi({ kayit, benim, etkinlikId, onBuyut }) {
  const [baslik, setBaslik] = useState(kayit.baslik || '')
  const [silinsin, setSilinsin] = useState(false)
  const [hata, setHata] = useState('')

  async function baslikKaydet() {
    if (baslik === (kayit.baslik || '')) return
    try {
      await medyaBaslikGuncelle(etkinlikId, kayit, baslik)
    } catch (err) {
      setHata(err.message)
    }
  }

  async function sil() {
    if (!silinsin) {
      setSilinsin(true)
      return
    }
    try {
      await medyaSil(etkinlikId, kayit)
    } catch (err) {
      setHata(err.message)
      setSilinsin(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
      {kayit.tur === 'kare' && (
        <button type="button" onClick={() => onBuyut(kayit)} className="block w-full">
          <img src={kayit.url} alt={kayit.baslik || 'Kare'} loading="lazy" className="aspect-video w-full object-cover" />
        </button>
      )}
      {kayit.tur === 'video' && <VideoGosterimi kayit={kayit} />}
      {kayit.tur === 'muzik' && <MuzikGosterimi kayit={kayit} />}
      {kayit.tur === 'sosyal' && (
        <div className="p-2">
          <MedyaGomulusu url={kayit.url} paylasanAdi={kayit.ekleyenAd} kompakt />
        </div>
      )}
      <div className="p-2">
        {benim ? (
          <input
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            onBlur={baslikKaydet}
            maxLength={300}
            placeholder={kayit.tur === 'kare' ? 'Kare notu (örn. 52. dk, koridor)' : 'Başlık / not'}
            className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
          />
        ) : (
          baslik && <p className="text-xs text-murekkep">{baslik}</p>
        )}
        <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-kraft">
          <span className="truncate">
            {kayit.kaynak === 'tmdb' ? 'TMDB' : kayit.ekleyenAd || 'Üye'}
          </span>
          {benim && (
            <button type="button" onClick={sil} className={silinsin ? 'font-bold text-muhur' : 'hover:text-muhur'}>
              {silinsin ? 'Emin misin? Sil' : '🗑️ Sil'}
            </button>
          )}
        </div>
        {hata && <p className="text-[10px] text-muhur">{hata}</p>}
      </div>
    </div>
  )
}

// Link yapıştırma formu (kesit / müzik / paylaşım sekmeleri ortak).
function LinkFormu({ tur, yerTutucu, onEkle }) {
  const [url, setUrl] = useState('')
  const [baslik, setBaslik] = useState('')
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  async function gonder(e) {
    e.preventDefault()
    const h = linkHatasi(tur, url)
    if (h) {
      setHata(h)
      return
    }
    setYukleniyor(true)
    setHata('')
    try {
      await onEkle({ url: url.trim(), baslik: baslik.trim() })
      setUrl('')
      setBaslik('')
    } catch (err) {
      setHata(err.message)
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <form onSubmit={gonder} className="space-y-2 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
        placeholder={yerTutucu}
        className="w-full rounded-sm bg-kagit px-2 py-1.5 text-sm text-murekkep ring-1 ring-cizgi"
      />
      <div className="flex gap-2">
        <input
          value={baslik}
          onChange={(e) => setBaslik(e.target.value)}
          maxLength={300}
          placeholder="Başlık / not (isteğe bağlı)"
          className="min-w-0 flex-1 rounded-sm bg-kagit px-2 py-1.5 text-sm text-murekkep ring-1 ring-cizgi"
        />
        <button type="submit" disabled={yukleniyor} className="shrink-0 rounded-full bg-gise px-4 py-1.5 font-govde text-xs text-murekkep disabled:opacity-40">
          {yukleniyor ? '…' : '+ Ekle'}
        </button>
      </div>
      {hata && <p className="text-[11px] text-muhur">{hata}</p>}
    </form>
  )
}

function VideoYukleAlani({ kullanici, onYuklendi }) {
  const [oran, setOran] = useState(null)
  const [hata, setHata] = useState('')

  async function secildi(e) {
    const dosya = e.target.files?.[0]
    e.target.value = ''
    if (!dosya) return
    setHata('')
    setOran(0)
    try {
      const url = await videoYukle(dosya, { uid: kullanici.uid, onIlerleme: setOran })
      await onYuklendi(url, dosya.name.replace(/\.[^.]+$/, ''))
    } catch (err) {
      setHata(err.message)
    } finally {
      setOran(null)
    }
  }

  return (
    <div>
      <label className="inline-block cursor-pointer rounded-sm bg-kagitKoyu px-3 py-1.5 text-xs text-murekkep ring-1 ring-cizgi">
        {oran == null ? `🎞️ Video Yükle (en fazla ${VIDEO_MAKS_MB} MB)` : `Yükleniyor… %${oran}`}
        <input type="file" accept="video/*" onChange={secildi} disabled={oran != null} className="hidden" />
      </label>
      {hata && <p className="mt-1 text-[11px] text-muhur">{hata}</p>}
    </div>
  )
}

export default function IncelemeMedya({ etkinlik, kullanici, adim, kayitlar, kunye, kunyeYuklendi }) {
  const [sekme, setSekme] = useState('kare')
  const [tmdbKareleri, setTmdbKareleri] = useState(null) // null = henüz istenmedi
  const [kareYukleniyor, setKareYukleniyor] = useState(false)
  const [kareSayisi, setKareSayisi] = useState(12)
  const [tmdbVideolari, setTmdbVideolari] = useState(undefined)
  const [seciliFragman, setSeciliFragman] = useState(null)
  const [buyuk, setBuyuk] = useState(null)
  const [hata, setHata] = useState('')

  const etkinlikId = etkinlik.id
  const turdekiler = (tur) => kayitlar.filter((k) => k.tur === tur)
  const ekle = (tur, kaynak, url, baslik = '') => medyaEkle(etkinlikId, kullanici, adim, { tur, kaynak, url, baslik })

  useEffect(() => {
    if (sekme !== 'video' || tmdbVideolari !== undefined) return
    let iptal = false
    tmdbVideolariGetir(etkinlik.eserTmdbId)
      .then((v) => !iptal && setTmdbVideolari(v))
      .catch(() => !iptal && setTmdbVideolari([]))
    return () => {
      iptal = true
    }
  }, [sekme, tmdbVideolari, etkinlik.eserTmdbId])

  async function kareleriGetir() {
    setKareYukleniyor(true)
    setHata('')
    try {
      setTmdbKareleri(await tmdbKareleriGetir(etkinlik.eserTmdbId))
    } catch {
      setHata('TMDB kareleri alınamadı, biraz sonra tekrar dene.')
    } finally {
      setKareYukleniyor(false)
    }
  }

  async function guvenli(fn) {
    setHata('')
    try {
      await fn()
    } catch (err) {
      setHata(err.message)
    }
  }

  const eklenmisKareUrlleri = new Set(turdekiler('kare').map((k) => k.url))
  const liste = (tur) => turdekiler(tur)
  const sayi = (tur) => turdekiler(tur).length

  const oge = (k) => <MedyaOgesi key={k.id} kayit={k} benim={k.ekleyenId === kullanici.uid} etkinlikId={etkinlikId} onBuyut={setBuyuk} />

  return (
    <div>
      <h2 className="mb-1 mt-6 font-baslik text-lg text-murekkep">🎞️ Medya Kutusu</h2>
      <p className="mb-3 text-xs text-kraft">Filmden kareler, kesitler, müzik ve paylaşımlar. Eklediğin kareler ve videolar Tartışma Modu'nda ve Kulüp Özeti'nde de görünür.</p>

      <div className="mb-3 flex flex-wrap gap-1">
        {SEKMELER.map((s) => (
          <button
            key={s.id}
            onClick={() => setSekme(s.id)}
            className={`rounded-full px-3 py-1 font-govde text-xs ${sekme === s.id ? 'bg-murekkep text-yellow-300' : 'bg-kagitKoyu text-murekkep ring-1 ring-cizgi'}`}
          >
            {s.etiket}
            {sayi(s.id) > 0 && <span className="ml-1 opacity-70">({sayi(s.id)})</span>}
          </button>
        ))}
      </div>

      {hata && <p className="mb-2 text-xs text-muhur">{hata}</p>}

      {/* KARELER */}
      {sekme === 'kare' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-start gap-2">
            {etkinlik.eserTmdbId && tmdbKareleri === null && (
              <button onClick={kareleriGetir} disabled={kareYukleniyor} className="rounded-sm bg-gise px-3 py-1.5 text-xs text-murekkep disabled:opacity-40">
                {kareYukleniyor ? 'Getiriliyor…' : '🎞️ Filmin Resmi Karelerini Getir (TMDB)'}
              </button>
            )}
            <GorselYukleButonu
              klasor="gonderi-gorselleri"
              etiket="📷 Kendi Karemi Yükle"
              onYuklendi={(url) => guvenli(() => ekle('kare', 'yukleme', url))}
            />
          </div>

          {tmdbKareleri && (
            <div>
              {tmdbKareleri.length === 0 ? (
                <p className="text-xs text-kraft">Bu film için TMDB'de kare bulunamadı. Kendi karenizi yükleyebilirsiniz.</p>
              ) : (
                <>
                  <p className="mb-1 text-[11px] text-kraft">Eklemek istediklerine dokun (görseller TMDB'den):</p>
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
                    {tmdbKareleri.slice(0, kareSayisi).map((k) => {
                      const var_ = eklenmisKareUrlleri.has(k.buyuk)
                      return (
                        <button
                          key={k.buyuk}
                          type="button"
                          disabled={var_}
                          onClick={() => guvenli(() => ekle('kare', 'tmdb', k.buyuk))}
                          className="relative overflow-hidden rounded-sm ring-1 ring-cizgi"
                        >
                          <img src={k.kucuk} alt="" loading="lazy" className={`aspect-video w-full object-cover ${var_ ? 'opacity-40' : ''}`} />
                          <span className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 text-[11px] text-white">{var_ ? '✓' : '+'}</span>
                        </button>
                      )
                    })}
                  </div>
                  {tmdbKareleri.length > kareSayisi && (
                    <button onClick={() => setKareSayisi((n) => n + 12)} className="mt-2 text-xs text-deniz hover:underline">
                      Daha fazla göster ({tmdbKareleri.length - kareSayisi})
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-bold text-murekkep">Defterdeki kareler</p>
            {liste('kare').length === 0 ? (
              <p className="text-xs text-kraft">Henüz kare eklenmedi.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{liste('kare').map(oge)}</div>
            )}
          </div>
        </div>
      )}

      {/* KESİTLER */}
      {sekme === 'video' && (
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-bold text-murekkep">Fragman ve resmi kesitler (TMDB / YouTube)</p>
            {tmdbVideolari === undefined ? (
              <p className="text-xs text-kraft">Yükleniyor…</p>
            ) : tmdbVideolari.length === 0 ? (
              <p className="text-xs text-kraft">Bu film için TMDB'de fragman bulunamadı. Aşağıdan kendi kesitinizi ekleyebilirsiniz.</p>
            ) : (
              <div>
                <div className="mb-2 flex flex-wrap gap-1">
                  {tmdbVideolari.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSeciliFragman(seciliFragman === v.id ? null : v.id)}
                      className={`rounded-full px-2.5 py-1 text-[11px] ${seciliFragman === v.id ? 'bg-murekkep text-yellow-300' : 'bg-kagitKoyu text-murekkep ring-1 ring-cizgi'}`}
                    >
                      {v.tur === 'Trailer' ? '🎬' : '🎞️'} {v.ad.length > 36 ? `${v.ad.slice(0, 36)}…` : v.ad}
                    </button>
                  ))}
                </div>
                {seciliFragman && (
                  <div className="max-w-2xl">
                    <YoutubeOynatici id={seciliFragman} baslik="Fragman" />
                    <button
                      onClick={() => guvenli(() => ekle('video', 'link', `https://www.youtube.com/watch?v=${seciliFragman}`, tmdbVideolari.find((v) => v.id === seciliFragman)?.ad || ''))}
                      className="mt-1 text-xs text-deniz hover:underline"
                    >
                      + Bunu deftere de ekle (Tartışma Modu'nda görünsün)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-bold text-murekkep">Bizim kesitlerimiz</p>
            <LinkFormu
              tur="video"
              yerTutucu="YouTube / Vimeo bağlantısı (süre için ?t=312 eklenebilir)"
              onEkle={({ url, baslik }) => ekle('video', 'link', url, baslik)}
            />
            <div className="mt-2">
              <VideoYukleAlani kullanici={kullanici} onYuklendi={(url, ad) => ekle('video', 'yukleme', url, ad)} />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">{liste('video').map(oge)}</div>
            {liste('video').length === 0 && <p className="mt-2 text-xs text-kraft">Henüz kesit eklenmedi.</p>}
          </div>
        </div>
      )}

      {/* MÜZİK */}
      {sekme === 'muzik' && (
        <div className="space-y-3">
          {etkinlik.eserTmdbId && kunyeYuklendi && (
            <FilmMuzigiWidget
              tmdbId={etkinlik.eserTmdbId}
              filmAdi={etkinlik.eserBaslik}
              yil={etkinlik.eserYil}
              posterUrl={etkinlik.eserPosterUrl}
              bestekarAdi={kunye?.bestekar || undefined}
            />
          )}
          <div>
            <p className="mb-1 text-xs font-bold text-murekkep">Bizim eklediğimiz müzikler</p>
            <LinkFormu tur="muzik" yerTutucu="Spotify (şarkı/albüm/liste) ya da YouTube bağlantısı" onEkle={({ url, baslik }) => ekle('muzik', 'link', url, baslik)} />
            <div className="mt-3 grid gap-3 md:grid-cols-2">{liste('muzik').map(oge)}</div>
            {liste('muzik').length === 0 && <p className="mt-2 text-xs text-kraft">Henüz müzik eklenmedi.</p>}
          </div>
        </div>
      )}

      {/* SOSYAL MEDYA */}
      {sekme === 'sosyal' && (
        <div className="space-y-3">
          <LinkFormu tur="sosyal" yerTutucu="Instagram, X (Twitter) ya da YouTube paylaşım bağlantısı" onEkle={({ url, baslik }) => ekle('sosyal', 'link', url, baslik)} />
          <div className="grid gap-3 md:grid-cols-2">{liste('sosyal').map(oge)}</div>
          {liste('sosyal').length === 0 && <p className="text-xs text-kraft">Henüz paylaşım eklenmedi.</p>}
        </div>
      )}

      {/* Kare büyütme */}
      {buyuk && (
        <div className="fixed inset-0 z-[90] flex cursor-zoom-out flex-col items-center justify-center bg-black/90 p-4" onClick={() => setBuyuk(null)}>
          <img src={buyuk.url} alt={buyuk.baslik || ''} className="max-h-[85vh] max-w-full object-contain" />
          {buyuk.baslik && <p className="mt-2 text-sm text-white">{buyuk.baslik}</p>}
        </div>
      )}
    </div>
  )
}

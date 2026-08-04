import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  sezonOlustur,
  tumSezonlariGetir,
  kategoriEkle,
  kategoriSil,
  kategorilerGetir,
  adayEkle,
  adaySil,
  adaylarGetir,
  izlemeIlerlemesiHesapla,
  sezonuKilitle,
  tahminVer,
  tahminleriGetir,
  sonucGir,
  sonucuTemizle,
  skorTablosuHesapla,
  sezonuBitir,
} from '../utils/oscar.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'
const TMDB_PROFIL = 'https://image.tmdb.org/t/p/w300'

function gunSayisi(torenTarihi) {
  if (!torenTarihi) return null
  const fark = new Date(torenTarihi) - new Date()
  return Math.ceil(fark / (1000 * 60 * 60 * 24))
}

function AdayEkleFormu({ sezonId, kategori, siradakiSira, onEklendi }) {
  const [mod, setMod] = useState('film') // 'film' | 'kisi'
  const [arama, setArama] = useState('')
  const [kisiAdi, setKisiAdi] = useState('') // 'film' modunda: aday filmle ilişkili kişi adı (opsiyonel)
  const [kisiSecili, setKisiSecili] = useState(null) // 'kisi' modunda 1. adımda seçilen kişi
  const [sonuclar, setSonuclar] = useState([])
  const [aramaYukleniyor, setAramaYukleniyor] = useState(false)
  const [ekleniyor, setEkleniyor] = useState(false)

  // 'kisi' modunda henüz bir kişi seçilmediyse kişi aranıyor; kişi seçildikten
  // sonra AYNI arama kutusu bu sefer FİLM aramaya geçiyor — böylece adayın
  // hem kişiyle hem de gerçek bir TMDB filmiyle bağlantısı kuruluyor (serbest
  // metinle film adı yazmak yerine).
  async function ara(e) {
    e.preventDefault()
    if (!arama.trim() || !TMDB_API_KEY) return
    setAramaYukleniyor(true)
    try {
      const uc = mod === 'kisi' ? (kisiSecili ? 'movie' : 'person') : 'movie'
      const url = `https://api.themoviedb.org/3/search/${uc}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(arama)}`
      const res = await fetch(url)
      const data = await res.json()
      setSonuclar(data.results || [])
    } finally {
      setAramaYukleniyor(false)
    }
  }

  async function sec(secim) {
    if (mod === 'kisi' && !kisiSecili) {
      // 1. adım tamamlandı: kişi seçildi, hemen kaydetmiyoruz — film seçimini bekliyoruz.
      setKisiSecili(secim)
      setArama('')
      setSonuclar([])
      return
    }

    setEkleniyor(true)
    try {
      if (mod === 'kisi') {
        // 2. adım: film de seçildi, ikisini birlikte, gerçek bir bağlantıyla kaydet.
        await adayEkle(sezonId, kategori.id, {
          tmdbId: secim.id,
          filmBasligi: secim.title,
          filmYili: secim.release_date ? secim.release_date.slice(0, 4) : '',
          posterUrl: secim.poster_path ? `${TMDB_POSTER}${secim.poster_path}` : '',
          kisiTmdbId: kisiSecili.id,
          kisiAdi: kisiSecili.name,
          kisiFotoUrl: kisiSecili.profile_path ? `${TMDB_PROFIL}${kisiSecili.profile_path}` : '',
          sira: siradakiSira,
        })
      } else {
        await adayEkle(sezonId, kategori.id, {
          tmdbId: secim.id,
          filmBasligi: secim.title,
          filmYili: secim.release_date ? secim.release_date.slice(0, 4) : '',
          posterUrl: secim.poster_path ? `${TMDB_POSTER}${secim.poster_path}` : '',
          kisiAdi,
          sira: siradakiSira,
        })
      }
      setArama('')
      setKisiAdi('')
      setKisiSecili(null)
      setSonuclar([])
      onEklendi()
    } finally {
      setEkleniyor(false)
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-sm bg-kagit p-2 ring-1 ring-cizgi">
      <div className="flex gap-1">
        {[
          { id: 'film', etiket: 'Film' },
          { id: 'kisi', etiket: 'Kişi (Oyuncu/Yönetmen)' },
        ].map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMod(m.id)
              setSonuclar([])
              setKisiSecili(null)
              setArama('')
            }}
            className={`rounded-sm px-2 py-1 font-govde text-[11px] ${
              mod === m.id ? 'bg-murekkep text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
            }`}
          >
            {m.etiket}
          </button>
        ))}
      </div>

      {mod === 'kisi' && kisiSecili && (
        <div className="flex items-center gap-2 rounded-sm bg-kagitKoyu px-2 py-1.5 ring-1 ring-cizgi">
          {kisiSecili.profile_path && (
            <img src={`${TMDB_PROFIL}${kisiSecili.profile_path}`} alt={kisiSecili.name} className="h-8 w-6 shrink-0 rounded-sm object-cover" />
          )}
          <p className="min-w-0 flex-1 truncate text-xs text-murekkep">
            <span className="text-kraft">Seçili kişi:</span> {kisiSecili.name}
          </p>
          <button
            type="button"
            onClick={() => {
              setKisiSecili(null)
              setSonuclar([])
              setArama('')
            }}
            className="shrink-0 text-[11px] text-kraft hover:text-muhur"
          >
            Değiştir
          </button>
        </div>
      )}

      <form onSubmit={ara} className="flex gap-2">
        <input
          type="text"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder={mod === 'kisi' ? (kisiSecili ? 'Şimdi filmi ara... (ör. The Odyssey)' : 'Oyuncu/yönetmen ara...') : 'Film ara...'}
          className="flex-1 rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
        />
        {mod === 'film' && (
          <input
            type="text"
            value={kisiAdi}
            onChange={(e) => setKisiAdi(e.target.value)}
            placeholder="Kişi adı (opsiyonel)"
            className="w-36 rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
          />
        )}
        <button type="submit" className="rounded-sm bg-deniz px-2 py-1 font-govde text-xs text-kagit">
          {aramaYukleniyor ? '...' : 'Ara'}
        </button>
      </form>
      {sonuclar.length > 0 && (
        <div className="grid grid-cols-6 gap-1.5">
          {sonuclar.slice(0, 12).map((sonuc) => {
            const kisiAraniyor = mod === 'kisi' && !kisiSecili
            const foto = kisiAraniyor ? sonuc.profile_path : sonuc.poster_path
            const ad = kisiAraniyor ? sonuc.name : sonuc.title
            return (
              <button key={sonuc.id} onClick={() => sec(sonuc)} disabled={ekleniyor} className="text-left disabled:opacity-40">
                <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                  {foto && <img src={`${kisiAraniyor ? TMDB_PROFIL : TMDB_POSTER}${foto}`} alt={ad} className="h-full w-full object-cover" />}
                </div>
                <p className="truncate text-[10px] text-murekkep">{ad}</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Oscar() {
  const { kullanici, profil } = useAuth()
  const [sezon, setSezon] = useState(null)
  const [gecmisSezonlar, setGecmisSezonlar] = useState([])
  const [kategoriler, setKategoriler] = useState([])
  const [adaylar, setAdaylar] = useState([])
  const [tahminler, setTahminler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [ilerleme, setIlerleme] = useState(null)

  const [sezonAdi, setSezonAdi] = useState('99. Akademi Ödülleri')
  const [torenTarihi, setTorenTarihi] = useState('2027-03-14')
  const [yeniKategoriAdi, setYeniKategoriAdi] = useState('')
  const [aciKategoriId, setAciKategoriId] = useState(null)
  const [kilitlemeIsleniyor, setKilitlemeIsleniyor] = useState(false)
  const [bitirmeIsleniyor, setBitirmeIsleniyor] = useState(false)
  const [topluAcik, setTopluAcik] = useState(false)
  const [topluMetin, setTopluMetin] = useState('')
  const [topluCalisiyor, setTopluCalisiyor] = useState(false)
  const [topluIlerleme, setTopluIlerleme] = useState('')

  async function hepsiniYukle() {
    setYukleniyor(true)
    const tumSezonlar = await tumSezonlariGetir()
    const bitmemis = tumSezonlar.find((s) => !s.bittiMi) || null
    setSezon(bitmemis)
    setGecmisSezonlar(tumSezonlar.filter((s) => s.bittiMi))
    if (bitmemis) {
      const [k, a, t] = await Promise.all([kategorilerGetir(bitmemis.id), adaylarGetir(bitmemis.id), tahminleriGetir(bitmemis.id)])
      setKategoriler(k)
      setAdaylar(a)
      setTahminler(t)
      const tmdbIdSeti = new Set(a.map((x) => x.tmdbId))
      setIlerleme(await izlemeIlerlemesiHesapla(tmdbIdSeti))
    }
    setYukleniyor(false)
  }

  useEffect(() => {
    hepsiniYukle()
  }, [])

  async function sezonuOlustur(e) {
    e.preventDefault()
    if (!sezonAdi.trim() || !kullanici) return
    await sezonOlustur(kullanici, { ad: sezonAdi, torenTarihi })
    hepsiniYukle()
  }

  async function tmdbdeFilmAra(isim) {
    if (!TMDB_API_KEY) return null
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(isim)}`
    try {
      const res = await fetch(url)
      const data = await res.json()
      return data.results?.[0] || null
    } catch {
      return null
    }
  }

  // Format: boş satırla ayrılmış bloklar. Her bloğun ilk satırı kategori adı,
  // sonraki satırlar "Film Adı" ya da "Film Adı | Kişi Adı" (oyunculuk/yönetmenlik
  // kategorileri için). Ör. bir ödül tahmin sitesinden (elle, bir kerelik) kopyalanan
  // güncel aday listesini buraya yapıştırıp saniyeler içinde eklemek için.
  async function topluEkleYap() {
    const bloklar = topluMetin
      .split(/\n\s*\n/)
      .map((b) => b.split('\n').map((s) => s.trim()).filter(Boolean))
      .filter((b) => b.length > 0)

    if (bloklar.length === 0) return
    setTopluCalisiyor(true)
    try {
      let toplamFilm = bloklar.reduce((n, b) => n + b.length - 1, 0)
      let islenen = 0
      for (const blok of bloklar) {
        const [kategoriAdi, ...filmSatirlari] = blok
        setTopluIlerleme(`"${kategoriAdi}" kategorisi oluşturuluyor...`)
        await kategoriEkle(sezon.id, { ad: kategoriAdi, sira: kategoriler.length })
        const guncelKategoriler = await kategorilerGetir(sezon.id)
        const kategori = guncelKategoriler.find((k) => k.ad === kategoriAdi)
        if (!kategori) continue

        let sira = 0
        for (const satir of filmSatirlari) {
          const [filmAdi, kisiAdi] = satir.split('|').map((s) => s?.trim())
          islenen++
          setTopluIlerleme(`(${islenen}/${toplamFilm}) "${filmAdi}" aranıyor...`)
          const film = await tmdbdeFilmAra(filmAdi)
          if (film) {
            await adayEkle(sezon.id, kategori.id, {
              tmdbId: film.id,
              filmBasligi: film.title,
              filmYili: film.release_date ? film.release_date.slice(0, 4) : '',
              posterUrl: film.poster_path ? `${TMDB_POSTER}${film.poster_path}` : '',
              kisiAdi: kisiAdi || '',
              sira: sira++,
            })
          }
        }
      }
      setTopluMetin('')
      setTopluAcik(false)
      hepsiniYukle()
    } finally {
      setTopluCalisiyor(false)
      setTopluIlerleme('')
    }
  }

  async function kategoriEkleTiklandi(e) {
    e.preventDefault()
    if (!yeniKategoriAdi.trim() || !sezon) return
    await kategoriEkle(sezon.id, { ad: yeniKategoriAdi, sira: kategoriler.length })
    setYeniKategoriAdi('')
    hepsiniYukle()
  }

  async function kategoriSilTiklandi(kategoriId) {
    if (!window.confirm('Bu kategoriyi ve tüm adaylarını silmek istediğine emin misin?')) return
    await kategoriSil(kategoriId)
    hepsiniYukle()
  }

  async function adaySilTiklandi(adayId) {
    await adaySil(adayId)
    hepsiniYukle()
  }

  async function kilitlemeDegistir() {
    const yeniDurum = !sezon.kilitli
    const mesaj = yeniDurum
      ? 'Tahminleri kilitlemek istediğine emin misin? Kilitlendikten sonra kimse tahminini değiştiremez.'
      : 'Kilidi açmak istediğine emin misin? Herkes tekrar tahminini değiştirebilir hale gelir.'
    if (!window.confirm(mesaj)) return
    setKilitlemeIsleniyor(true)
    try {
      await sezonuKilitle(sezon.id, yeniDurum)
      setSezon((s) => ({ ...s, kilitli: yeniDurum }))
    } finally {
      setKilitlemeIsleniyor(false)
    }
  }

  async function tahminSec(kategoriId, adayId) {
    if (!kullanici || sezon.kilitli) return
    await tahminVer(sezon.id, kategoriId, kullanici, profil, adayId)
    setTahminler((onceki) => {
      const digerleri = onceki.filter((t) => !(t.kategoriId === kategoriId && t.kullaniciId === kullanici.uid))
      return [...digerleri, { kategoriId, kullaniciId: kullanici.uid, kullaniciAdi: profil?.adSoyad || 'Sen', adayId }]
    })
  }

  async function sonucSec(kategoriId, adayId) {
    const kategori = kategoriler.find((k) => k.id === kategoriId)
    // Aynı adaya tekrar tıklanırsa sonucu temizle (yanlışlıkla girilmişse geri almak için)
    if (kategori?.kazananAdayId === adayId) {
      await sonucuTemizle(kategoriId)
      setKategoriler((onceki) => onceki.map((k) => (k.id === kategoriId ? { ...k, kazananAdayId: null } : k)))
    } else {
      await sonucGir(kategoriId, adayId)
      setKategoriler((onceki) => onceki.map((k) => (k.id === kategoriId ? { ...k, kazananAdayId: adayId } : k)))
    }
  }

  async function sezonuBitirTiklandi() {
    const skorTablosu = skorTablosuHesapla(kategoriler, tahminler)
    if (skorTablosu.length === 0) {
      window.alert('Kimse tahmin vermediği için bir Kahin belirlenemiyor.')
      return
    }
    const kahin = skorTablosu[0]
    if (
      !window.confirm(
        `Sezonu bitirip "${kahin.kullaniciAdi}" kişisini ${kahin.dogru} doğru tahminle bu sezonun Kahini ilan etmek istediğine emin misin? Bu işlem geri alınamaz.`
      )
    )
      return
    setBitirmeIsleniyor(true)
    try {
      await sezonuBitir(sezon.id, kahin.kullaniciId, kahin.kullaniciAdi)
      hepsiniYukle()
    } finally {
      setBitirmeIsleniyor(false)
    }
  }

  if (yukleniyor) return <p className="text-sm text-kraft">Yükleniyor...</p>

  if (!sezon) {
    return (
      <div>
        <h1 className="font-baslik text-2xl text-murekkep mb-1">🏆 Oscar Yolculuğu</h1>
        <p className="mb-6 text-sm text-kraft">
          {gecmisSezonlar.length > 0 ? 'Yeni bir sezon henüz başlamadı.' : 'Henüz bir Oscar sezonu oluşturulmadı.'}
        </p>
        {kullanici && (
          <form onSubmit={sezonuOlustur} className="mb-8 max-w-sm space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
            <div>
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Sezon Adı</label>
              <input
                type="text"
                value={sezonAdi}
                onChange={(e) => setSezonAdi(e.target.value)}
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Tören Tarihi</label>
              <input
                type="date"
                value={torenTarihi}
                onChange={(e) => setTorenTarihi(e.target.value)}
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>
            <button type="submit" className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit">
              Sezonu Oluştur
            </button>
          </form>
        )}

        {gecmisSezonlar.length > 0 && (
          <div>
            <h2 className="font-baslik text-lg text-murekkep mb-3">Geçmiş Kahinler</h2>
            <ul className="space-y-2">
              {gecmisSezonlar.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
                  <span className="text-sm text-murekkep">{s.ad}</span>
                  <span className="text-sm text-kraft">🏆 {s.kahinAdi}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  const gun = gunSayisi(sezon.torenTarihi)
  const kategoriliAdaylar = kategoriler.map((k) => ({
    ...k,
    adaylar: adaylar.filter((a) => a.kategoriId === k.id).sort((a, b) => a.sira - b.sira),
  }))

  const kendiTahminlerim = {} // kategoriId -> adayId
  if (kullanici) {
    tahminler.filter((t) => t.kullaniciId === kullanici.uid).forEach((t) => (kendiTahminlerim[t.kategoriId] = t.adayId))
  }
  const tahminVerilenKategoriSayisi = Object.keys(kendiTahminlerim).length
  const skorTablosu = sezon.kilitli ? skorTablosuHesapla(kategoriler, tahminler) : []
  const tumuSonuclandiMi = kategoriler.length > 0 && kategoriler.every((k) => k.kazananAdayId)

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep mb-1">🏆 Oscar Yolculuğu</h1>
      <p className="mb-1 text-sm text-kraft">{sezon.ad}</p>
      {gun != null && (
        <p className="mb-4 text-sm text-kraft">
          {gun > 0 ? `Törene ${gun} gün kaldı` : gun === 0 ? 'Tören bugün! 🎬' : 'Tören geçti'} ·{' '}
          {new Date(sezon.torenTarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}

      {ilerleme && ilerleme.toplam > 0 && (
        <div className="mb-4 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
          <div className="flex items-center gap-3">
            <span className="font-baslik text-xl text-muhur">
              {ilerleme.izlenen}/{ilerleme.toplam}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-kagit">
              <div className="h-full bg-muhur" style={{ width: `${(ilerleme.izlenen / ilerleme.toplam) * 100}%` }} />
            </div>
          </div>
          <p className="mt-1 text-xs text-kraft">aday film topluluk tarafından izlendi</p>
        </div>
      )}

      {kategoriler.length > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
          <div>
            <p className="text-sm text-murekkep">
              {sezon.kilitli ? '🔒 Tahminler kilitli' : '🔓 Tahminler açık'}
              {kullanici && !sezon.kilitli && (
                <span className="text-kraft">
                  {' '}
                  · sen {tahminVerilenKategoriSayisi}/{kategoriler.length} kategori için tahmin verdin
                </span>
              )}
            </p>
          </div>
          {kullanici && (
            <button
              onClick={kilitlemeDegistir}
              disabled={kilitlemeIsleniyor}
              className="rounded-sm bg-murekkep px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
            >
              {kilitlemeIsleniyor ? '...' : sezon.kilitli ? 'Kilidi Aç' : 'Tahminleri Kilitle'}
            </button>
          )}
        </div>
      )}

      {sezon.kilitli && skorTablosu.length > 0 && (
        <div className="mb-6 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
          <p className="mb-2 text-sm font-medium text-murekkep">📊 Skor Tablosu</p>
          <ol className="space-y-1">
            {skorTablosu.map((k, i) => (
              <li key={k.kullaniciId} className="flex items-center justify-between text-xs">
                <span className="text-murekkep">
                  {i === 0 && '🏆 '}
                  {i + 1}. {k.kullaniciId === kullanici?.uid ? 'Sen' : k.kullaniciAdi}
                </span>
                <span className="text-kraft">
                  {k.dogru}/{k.toplam} doğru
                </span>
              </li>
            ))}
          </ol>
          {kullanici && (
            <button
              onClick={sezonuBitirTiklandi}
              disabled={!tumuSonuclandiMi || bitirmeIsleniyor}
              title={!tumuSonuclandiMi ? 'Tüm kategorilerin sonucu girilmeden sezon bitirilemez' : ''}
              className="mt-3 rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
            >
              {bitirmeIsleniyor ? '...' : 'Sezonu Bitir ve Kahini İlan Et'}
            </button>
          )}
        </div>
      )}

      {kullanici && (
        <div className="mb-6 space-y-2">
          <div className="flex gap-2">
            <form onSubmit={kategoriEkleTiklandi} className="flex flex-1 max-w-sm gap-2">
              <input
                type="text"
                value={yeniKategoriAdi}
                onChange={(e) => setYeniKategoriAdi(e.target.value)}
                placeholder="Yeni kategori adı (ör. En İyi Film)"
                className="flex-1 rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
              <button type="submit" className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit">
                + Kategori Ekle
              </button>
            </form>
            <button
              onClick={() => setTopluAcik((a) => !a)}
              className="rounded-sm bg-kagitKoyu px-3 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi"
            >
              📋 Toplu Ekle
            </button>
          </div>

          {topluAcik && (
            <div className="max-w-xl space-y-2 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
              <p className="text-xs text-kraft">
                Bir tahmin sitesinden kopyaladığın listeyi yapıştır. Format: her kategori ayrı bir blok (aralarında boş
                satır), ilk satır kategori adı, sonraki satırlar film adları — oyunculuk/yönetmenlik gibi kategorilerde{' '}
                <code>Film Adı | Kişi Adı</code> şeklinde yazabilirsin.
              </p>
              <textarea
                value={topluMetin}
                onChange={(e) => setTopluMetin(e.target.value)}
                rows={10}
                disabled={topluCalisiyor}
                placeholder={
                  'En İyi Film\nThe Odyssey\nLa Bola Negra\nWild Horse Nine\n\nEn İyi Yönetmen\nThe Odyssey | Christopher Nolan\nLa Bola Negra | Javier Ambrossi'
                }
                className="w-full rounded-sm bg-kagit px-3 py-2 text-xs text-murekkep ring-1 ring-cizgi"
              />
              {topluCalisiyor && <p className="text-xs text-kraft">{topluIlerleme}</p>}
              <button
                onClick={topluEkleYap}
                disabled={topluCalisiyor || !topluMetin.trim()}
                className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
              >
                {topluCalisiyor ? 'Ekleniyor...' : 'Hepsini Ekle'}
              </button>
            </div>
          )}
        </div>
      )}

      {kategoriliAdaylar.length === 0 && <p className="text-sm text-kraft">Henüz kategori eklenmedi.</p>}

      <div className="space-y-8">
        {kategoriliAdaylar.map((k) => {
          const kendiTahminim = kendiTahminlerim[k.id]
          const buKategorininTahminleri = tahminler.filter((t) => t.kategoriId === k.id)

          return (
            <div key={k.id}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-baslik text-lg text-murekkep">{k.ad}</h2>
                <div className="flex items-center gap-2">
                  {sezon.kilitli && !k.kazananAdayId && kullanici && (
                    <span className="text-[11px] text-kraft">🏆 kazananı işaretlemek için afişe tıkla</span>
                  )}
                  {kullanici && (
                    <button onClick={() => kategoriSilTiklandi(k.id)} className="text-[11px] text-kraft hover:text-muhur">
                      Kategoriyi Sil
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {k.adaylar.map((a) => {
                  const buBenimTahminim = kendiTahminim === a.id
                  const buKazanan = k.kazananAdayId === a.id
                  const kisiBazliMi = !!a.kisiTmdbId
                  const gorselUrl = kisiBazliMi ? a.kisiFotoUrl : a.posterUrl
                  const ustBaslik = kisiBazliMi ? a.kisiAdi : a.filmBasligi
                  const altBaslik = kisiBazliMi ? a.filmBasligi : a.kisiAdi
                  const link = kisiBazliMi ? `/kisi/${a.kisiTmdbId}` : `/film/${a.tmdbId}`
                  return (
                    <div key={a.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => (sezon.kilitli ? sonucSec(k.id, a.id) : tahminSec(k.id, a.id))}
                        disabled={!kullanici}
                        className="block w-full text-left"
                      >
                        <div
                          className={`relative aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-2 ${
                            buKazanan ? 'ring-gise' : buBenimTahminim ? 'ring-muhur' : 'ring-cizgi'
                          }`}
                        >
                          {gorselUrl && <img src={gorselUrl} alt={ustBaslik} className="h-full w-full object-cover" />}
                          {buKazanan && (
                            <span className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gise text-xs">
                              🏆
                            </span>
                          )}
                          {buBenimTahminim && (
                            <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-muhur text-xs text-kagit">
                              ✓
                            </span>
                          )}
                        </div>
                      </button>
                      <Link to={link} className="mt-1 block truncate text-xs text-murekkep hover:text-deniz hover:underline">
                        {ustBaslik}
                      </Link>
                      {altBaslik &&
                        (kisiBazliMi && a.tmdbId ? (
                          <Link to={`/film/${a.tmdbId}`} className="truncate text-[11px] text-kraft hover:text-deniz hover:underline block">
                            {altBaslik}
                          </Link>
                        ) : (
                          <p className="truncate text-[11px] text-kraft">{altBaslik}</p>
                        ))}
                      {kullanici && !sezon.kilitli && (
                        <button
                          onClick={() => adaySilTiklandi(a.id)}
                          className="absolute right-1 top-1 rounded-full bg-kagit/90 px-1.5 py-0.5 text-[10px] text-kraft opacity-0 ring-1 ring-cizgi transition-opacity hover:text-muhur group-hover:opacity-100"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {sezon.kilitli && buKategorininTahminleri.length > 0 && (
                <div className="mt-3 rounded-sm bg-kagit p-2 ring-1 ring-cizgi">
                  <p className="mb-1 text-[11px] uppercase tracking-widest text-gise">Tahminler</p>
                  <ul className="space-y-0.5 text-xs text-kraft">
                    {buKategorininTahminleri.map((t) => {
                      const aday = k.adaylar.find((a) => a.id === t.adayId)
                      return (
                        <li key={t.id}>
                          <span className="text-murekkep">{t.kullaniciId === kullanici?.uid ? 'Sen' : t.kullaniciAdi}</span>
                          {' → '}
                          {aday ? (aday.kisiTmdbId ? `${aday.kisiAdi} (${aday.filmBasligi})` : aday.filmBasligi) : '(silinmiş aday)'}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {kullanici && !sezon.kilitli && (
                <>
                  {aciKategoriId === k.id ? (
                    <AdayEkleFormu sezonId={sezon.id} kategori={k} siradakiSira={k.adaylar.length} onEklendi={hepsiniYukle} />
                  ) : (
                    <button onClick={() => setAciKategoriId(k.id)} className="mt-2 text-[11px] text-kraft hover:text-deniz hover:underline">
                      + Aday Ekle
                    </button>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

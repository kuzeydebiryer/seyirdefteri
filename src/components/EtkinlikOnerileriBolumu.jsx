import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useEtkinlikOnerileri } from '../hooks/useEtkinlikOnerileri.js'
import { oneriEkle, oneriSil, oneriBegenDegistir, oneriyiEtkinligeCevir } from '../utils/etkinlikOnerisi.js'
import { kitapIcVeriTabanindaAra } from '../utils/kitapKatalog.js'
import { turkceKitaptanKaydet } from '../utils/turkceKitapVeriTabani.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

function OneriKarti({ oneri, kullanici, uyeMi, yoneticiMiyim, topluluk, onDegisti }) {
  const [begenenler, setBegenenler] = useState(oneri.begenenler || [])
  const [begeniIsleniyor, setBegeniIsleniyor] = useState(false)
  const [etkinlikYapFormuAcik, setEtkinlikYapFormuAcik] = useState(false)
  const [tarih, setTarih] = useState('')
  const [cevriliyor, setCevriliyor] = useState(false)
  const [siliniyor, setSiliniyor] = useState(false)

  const begeniyorMu = kullanici && begenenler.includes(kullanici.uid)
  const benimOnerimMi = kullanici?.uid === oneri.onerenId

  async function begenDegistir() {
    if (!kullanici || !uyeMi) return
    setBegeniIsleniyor(true)
    const yeni = begeniyorMu ? begenenler.filter((u) => u !== kullanici.uid) : [...begenenler, kullanici.uid]
    setBegenenler(yeni)
    try {
      await oneriBegenDegistir(oneri.id, kullanici.uid, begeniyorMu)
    } finally {
      setBegeniIsleniyor(false)
    }
  }

  async function sil() {
    if (!window.confirm('Bu öneriyi kaldırmak istediğine emin misin?')) return
    setSiliniyor(true)
    try {
      await oneriSil(oneri.id)
      onDegisti()
    } finally {
      setSiliniyor(false)
    }
  }

  async function etkinligeCevir(e) {
    e.preventDefault()
    if (!tarih) return
    setCevriliyor(true)
    try {
      await oneriyiEtkinligeCevir(oneri, tarih, topluluk, kullanici)
      onDegisti()
    } finally {
      setCevriliyor(false)
    }
  }

  return (
    <div className="flex gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
      {oneri.eserPosterUrl && (
        <img src={oneri.eserPosterUrl} alt={oneri.eserBaslik} className="h-24 w-16 shrink-0 rounded-sm object-cover ring-1 ring-cizgi" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-govde text-sm text-murekkep">
          {oneri.eserBaslik} {oneri.eserYil && `(${oneri.eserYil})`}
        </p>
        {(oneri.yonetmen || oneri.eserYazar) && <p className="text-[11px] text-kraft">{oneri.yonetmen || oneri.eserYazar}</p>}
        {oneri.not && <p className="mt-1 text-xs text-murekkep/90">"{oneri.not}"</p>}
        <p className="mt-1 text-[11px] text-kraft">{oneri.onerenAdi} önerdi</p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={begenDegistir}
            disabled={!uyeMi || begeniIsleniyor}
            className={`rounded-sm px-2 py-1 text-[11px] ring-1 ${
              begeniyorMu ? 'bg-muhur text-kagit ring-muhur' : 'bg-kagit text-kraft ring-cizgi hover:text-murekkep'
            } disabled:opacity-40`}
          >
            👍 {begenenler.length}
          </button>

          {yoneticiMiyim && (
            <button onClick={() => setEtkinlikYapFormuAcik((a) => !a)} className="text-[11px] text-deniz hover:underline">
              {etkinlikYapFormuAcik ? 'Vazgeç' : '✓ Etkinlik Yap'}
            </button>
          )}

          {(benimOnerimMi || yoneticiMiyim) && (
            <button onClick={sil} disabled={siliniyor} className="text-[11px] text-kraft hover:text-muhur disabled:opacity-40">
              Kaldır
            </button>
          )}
        </div>

        {etkinlikYapFormuAcik && (
          <form onSubmit={etkinligeCevir} className="mt-2 flex items-center gap-2">
            <input
              type="datetime-local"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
              required
              className="rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
            />
            <button
              type="submit"
              disabled={cevriliyor}
              className="rounded-sm bg-muhur px-2 py-1 text-[11px] text-kagit disabled:opacity-40"
            >
              {cevriliyor ? 'Oluşturuluyor...' : 'Onayla'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// Film/Kitap Kulübü etkinlik önerileri: üyeler sıradaki buluşma için eser
// önerir, herkes beğenir, en çok beğenilen üstte çıkar. Yönetici (kurucu/
// moderatör) istediği anda en beğenilen (ya da başka bir) öneriyi tek
// tıkla gerçek bir "Gelecek Etkinlik"e çevirebilir.
export default function EtkinlikOnerileriBolumu({ topluluklId, topluluk, uyeMi, yoneticiMiyim }) {
  const { kullanici } = useAuth()
  const { oneriler, yukleniyor, hata, yenidenYukle } = useEtkinlikOnerileri(topluluklId)

  const [formuAcik, setFormuAcik] = useState(false)
  const [eserKategori, setEserKategori] = useState('sinema')
  const [eserArama, setEserArama] = useState('')
  const [eserSonuclari, setEserSonuclari] = useState([])
  const [seciliEser, setSeciliEser] = useState(null)
  const [instagramUrl, setInstagramUrl] = useState('')
  const [not_, setNot_] = useState('')
  const [sonTarih, setSonTarih] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  async function eserAra(e) {
    e.preventDefault()
    if (!eserArama.trim()) return
    if (eserKategori === 'kitap') {
      // KÖKTEN ÇÖZÜM: eskiden burada sadece Google Books'a gidiliyordu —
      // sitenin kendi 67 bin kayıtlı Türkçe veri seti ve canlı (elle
      // eklenen/zenginleştirilen) kataloğu hiç aranmıyordu. "Veritabanımızda
      // olan kitabı bulamıyorum" sorununun kaynağı buydu.
      const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(eserArama)}&maxResults=10${anahtarParcasi}`
      const [icSonuclar, googleSonuc] = await Promise.all([
        kitapIcVeriTabanindaAra(eserArama, 10),
        fetch(url)
          .then((res) => res.json())
          .then((data) => data.items || [])
          .catch(() => []),
      ])
      setEserSonuclari([...icSonuclar.map((k) => ({ ...k, _kaynak: 'ic' })), ...googleSonuc])
      return
    }
    if (!TMDB_API_KEY) return
    const uc = eserKategori === 'sinema' ? 'movie' : 'tv'
    const url = `https://api.themoviedb.org/3/search/${uc}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(eserArama)}`
    const res = await fetch(url)
    const data = await res.json()
    setEserSonuclari(data.results || [])
  }

  async function eserSec(item) {
    if (eserKategori === 'kitap') {
      if (item._kaynak === 'ic') {
        // Statik veri setinden geliyorsa (henüz gerçek bir Firestore kaydı
        // yok) burada bir tane oluşturuluyor; canlı katalogdan geliyorsa
        // (zaten gerçek bir kayıt) doğrudan kullanılıyor.
        const kayit = item.id?.startsWith('tr_') ? await turkceKitaptanKaydet(item) : item
        setSeciliEser({
          eserTur: 'kitap',
          eserGoogleBooksId: kayit.id,
          eserBaslik: kayit.baslik || '',
          eserYazar: kayit.yazar || '',
          eserYil: kayit.yil || '',
          eserPosterUrl: kayit.posterUrl || '',
        })
        setEserSonuclari([])
        setEserArama('')
        return
      }
      const v = item.volumeInfo || {}
      setSeciliEser({
        eserTur: 'kitap',
        eserGoogleBooksId: item.id,
        eserBaslik: v.title || '',
        eserYazar: (v.authors || []).join(', '),
        eserYil: (v.publishedDate || '').slice(0, 4),
        eserPosterUrl: (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://'),
      })
      setEserSonuclari([])
      setEserArama('')
      return
    }
    const baslik = eserKategori === 'sinema' ? item.title : item.name
    const yil = (eserKategori === 'sinema' ? item.release_date : item.first_air_date)?.slice(0, 4)
    const posterUrl = item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : ''
    setSeciliEser({ eserTur: eserKategori, eserTmdbId: item.id, eserBaslik: baslik, eserYil: yil, eserPosterUrl: posterUrl })
    setEserSonuclari([])
    setEserArama('')
  }

  async function gonder(e) {
    e.preventDefault()
    if (!seciliEser || !kullanici) return
    setKaydediliyor(true)
    try {
      await oneriEkle(topluluklId, {
        eser: { ...seciliEser, instagramUrl: instagramUrl.trim() || null },
        not: not_,
        sonTarih: sonTarih || null,
        topluluk,
        kullanici,
      })
      setSeciliEser(null)
      setNot_('')
      setSonTarih('')
      setInstagramUrl('')
      setFormuAcik(false)
      yenidenYukle()
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <div className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-baslik text-lg text-murekkep">🗳️ Etkinlik Önerileri</h2>
          <p className="text-[11px] text-kraft">Sıradaki buluşma için öner, en çok beğenilen gerçekleşir.</p>
        </div>
        {uyeMi && (
          <button
            onClick={() => setFormuAcik((a) => !a)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 font-govde text-xs ${formuAcik ? 'bg-kagitKoyu text-kraft ring-1 ring-cizgi' : 'bg-gise text-kagit'}`}
          >
            {formuAcik ? 'Vazgeç' : '+ Öner'}
          </button>
        )}
      </div>

      {formuAcik && (
        <form onSubmit={gonder} className="mb-4 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          {seciliEser ? (
            <div className="flex items-center gap-2 rounded-sm bg-kagit p-2 ring-1 ring-cizgi">
              {seciliEser.eserPosterUrl && <img src={seciliEser.eserPosterUrl} alt="" className="h-14 w-10 rounded-sm object-cover" />}
              <p className="flex-1 text-xs text-murekkep">
                {seciliEser.eserBaslik} {seciliEser.eserYil && `(${seciliEser.eserYil})`}
              </p>
              <button type="button" onClick={() => setSeciliEser(null)} className="text-[11px] text-kraft hover:text-muhur">
                Kaldır
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEserKategori('sinema')}
                  className={`rounded-sm px-2 py-1 text-xs ${eserKategori === 'sinema' ? 'bg-deniz text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
                >
                  Film
                </button>
                <button
                  type="button"
                  onClick={() => setEserKategori('dizi')}
                  className={`rounded-sm px-2 py-1 text-xs ${eserKategori === 'dizi' ? 'bg-deniz text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
                >
                  Dizi
                </button>
                <button
                  type="button"
                  onClick={() => setEserKategori('kitap')}
                  className={`rounded-sm px-2 py-1 text-xs ${eserKategori === 'kitap' ? 'bg-deniz text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
                >
                  Kitap
                </button>
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
                  placeholder={eserKategori === 'kitap' ? 'Kitap ara...' : 'Film/dizi ara...'}
                  className="flex-1 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
                <button onClick={eserAra} type="button" className="rounded-sm bg-deniz px-3 py-2 text-xs text-kagit">
                  Ara
                </button>
              </div>
              {eserSonuclari.length > 0 && (
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                  {eserSonuclari.slice(0, 16).map((item) => {
                    const posterUrl =
                      eserKategori === 'kitap'
                        ? item._kaynak === 'ic'
                          ? item.posterUrl || ''
                          : (item.volumeInfo?.imageLinks?.thumbnail || '').replace('http://', 'https://')
                        : item.poster_path && `${TMDB_POSTER}${item.poster_path}`
                    return (
                      <button key={item.id} type="button" onClick={() => eserSec(item)} className="text-left">
                        <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                          {posterUrl && <img src={posterUrl} alt="" className="h-full w-full object-cover" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <textarea
            value={not_}
            onChange={(e) => setNot_(e.target.value.slice(0, 300))}
            placeholder="Neden bunu öneriyorsun? (opsiyonel)"
            rows={2}
            maxLength={300}
            className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />

          <div>
            <label className="mb-1 block text-[11px] text-kraft">Oylama son tarihi (opsiyonel — geçince "kazanan" otomatik belirlenir)</label>
            <input
              type="date"
              value={sonTarih}
              onChange={(e) => setSonTarih(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-kraft">📷 İlgili Sosyal Medya Gönderisi (opsiyonel)</label>
            <input
              type="text"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://www.instagram.com/p/..."
              className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
          </div>

          <button
            type="submit"
            disabled={!seciliEser || kaydediliyor}
            className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {kaydediliyor ? 'Öneriliyor...' : 'Öner'}
          </button>
        </form>
      )}

      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {hata && (
        <p className="text-sm text-muhur">
          Öneriler yüklenemedi: {hata}
          {hata.includes('index') && ' — F12 konsolundaki linke tıklayarak indeksi oluşturabilirsin.'}
        </p>
      )}
      {!yukleniyor && !hata && oneriler.length === 0 && <p className="text-sm text-kraft">Henüz bir öneri yok.</p>}

      {!yukleniyor && (() => {
        // Oylama süresi geçmiş öneriler arasından en çok beğenileni bul —
        // öneri, dönüşene kadar hâlâ listede duruyor, sadece belirgin bir
        // banner ile öne çıkıyor. Yönetici bunu tek tıkla gerçek etkinliğe
        // çevirebiliyor (aynı OneriKarti'deki "Etkinlik Yap" formu).
        const suan = new Date()
        const suresiGecenler = oneriler.filter((o) => o.sonTarih && new Date(o.sonTarih) <= suan)
        if (suresiGecenler.length === 0) return null
        const kazanan = [...suresiGecenler].sort((a, b) => (b.begenenler?.length || 0) - (a.begenenler?.length || 0))[0]
        return (
          <div className="mb-4 rounded-sm bg-gise/15 p-3 ring-1 ring-gise">
            <p className="text-xs font-medium text-murekkep">
              🏆 Oylama süresi doldu — <strong>{kazanan.eserBaslik}</strong> {kazanan.begenenler?.length || 0} beğeniyle önde.
              {yoneticiMiyim ? ' Aşağıdan "Etkinlik Yap" ile onaylayabilirsin.' : ' Yönetici onayı bekleniyor.'}
            </p>
          </div>
        )
      })()}

      <div className="space-y-3">
        {oneriler.map((o) => (
          <OneriKarti
            key={o.id}
            oneri={o}
            kullanici={kullanici}
            uyeMi={uyeMi}
            yoneticiMiyim={yoneticiMiyim}
            topluluk={topluluk}
            onDegisti={yenidenYukle}
          />
        ))}
      </div>
    </div>
  )
}

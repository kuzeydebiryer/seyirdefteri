import { useState } from 'react'
import { wikidataOduluCek } from '../utils/wikidataOdul.js'
import { kategoriEkle, kategorilerGetir, adayEkle, sonucGir } from '../utils/oscar.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'
const TMDB_PROFIL = 'https://image.tmdb.org/t/p/w300'

async function tmdbDetayGetir(tmdbId, tur) {
  if (!TMDB_API_KEY) return null
  const yol = tur === 'dizi' ? 'tv' : tur === 'kisi' ? 'person' : 'movie'
  try {
    const res = await fetch(`https://api.themoviedb.org/3/${yol}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Resmi adaylıklar açıklandıktan SONRA kullanılan içe aktarma aracı —
// Wikidata'dan çekilen liste burada ÖNİZLEME olarak gösteriliyor, hiçbir
// şey otomatik kaydedilmiyor. Kapsam garantili olmadığı için (bkz.
// utils/wikidataOdul.js) kullanıcı yanlış/istenmeyen adayların işaretini
// kaldırıp öyle ekliyor.
export default function WikidataIceAktar({ sezonId, mevcutKategoriSayisi, onEklendi }) {
  const [torenQid, setTorenQid] = useState('')
  const [cekiliyor, setCekiliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [onizleme, setOnizleme] = useState(null) // [{ kategoriAdi, adaylar: [{..., secili}] }]
  const [ekleniyor, setEkleniyor] = useState(false)
  const [ekleIlerleme, setEkleIlerleme] = useState('')

  async function getir(e) {
    e.preventDefault()
    if (!torenQid.trim()) return
    setCekiliyor(true)
    setHata('')
    setOnizleme(null)
    try {
      const sonuc = await wikidataOduluCek(torenQid)
      setOnizleme(sonuc.map((k) => ({ ...k, adaylar: k.adaylar.map((a) => ({ ...a, secili: true })) })))
    } catch (err) {
      setHata(err.message || 'Bir hata oluştu.')
    } finally {
      setCekiliyor(false)
    }
  }

  function nominasyonToggle(kategoriIndex, adayIndex) {
    setOnizleme((onceki) =>
      onceki.map((k, ki) =>
        ki !== kategoriIndex ? k : { ...k, adaylar: k.adaylar.map((a, ai) => (ai !== adayIndex ? a : { ...a, secili: !a.secili })) }
      )
    )
  }

  async function secilenleriEkle() {
    setEkleniyor(true)
    try {
      let kategoriSirasi = mevcutKategoriSayisi
      for (const kategoriGrubu of onizleme) {
        const secilenAdaylar = kategoriGrubu.adaylar.filter((a) => a.secili)
        if (secilenAdaylar.length === 0) continue

        setEkleIlerleme(`"${kategoriGrubu.kategoriAdi}" kategorisi oluşturuluyor...`)
        await kategoriEkle(sezonId, { ad: kategoriGrubu.kategoriAdi, sira: kategoriSirasi++ })
        const guncelKategoriler = await kategorilerGetir(sezonId)
        const kategori = guncelKategoriler.find((k) => k.ad === kategoriGrubu.kategoriAdi)
        if (!kategori) continue

        let sira = 0
        let kazananAdayId = null
        for (const aday of secilenAdaylar) {
          setEkleIlerleme(`"${aday.ad}" ekleniyor...`)
          if (aday.tur === 'kisi') {
            const detay = await tmdbDetayGetir(aday.tmdbId, 'kisi')
            const eklenen = await adayEkle(sezonId, kategori.id, {
              tur: 'film',
              kisiTmdbId: aday.tmdbId ? Number(aday.tmdbId) : null,
              kisiAdi: detay?.name || aday.ad,
              kisiFotoUrl: detay?.profile_path ? `${TMDB_PROFIL}${detay.profile_path}` : '',
              filmBasligi: '',
              sira: sira++,
            })
            if (aday.kazandiMi) kazananAdayId = eklenen?.id
          } else {
            const detay = aday.tmdbId ? await tmdbDetayGetir(aday.tmdbId, aday.tur) : null
            const eklenen = await adayEkle(sezonId, kategori.id, {
              tmdbId: aday.tmdbId ? Number(aday.tmdbId) : null,
              tur: aday.tur === 'dizi' ? 'dizi' : 'film',
              filmBasligi: detay?.title || detay?.name || aday.ad,
              filmYili: (detay?.release_date || detay?.first_air_date || '').slice(0, 4),
              posterUrl: detay?.poster_path ? `${TMDB_POSTER}${detay.poster_path}` : '',
              sira: sira++,
            })
            if (aday.kazandiMi) kazananAdayId = eklenen?.id
          }
        }
        if (kazananAdayId) await sonucGir(kategori.id, kazananAdayId)
      }
      setOnizleme(null)
      setTorenQid('')
      onEklendi()
    } finally {
      setEkleniyor(false)
      setEkleIlerleme('')
    }
  }

  return (
    <div className="max-w-xl space-y-2 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
      <p className="text-xs text-kraft">
        Wikidata'da o yılki törenin sayfasını ara (ör. "98th Academy Awards"), adres çubuğundaki <code>Q</code> ile başlayan kodu
        buraya yapıştır. <strong>Sadece resmi olarak açıklanmış adaylıklar/kazananlar için veri döner</strong> — tahmin aşamasında
        boş gelir, bu normal.
      </p>
      <form onSubmit={getir} className="flex gap-2">
        <input
          type="text"
          value={torenQid}
          onChange={(e) => setTorenQid(e.target.value)}
          placeholder="ör. Q131234567"
          className="flex-1 rounded-sm bg-kagit px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
        />
        <button type="submit" disabled={cekiliyor} className="rounded-sm bg-deniz px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40">
          {cekiliyor ? 'Getiriliyor...' : 'Getir'}
        </button>
      </form>
      {hata && <p className="text-xs text-muhur">{hata}</p>}

      {onizleme && (
        <div className="space-y-3">
          <p className="text-xs text-kraft">Yanlış/istenmeyen olanların işaretini kaldır, sonra ekle.</p>
          {onizleme.map((k, ki) => (
            <div key={ki} className="rounded-sm bg-kagit p-2 ring-1 ring-cizgi">
              <p className="mb-1 text-xs font-medium text-murekkep">{k.kategoriAdi}</p>
              <div className="space-y-0.5">
                {k.adaylar.map((a, ai) => (
                  <label key={ai} className="flex items-center gap-2 text-[11px] text-kraft">
                    <input type="checkbox" checked={a.secili} onChange={() => nominasyonToggle(ki, ai)} className="h-3.5 w-3.5 accent-muhur" />
                    <span className={a.kazandiMi ? 'text-gise' : ''}>
                      {a.ad || '(isimsiz)'} {!a.tmdbId && <span className="text-muhur">— TMDB eşleşmesi yok, elle düzeltilmeli</span>}
                      {a.kazandiMi && ' 🏆'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {ekleniyor && <p className="text-xs text-kraft">{ekleIlerleme}</p>}
          <button
            onClick={secilenleriEkle}
            disabled={ekleniyor}
            className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {ekleniyor ? 'Ekleniyor...' : 'Seçilenleri Ekle'}
          </button>
        </div>
      )}
    </div>
  )
}

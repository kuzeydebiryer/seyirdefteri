import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { anaTurEkle, altTurEkle } from '../utils/sinemaTurleri.js'
import { TMDB_FILM_TURLERI, TMDB_DIZI_TURLERI } from '../data/tmdbTurler.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w200'

// Sadece yönetici görür (bkz. SinemaAltTurleri.jsx'teki kullanım). Önceden
// yeni bir tür/alt tür eklemek kod değişikliği + deploy gerektiriyordu.
// Artık burada, TMDB'de CANLI doğrulama yapılmadan hiçbir alt tür
// kaydedilemiyor — "Türkçe kelime yazsam TMDB'de karşılık bulmaz" endişesi
// tam olarak bunun için: kullanıcı İngilizce bir terim yazıp TMDB'nin gerçek
// anahtar kelimeleri arasından SEÇİYOR, sonra o seçimle kaç film/dizi
// bulunduğunu görüp öyle kaydediyor — kör bir tahmin değil.
export default function SinemaTuruEkleFormu({ anaTurler, onEklendi }) {
  const { kullanici } = useAuth()
  const [acik, setAcik] = useState(false)
  const [mod, setMod] = useState('altTur') // 'altTur' | 'anaTur'

  const [anaTurAdi, setAnaTurAdi] = useState('')
  const [anaTurIkonu, setAnaTurIkonu] = useState('')
  const [anaTurFilmTuru, setAnaTurFilmTuru] = useState('')
  const [anaTurDiziTuru, setAnaTurDiziTuru] = useState('')

  const [seciliAnaTurId, setSeciliAnaTurId] = useState(anaTurler[0]?.id || '')
  const [altTurAdi, setAltTurAdi] = useState('')
  const [altTurIkonu, setAltTurIkonu] = useState('')
  const [kelimeArama, setKelimeArama] = useState('')
  const [kelimeSonuclari, setKelimeSonuclari] = useState(null)
  const [seciliKelimeler, setSeciliKelimeler] = useState([])
  const [testSonucu, setTestSonucu] = useState(null)
  const [testEdiliyor, setTestEdiliyor] = useState(false)

  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState('')

  if (!kullanici) return null

  async function kelimeAra(e) {
    e.preventDefault()
    if (!kelimeArama.trim() || !TMDB_API_KEY) return
    setKelimeSonuclari(null)
    const res = await fetch(`https://api.themoviedb.org/3/search/keyword?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(kelimeArama)}`)
    const data = await res.json()
    setKelimeSonuclari(data.results || [])
  }

  function kelimeSecTiklandi(kelime) {
    if (seciliKelimeler.some((k) => k.id === kelime.id)) {
      setSeciliKelimeler((onceki) => onceki.filter((k) => k.id !== kelime.id))
    } else {
      setSeciliKelimeler((onceki) => [...onceki, { id: kelime.id, ad: kelime.name }])
    }
    setTestSonucu(null)
  }

  async function testEt() {
    if (seciliKelimeler.length === 0) return
    setTestEdiliyor(true)
    setTestSonucu(null)
    try {
      const anaTur = anaTurler.find((a) => a.id === seciliAnaTurId)
      const parcalar = [`api_key=${TMDB_API_KEY}`, 'language=tr-TR', `with_keywords=${seciliKelimeler.map((k) => k.id).join('|')}`]
      if (anaTur?.tmdbFilmTurId) parcalar.push(`with_genres=${anaTur.tmdbFilmTurId}`)
      const res = await fetch(`https://api.themoviedb.org/3/discover/movie?${parcalar.join('&')}`)
      const data = await res.json()
      setTestSonucu({ toplamSonuc: data.total_results || 0, ornekler: (data.results || []).slice(0, 6) })
    } finally {
      setTestEdiliyor(false)
    }
  }

  async function anaTurKaydet(e) {
    e.preventDefault()
    setHata('')
    setKaydediliyor(true)
    try {
      await anaTurEkle(kullanici, {
        ad: anaTurAdi.trim(),
        ikon: anaTurIkonu.trim(),
        tmdbFilmTurId: anaTurFilmTuru ? Number(anaTurFilmTuru) : null,
        tmdbDiziTurId: anaTurDiziTuru ? Number(anaTurDiziTuru) : null,
      })
      setAnaTurAdi('')
      setAnaTurIkonu('')
      setAnaTurFilmTuru('')
      setAnaTurDiziTuru('')
      setAcik(false)
      onEklendi?.()
    } catch (err) {
      setHata('Eklenemedi: ' + err.message)
    } finally {
      setKaydediliyor(false)
    }
  }

  async function altTurKaydet(e) {
    e.preventDefault()
    if (!seciliAnaTurId || seciliKelimeler.length === 0) return
    setHata('')
    setKaydediliyor(true)
    try {
      await altTurEkle(kullanici, { anaTurId: seciliAnaTurId, ad: altTurAdi.trim(), ikon: altTurIkonu.trim(), anahtarKelimeler: seciliKelimeler })
      setAltTurAdi('')
      setAltTurIkonu('')
      setKelimeArama('')
      setKelimeSonuclari(null)
      setSeciliKelimeler([])
      setTestSonucu(null)
      setAcik(false)
      onEklendi?.()
    } catch (err) {
      setHata('Eklenemedi: ' + err.message)
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <div className="mb-6">
      <button onClick={() => setAcik((a) => !a)} className="text-xs text-deniz hover:underline">
        {acik ? 'Vazgeç' : '+ Tür Yönetimi (Yönetici)'}
      </button>

      {acik && (
        <div className="mt-2 max-w-xl space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setMod('altTur')}
              className={`rounded-sm px-3 py-1 text-xs font-govde ${mod === 'altTur' ? 'bg-murekkep text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
            >
              Alt Tür Ekle
            </button>
            <button
              type="button"
              onClick={() => setMod('anaTur')}
              className={`rounded-sm px-3 py-1 text-xs font-govde ${mod === 'anaTur' ? 'bg-murekkep text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
            >
              Yeni Ana Tür Ekle
            </button>
          </div>

          {mod === 'anaTur' ? (
            <form onSubmit={anaTurKaydet} className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] text-kraft">Tür Adı</label>
                <input
                  type="text"
                  value={anaTurAdi}
                  onChange={(e) => setAnaTurAdi(e.target.value)}
                  placeholder="ör. Bilim Kurgu & Fantastik Sineması"
                  required
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-kraft">İkon (tek emoji)</label>
                <input
                  type="text"
                  value={anaTurIkonu}
                  onChange={(e) => setAnaTurIkonu(e.target.value)}
                  placeholder="🚀"
                  required
                  className="w-24 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] text-kraft">TMDB Film Türü</label>
                  <select
                    value={anaTurFilmTuru}
                    onChange={(e) => setAnaTurFilmTuru(e.target.value)}
                    className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                  >
                    <option value="">Yok (sadece anahtar kelime)</option>
                    {Object.entries(TMDB_FILM_TURLERI).map(([id, ad]) => (
                      <option key={id} value={id}>
                        {ad}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-kraft">TMDB Dizi Türü</label>
                  <select
                    value={anaTurDiziTuru}
                    onChange={(e) => setAnaTurDiziTuru(e.target.value)}
                    className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                  >
                    <option value="">Yok (sadece anahtar kelime)</option>
                    {Object.entries(TMDB_DIZI_TURLERI).map(([id, ad]) => (
                      <option key={id} value={id}>
                        {ad}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {hata && <p className="text-xs text-muhur">{hata}</p>}
              <button type="submit" disabled={kaydediliyor} className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40">
                {kaydediliyor ? 'Kaydediliyor...' : 'Ana Türü Kaydet'}
              </button>
            </form>
          ) : (
            <form onSubmit={altTurKaydet} className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] text-kraft">Hangi Ana Türün Altına?</label>
                <select
                  value={seciliAnaTurId}
                  onChange={(e) => setSeciliAnaTurId(e.target.value)}
                  required
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                >
                  {anaTurler.length === 0 && <option value="">Önce bir ana tür ekle</option>}
                  {anaTurler.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.ikon} {a.ad}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr,80px]">
                <div>
                  <label className="mb-1 block text-[11px] text-kraft">Alt Tür Adı (Türkçe)</label>
                  <input
                    type="text"
                    value={altTurAdi}
                    onChange={(e) => setAltTurAdi(e.target.value)}
                    placeholder="ör. Doğaüstü Korku"
                    required
                    className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-kraft">İkon</label>
                  <input
                    type="text"
                    value={altTurIkonu}
                    onChange={(e) => setAltTurIkonu(e.target.value)}
                    placeholder="👻"
                    required
                    className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-kraft">
                  Anahtar Kelime Ara (İngilizce — TMDB'nin veritabanı İngilizce, "doğaüstü" değil "supernatural" yaz)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={kelimeArama}
                    onChange={(e) => setKelimeArama(e.target.value)}
                    placeholder="supernatural"
                    className="flex-1 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                  />
                  <button onClick={kelimeAra} className="rounded-sm bg-deniz px-3 py-1.5 text-xs text-kagit">
                    Ara
                  </button>
                </div>
              </div>

              {kelimeSonuclari && kelimeSonuclari.length === 0 && <p className="text-xs text-kraft">TMDB'de bu terimle eşleşen kelime yok.</p>}
              {kelimeSonuclari && kelimeSonuclari.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {kelimeSonuclari.map((k) => {
                    const seciliMi = seciliKelimeler.some((s) => s.id === k.id)
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => kelimeSecTiklandi(k)}
                        className={`rounded-full px-3 py-1 text-xs ${seciliMi ? 'bg-deniz text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
                      >
                        {seciliMi ? '✓ ' : ''}
                        {k.name}
                      </button>
                    )
                  })}
                </div>
              )}

              {seciliKelimeler.length > 0 && (
                <div>
                  <p className="mb-1 text-[11px] text-kraft">Seçilenler: {seciliKelimeler.map((k) => k.ad).join(', ')}</p>
                  <button
                    type="button"
                    onClick={testEt}
                    disabled={testEdiliyor}
                    className="rounded-sm bg-gise px-3 py-1.5 text-xs text-kagit disabled:opacity-40"
                  >
                    {testEdiliyor ? 'Test ediliyor...' : '🔍 Canlı Test Et'}
                  </button>
                </div>
              )}

              {testSonucu && (
                <div className="rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
                  <p className="mb-2 text-xs text-murekkep">
                    Bu kelimelerle (+ seçili ana türün film türüyle) TMDB'de <strong>{testSonucu.toplamSonuc}</strong> sonuç bulundu.
                  </p>
                  {testSonucu.toplamSonuc === 0 && (
                    <p className="text-xs text-muhur">0 sonuç — bu kelimelerle kaydetmen önerilmez, başka bir terim dene.</p>
                  )}
                  {testSonucu.ornekler.length > 0 && (
                    <div className="flex gap-2">
                      {testSonucu.ornekler.map((f) => (
                        <div key={f.id} className="w-14 shrink-0">
                          {f.poster_path ? (
                            <img
                              src={`${TMDB_POSTER}${f.poster_path}`}
                              alt={f.title}
                              className="aspect-[2/3] w-full rounded-sm object-cover ring-1 ring-cizgi"
                            />
                          ) : (
                            <div className="aspect-[2/3] w-full rounded-sm bg-kagitKoyu ring-1 ring-cizgi" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {hata && <p className="text-xs text-muhur">{hata}</p>}
              <button
                type="submit"
                disabled={kaydediliyor || !seciliAnaTurId || seciliKelimeler.length === 0}
                className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
              >
                {kaydediliyor ? 'Kaydediliyor...' : 'Alt Türü Kaydet'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

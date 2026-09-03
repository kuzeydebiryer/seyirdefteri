import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { listeyeTopluKaydet } from '../utils/disariListeler.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w200'

function csvSatirlariniAyikla(metin) {
  const satirlar = metin.split(/\r?\n/)
  const basligiBul = satirlar.findIndex((s) => s.startsWith('Position,Name,Year'))
  if (basligiBul === -1) return []
  const veriSatirlari = satirlar.slice(basligiBul + 1).filter((s) => s.trim())
  return veriSatirlari.map((satir) => {
    const alanlar = []
    let mevcut = ''
    let tirnakIcinde = false
    for (const karakter of satir) {
      if (karakter === '"') tirnakIcinde = !tirnakIcinde
      else if (karakter === ',' && !tirnakIcinde) {
        alanlar.push(mevcut)
        mevcut = ''
      } else mevcut += karakter
    }
    alanlar.push(mevcut)
    const [pozisyon, ad, yil] = alanlar
    return { siraNo: Number(pozisyon), ad: ad?.trim(), yil: yil?.trim() }
  })
}

// TMDB'nin yıl filtreli aramasında, İLK sonuç neredeyse her zaman doğru
// film oluyor (kullanıcı gözlemi: ~%90) — TMDB zaten alaka düzeyine göre
// sıralıyor. Önceki mantık, TMDB'nin TÜRKÇE çevrilmiş başlığını
// (language=tr-TR ile) CSV'deki İNGİLİZCE başlıkla harfi harfine
// karşılaştırıyordu ("Batı Cephesinde Yeni Bir Şey Yok" ≠ "All Quiet on
// the Western Front") — film doğru bulunmuş olsa bile asla "tam eşleşme"
// sayılmıyordu, gereksiz yere elle çözüm listesine düşüyordu. Şimdi: yıl
// filtreli aramanın İLK sonucunun GERÇEK yılı, CSV'deki yılla eşleşiyorsa
// (dil farkı önemli değil), doğrudan güveniliyor.
async function tmdbdeAra(ad, yil) {
  const yillaRes = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(ad)}&year=${yil}`
  ).then((r) => r.json())
  const yillaSonuclar = yillaRes.results || []
  if (yillaSonuclar.length > 0) return yillaSonuclar

  // Yıllı arama hiç sonuç vermediyse (bazı filmlerde bölgesel çıkış tarihi
  // TMDB'de farklı kaydedilmiş olabiliyor), yılsız dene.
  const yilsizRes = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(ad)}`).then(
    (r) => r.json()
  )
  return yilsizRes.results || []
}

// Otomatik eşleştirmenin sunduğu adaylar arasında doğru film yoksa (bkz.
// "Yi Yi" örneği) — burada kendi arama teriminle TAZE bir TMDB araması
// yapabiliyorsun, otomatik sistemin bulduklarıyla sınırlı kalmıyorsun.
function ElleAramaKutusu({ onSecildi }) {
  const [terim, setTerim] = useState('')
  const [sonuclar, setSonuclar] = useState(null)
  const [ariyor, setAriyor] = useState(false)

  async function ara(e) {
    e.preventDefault()
    if (!terim.trim()) return
    setAriyor(true)
    try {
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(terim)}`)
      const data = await res.json()
      setSonuclar(data.results || [])
    } finally {
      setAriyor(false)
    }
  }

  return (
    <div className="mt-2 border-t border-cizgi pt-2">
      <form onSubmit={ara} className="flex gap-2">
        <input
          type="text"
          value={terim}
          onChange={(e) => setTerim(e.target.value)}
          placeholder="Kendi arama teriminle dene..."
          className="flex-1 rounded-sm bg-kagitKoyu px-2 py-1 text-[11px] text-murekkep ring-1 ring-cizgi"
        />
        <button type="submit" disabled={ariyor} className="rounded-sm bg-deniz px-2 py-1 text-[11px] text-kagit disabled:opacity-40">
          {ariyor ? '...' : 'Ara'}
        </button>
      </form>
      {sonuclar && sonuclar.length === 0 && <p className="mt-1 text-[11px] text-kraft">Sonuç yok.</p>}
      {sonuclar && sonuclar.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {sonuclar.slice(0, 8).map((aday) => (
            <button
              key={aday.id}
              onClick={() => onSecildi(aday)}
              className="flex items-center gap-1.5 rounded-sm bg-kagitKoyu px-2 py-1 text-[11px] text-kraft ring-1 ring-cizgi hover:text-murekkep"
            >
              {aday.poster_path && <img src={`${TMDB_POSTER}${aday.poster_path}`} alt="" className="h-8 w-6 rounded-sm object-cover" />}
              {aday.title} ({(aday.release_date || '').slice(0, 4)})
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Sadece yönetici görür. listeId prop'u ile HANGİ dış listeye kaydedileceği
// belirleniyor — Letterboxd 500, IMDb 250, ileride başka bir liste, hepsi
// aynı bileşeni kullanıyor (bkz. DisListeDetay.jsx).
export default function DisListeIceAktar({ listeId, listeAdi, onEklendi }) {
  const { kullanici, profil } = useAuth()
  const [acik, setAcik] = useState(false)
  const [csvMetni, setCsvMetni] = useState('')
  const [isleniyor, setIsleniyor] = useState(false)
  const [ilerleme, setIlerleme] = useState('')
  const [eslesenler, setEslesenler] = useState([])
  const [eslesmeyenler, setEslesmeyenler] = useState([])
  const [kaydediliyor, setKaydediliyor] = useState(false)
  // Tek seferde HEPSİNİ çözmek zorunda değilsin — "Kaydet" her an
  // basılabilir, o ana kadar eşleşenler Firestore'a yazılır, kalanları
  // istediğin zaman (aynı ya da başka bir oturumda) sürdürebilirsin.
  // toplamKaydedilen, bu oturumda şu ana kadar kaydedilen TOPLAM sayıyı
  // gösteriyor (kaç kez "Kaydet"e basarsan bassın).
  const [toplamKaydedilen, setToplamKaydedilen] = useState(0)

  if (!kullanici || !profil?.yonetici) return null

  async function isle() {
    const satirlar = csvSatirlariniAyikla(csvMetni)
    if (satirlar.length === 0) {
      window.alert("CSV içeriği tanınamadı — dışa aktarılan dosyanın tamamını yapıştırdığından emin ol.")
      return
    }
    setIsleniyor(true)
    const yeniEslesenler = []
    const yeniEslesmeyenler = []
    const GRUP_BOYUTU = 5
    for (let i = 0; i < satirlar.length; i += GRUP_BOYUTU) {
      const grup = satirlar.slice(i, i + GRUP_BOYUTU)
      setIlerleme(`${i}/${satirlar.length} işlendi...`)
      await Promise.all(
        grup.map(async (satir) => {
          const sonuclar = await tmdbdeAra(satir.ad, satir.yil)
          if (sonuclar.length === 0) {
            yeniEslesmeyenler.push({ ...satir, adaylar: [] })
            return
          }
          const ilk = sonuclar[0]
          const ilkYil = (ilk.release_date || '').slice(0, 4)
          if (ilkYil === satir.yil) {
            // TMDB'nin en alakalı (ilk) sonucu, gerçek yılı da CSV'deki
            // yılla eşleşiyor — dil farkı önemli değil, güveniyoruz.
            yeniEslesenler.push({
              siraNo: satir.siraNo,
              tmdbId: ilk.id,
              baslik: ilk.title,
              yil: satir.yil,
              posterUrl: ilk.poster_path ? `${TMDB_POSTER}${ilk.poster_path}` : '',
            })
          } else {
            // İlk sonucun yılı uymuyor — burada otomatik seçim riskli,
            // yönetici elle baksın.
            yeniEslesmeyenler.push({ ...satir, adaylar: sonuclar })
          }
        })
      )
    }
    setEslesenler(yeniEslesenler.sort((a, b) => a.siraNo - b.siraNo))
    setEslesmeyenler(yeniEslesmeyenler.sort((a, b) => a.siraNo - b.siraNo))
    setIsleniyor(false)
    setIlerleme('')
  }

  function elleSecTiklandi(satir, aday) {
    setEslesenler((onceki) =>
      [
        ...onceki,
        {
          siraNo: satir.siraNo,
          tmdbId: aday.id,
          baslik: aday.title,
          yil: satir.yil,
          posterUrl: aday.poster_path ? `${TMDB_POSTER}${aday.poster_path}` : '',
        },
      ].sort((a, b) => a.siraNo - b.siraNo)
    )
    setEslesmeyenler((onceki) => onceki.filter((s) => s.siraNo !== satir.siraNo))
  }

  async function kaydet() {
    if (eslesenler.length === 0) return
    setKaydediliyor(true)
    try {
      await listeyeTopluKaydet(kullanici, listeId, eslesenler)
      setToplamKaydedilen((n) => n + eslesenler.length)
      setEslesenler([]) // az önce kaydedilenler artık Firestore'da, tekrar göndermeye gerek yok
      onEklendi?.()
    } finally {
      setKaydediliyor(false)
    }
  }

  const isFullyDone = eslesenler.length === 0 && eslesmeyenler.length === 0 && toplamKaydedilen > 0

  return (
    <div className="mb-6">
      <button onClick={() => setAcik((a) => !a)} className="text-xs text-deniz hover:underline">
        {acik ? 'Vazgeç' : `+ ${listeAdi} CSV İçe Aktar (Yönetici)`}
      </button>

      {acik && (
        <div className="mt-2 max-w-xl space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          {toplamKaydedilen > 0 && (
            <p className="text-sm text-gise">
              ✓ Şu ana kadar {toplamKaydedilen} film kaydedildi{isFullyDone ? ' — hepsi tamamlandı!' : '.'}
            </p>
          )}
          {!isFullyDone && (
            <>
              <p className="text-xs text-kraft">
                Letterboxd'da listenin sağ altındaki "Export list" ile indirdiğin CSV dosyasının İÇERİĞİNİ (tamamını,
                olduğu gibi) aşağıya yapıştır. Daha önce kaydettiklerini tekrar yapıştırsan da sorun olmaz — aynı film
                tekrar üzerine yazılır, çoğalmaz.
              </p>
              <textarea
                value={csvMetni}
                onChange={(e) => setCsvMetni(e.target.value)}
                rows={6}
                disabled={isleniyor || eslesenler.length > 0 || eslesmeyenler.length > 0}
                placeholder="Letterboxd list export v7&#10;Date,Name,Tags,URL,Description&#10;..."
                className="w-full rounded-sm bg-kagit px-3 py-2 text-xs text-murekkep ring-1 ring-cizgi"
              />
              {eslesenler.length === 0 && eslesmeyenler.length === 0 && (
                <button
                  onClick={isle}
                  disabled={isleniyor || !csvMetni.trim()}
                  className="rounded-sm bg-deniz px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
                >
                  {isleniyor ? ilerleme || 'İşleniyor...' : 'TMDB ile Eşleştir'}
                </button>
              )}

              {(eslesenler.length > 0 || eslesmeyenler.length > 0) && !isleniyor && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-sm bg-kagit p-2 ring-1 ring-cizgi">
                    <p className="text-xs text-murekkep">
                      {eslesenler.length} film kaydedilmeyi bekliyor.{' '}
                      {eslesmeyenler.length > 0 && <span className="text-muhur">{eslesmeyenler.length} film hâlâ elle çözülmeli.</span>}
                    </p>
                    <button
                      onClick={kaydet}
                      disabled={kaydediliyor || eslesenler.length === 0}
                      className="shrink-0 rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
                    >
                      {kaydediliyor ? 'Kaydediliyor...' : `${eslesenler.length} Filmi Şimdi Kaydet`}
                    </button>
                  </div>
                  <p className="text-[11px] text-kraft">
                    Yorulursan buradan istediğin an "Kaydet"e basıp bırakabilirsin — kalan {eslesmeyenler.length} film
                    kaybolmaz, sadece bekler. Daha sonra CSV'yi tekrar yapıştırıp devam edebilirsin.
                  </p>

                  {eslesmeyenler.map((satir) => (
                    <div key={satir.siraNo} className="rounded-sm bg-kagit p-2 ring-1 ring-cizgi">
                      <p className="mb-1 text-xs text-murekkep">
                        #{satir.siraNo} — {satir.ad} ({satir.yil})
                      </p>
                      {satir.adaylar.length === 0 ? (
                        <p className="text-[11px] text-kraft">TMDB'de otomatik bir sonuç bulunamadı — aşağıdan kendin ara.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {satir.adaylar.slice(0, 8).map((aday) => (
                            <button
                              key={aday.id}
                              onClick={() => elleSecTiklandi(satir, aday)}
                              className="flex items-center gap-1.5 rounded-sm bg-kagitKoyu px-2 py-1 text-[11px] text-kraft ring-1 ring-cizgi hover:text-murekkep"
                            >
                              {aday.poster_path && <img src={`${TMDB_POSTER}${aday.poster_path}`} alt="" className="h-8 w-6 rounded-sm object-cover" />}
                              {aday.title} ({(aday.release_date || '').slice(0, 4)})
                            </button>
                          ))}
                        </div>
                      )}
                      <ElleAramaKutusu onSecildi={(aday) => elleSecTiklandi(satir, aday)} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

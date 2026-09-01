import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { letterboxd500TopluKaydet } from '../utils/letterboxd500.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w200'

// Letterboxd'un "listeyi CSV olarak dışa aktar" özelliğinin ürettiği dosya
// yapısı: ilk birkaç satır liste meta bilgisi, sonra "Position,Name,Year,
// URL,Description" başlığı, sonra 500 satır veri. Sadece bu ikinci başlığı
// arıyoruz, öncesini atlıyoruz.
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

async function tmdbdeAra(ad, yil) {
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(ad)}&year=${yil}`
  const res = await fetch(url)
  const data = await res.json()
  return data.results || []
}

// Sadece yönetici görür. 500 satırlık bir listeyi tek tek "ara, seç, ekle"
// yapmak pratik değildi — bu yüzden Oscar'daki "Toplu Ekle" mantığının
// büyütülmüş hali: her satır otomatik TMDB'de aranıyor, YIL da eşleşen
// TEK bir sonuç varsa otomatik seçiliyor; birden fazla/hiç sonuç yoksa
// "eşleşmedi" listesine düşüyor, yönetici SADECE o kalanları elle çözüyor
// (yüzlerce değil, genelde bir avuç film).
export default function Letterboxd500IceAktar() {
  const { kullanici, profil } = useAuth()
  const [acik, setAcik] = useState(false)
  const [csvMetni, setCsvMetni] = useState('')
  const [isleniyor, setIsleniyor] = useState(false)
  const [ilerleme, setIlerleme] = useState('')
  const [eslesenler, setEslesenler] = useState([])
  const [eslesmeyenler, setEslesmeyenler] = useState([])
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [tamamlandi, setTamamlandi] = useState(false)

  if (!kullanici || !profil?.yonetici) return null

  async function isle() {
    const satirlar = csvSatirlariniAyikla(csvMetni)
    if (satirlar.length === 0) {
      window.alert("CSV içeriği tanınamadı — Letterboxd'un dışa aktardığı dosyanın tamamını yapıştırdığından emin ol.")
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
          if (sonuclar.length === 1) {
            const f = sonuclar[0]
            yeniEslesenler.push({
              siraNo: satir.siraNo,
              tmdbId: f.id,
              baslik: f.title,
              yil: satir.yil,
              posterUrl: f.poster_path ? `${TMDB_POSTER}${f.poster_path}` : '',
            })
          } else if (sonuclar.length > 1) {
            const tamEslesen = sonuclar.find((f) => f.title === satir.ad && (f.release_date || '').slice(0, 4) === satir.yil)
            if (tamEslesen) {
              yeniEslesenler.push({
                siraNo: satir.siraNo,
                tmdbId: tamEslesen.id,
                baslik: tamEslesen.title,
                yil: satir.yil,
                posterUrl: tamEslesen.poster_path ? `${TMDB_POSTER}${tamEslesen.poster_path}` : '',
              })
            } else {
              yeniEslesmeyenler.push({ ...satir, adaylar: sonuclar })
            }
          } else {
            yeniEslesmeyenler.push({ ...satir, adaylar: [] })
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
    setKaydediliyor(true)
    try {
      await letterboxd500TopluKaydet(kullanici, eslesenler)
      setTamamlandi(true)
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <div className="mb-6">
      <button onClick={() => setAcik((a) => !a)} className="text-xs text-deniz hover:underline">
        {acik ? 'Vazgeç' : '+ Letterboxd 500 İçe Aktar (Yönetici)'}
      </button>

      {acik && (
        <div className="mt-2 max-w-xl space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          {tamamlandi ? (
            <p className="text-sm text-gise">✓ {eslesenler.length} film kaydedildi.</p>
          ) : (
            <>
              <p className="text-xs text-kraft">
                Letterboxd'da listenin sağ altındaki "Export list" ile indirdiğin CSV dosyasının İÇERİĞİNİ (tamamını, olduğu
                gibi) aşağıya yapıştır.
              </p>
              <textarea
                value={csvMetni}
                onChange={(e) => setCsvMetni(e.target.value)}
                rows={6}
                disabled={isleniyor || eslesenler.length > 0}
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
                  <p className="text-xs text-murekkep">
                    ✓ {eslesenler.length} film otomatik eşleşti.{' '}
                    {eslesmeyenler.length > 0 && <span className="text-muhur">{eslesmeyenler.length} film elle çözülmeli.</span>}
                  </p>

                  {eslesmeyenler.map((satir) => (
                    <div key={satir.siraNo} className="rounded-sm bg-kagit p-2 ring-1 ring-cizgi">
                      <p className="mb-1 text-xs text-murekkep">
                        #{satir.siraNo} — {satir.ad} ({satir.yil})
                      </p>
                      {satir.adaylar.length === 0 ? (
                        <p className="text-[11px] text-kraft">TMDB'de hiç sonuç bulunamadı, bu film listeden çıkarılacak.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {satir.adaylar.slice(0, 5).map((aday) => (
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
                    </div>
                  ))}

                  {eslesmeyenler.length === 0 && (
                    <button onClick={kaydet} disabled={kaydediliyor} className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40">
                      {kaydediliyor ? 'Kaydediliyor...' : `${eslesenler.length} Filmi Kaydet`}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

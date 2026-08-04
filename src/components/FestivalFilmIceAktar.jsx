import { useState } from 'react'
import Papa from 'papaparse'
import { filmSatirlariniAyikla, tmdbdeAra, esZamanliIsle, TMDB_POSTER } from '../utils/letterboxdCsv.js'
import { festivalFilmEkle } from '../utils/festival.js'

const ES_ZAMANLILIK = 6

// Festival seçkileri için ücretsiz bir API yok, ama Letterboxd'da sinefillerin
// hazırladığı "Cannes 2026 Official Selection" tarzı listeler var. Bu bileşen,
// aynen Kişisel Listeler'deki Letterboxd içe aktarma akışını kullanıyor —
// sadece hedef `kisiselListeOgeleri` değil `festivalFilmleri`.
export default function FestivalFilmIceAktar({ sezonId, mevcutFilmSayisi, onTamamlandi }) {
  const [dosyaAdi, setDosyaAdi] = useState('')
  const [satirlar, setSatirlar] = useState([])
  const [eslestiriliyor, setEslestiriliyor] = useState(false)
  const [ilerleme, setIlerleme] = useState({ tamam: 0, toplam: 0 })
  const [iceAktariliyor, setIceAktariliyor] = useState(false)
  const [hata, setHata] = useState('')

  function dosyaSecildi(e) {
    const dosya = e.target.files?.[0]
    if (!dosya) return
    setDosyaAdi(dosya.name)
    setHata('')
    setSatirlar([])

    Papa.parse(dosya, {
      header: false,
      skipEmptyLines: true,
      complete: async (sonuc) => {
        const ham = filmSatirlariniAyikla(sonuc.data)
        if (ham.length === 0) {
          setHata('CSV içinde "Name"/"Year" sütunlarını içeren bir tablo bulunamadı.')
          return
        }
        setEslestiriliyor(true)
        setIlerleme({ tamam: 0, toplam: ham.length })
        const eslestirilmis = await esZamanliIsle(
          ham,
          async (satir) => {
            const bulunan = await tmdbdeAra(satir.isim, satir.yil)
            return {
              ...satir,
              eslesme: bulunan
                ? {
                    tmdbId: bulunan.id,
                    baslik: bulunan.title,
                    yil: bulunan.release_date ? bulunan.release_date.slice(0, 4) : satir.yil,
                    posterUrl: bulunan.poster_path ? `${TMDB_POSTER}${bulunan.poster_path}` : '',
                  }
                : null,
              secili: !!bulunan,
            }
          },
          ES_ZAMANLILIK,
          (tamam, toplam) => setIlerleme({ tamam, toplam })
        )
        setSatirlar(eslestirilmis)
        setEslestiriliyor(false)
      },
      error: () => setHata('CSV dosyası okunamadı.'),
    })
  }

  function secimDegistir(i) {
    setSatirlar((liste) => liste.map((s, idx) => (idx === i ? { ...s, secili: !s.secili } : s)))
  }

  async function iceAktar() {
    const secilenler = satirlar.filter((s) => s.secili && s.eslesme)
    if (secilenler.length === 0) return
    setIceAktariliyor(true)
    setIlerleme({ tamam: 0, toplam: secilenler.length })
    let sonrakiSira = mevcutFilmSayisi || 0
    for (const s of secilenler) {
      await festivalFilmEkle(sezonId, {
        tmdbId: s.eslesme.tmdbId,
        filmBasligi: s.eslesme.baslik,
        filmYili: s.eslesme.yil,
        posterUrl: s.eslesme.posterUrl,
        sira: sonrakiSira,
      })
      sonrakiSira += 1
      setIlerleme((onceki) => ({ ...onceki, tamam: onceki.tamam + 1 }))
    }
    setIceAktariliyor(false)
    onTamamlandi()
  }

  return (
    <div className="space-y-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
      <p className="text-xs text-kraft">
        Letterboxd'da festivalin resmi seçkisini (ör. "Cannes 2026 Official Selection") bir liste olarak hazırlayıp
        CSV olarak dışa aktar, buraya yükle. Her satır TMDB'de aranır; yanlış/eksik eşleşmelerin işaretini kaldırarak
        dışarıda bırakabilirsin.
      </p>

      <input
        type="file"
        accept=".csv"
        onChange={dosyaSecildi}
        disabled={eslestiriliyor || iceAktariliyor}
        className="w-full rounded-sm bg-kagit px-3 py-2 text-xs text-murekkep ring-1 ring-cizgi"
      />
      {dosyaAdi && <p className="text-[11px] text-kraft">{dosyaAdi}</p>}
      {hata && <p className="text-xs text-muhur">{hata}</p>}

      {eslestiriliyor && (
        <p className="text-xs text-kraft">
          Eşleştiriliyor... {ilerleme.tamam}/{ilerleme.toplam}
        </p>
      )}

      {!eslestiriliyor && satirlar.length > 0 && (
        <>
          <p className="text-xs text-kraft">
            {satirlar.filter((s) => s.eslesme).length}/{satirlar.length} eşleşti. İçe aktarmadan önce kontrol et:
          </p>
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {satirlar.map((s, i) => (
              <li
                key={i}
                className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs ${s.eslesme ? '' : 'opacity-50'}`}
              >
                <input
                  type="checkbox"
                  checked={s.secili}
                  onChange={() => secimDegistir(i)}
                  disabled={!s.eslesme}
                  className="shrink-0"
                />
                {s.eslesme?.posterUrl && (
                  <img src={s.eslesme.posterUrl} alt="" className="h-10 w-7 shrink-0 rounded-sm object-cover" />
                )}
                <span className="min-w-0 flex-1 truncate text-murekkep">
                  {s.isim} {s.yil && `(${s.yil})`}
                </span>
                {!s.eslesme && <span className="shrink-0 text-muhur">Eşleşme yok</span>}
              </li>
            ))}
          </ul>

          <button
            onClick={iceAktar}
            disabled={iceAktariliyor || satirlar.every((s) => !s.secili)}
            className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {iceAktariliyor
              ? `İçe aktarılıyor... ${ilerleme.tamam}/${ilerleme.toplam}`
              : `Seçilenleri İçe Aktar (${satirlar.filter((s) => s.secili).length})`}
          </button>
        </>
      )}
    </div>
  )
}

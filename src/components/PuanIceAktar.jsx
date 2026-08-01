import { useState } from 'react'
import Papa from 'papaparse'
import { useAuth } from '../context/AuthContext.jsx'
import { eserPuanla } from '../utils/eserPuani.js'
import { filmSatirlariniAyikla, tmdbdeAra, esZamanliIsle, TMDB_POSTER } from '../utils/letterboxdCsv.js'

const ES_ZAMANLILIK = 6

export default function PuanIceAktar({ onTamamlandi }) {
  const { kullanici } = useAuth()
  const [dosyaAdi, setDosyaAdi] = useState('')
  const [satirlar, setSatirlar] = useState([]) // { isim, yil, puan, secili, eslesme }
  const [eslestiriliyor, setEslestiriliyor] = useState(false)
  const [ilerleme, setIlerleme] = useState({ tamam: 0, toplam: 0 })
  const [iceAktariliyor, setIceAktariliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [tamamlandi, setTamamlandi] = useState(false)

  function dosyaSecildi(e) {
    const dosya = e.target.files?.[0]
    if (!dosya) return
    setDosyaAdi(dosya.name)
    setHata('')
    setSatirlar([])
    setTamamlandi(false)

    Papa.parse(dosya, {
      header: false,
      skipEmptyLines: true,
      complete: async (sonuc) => {
        const ham = filmSatirlariniAyikla(sonuc.data).filter((s) => s.puan && !isNaN(Number(s.puan)))

        if (ham.length === 0) {
          setHata(
            'Bu dosyada bir "Rating" sütunu bulunamadı ya da hiçbir satırda puan yok. "ratings.csv" ya da "diary.csv" dosyasını yükle.'
          )
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
    if (secilenler.length === 0 || !kullanici) return
    setIceAktariliyor(true)
    setIlerleme({ tamam: 0, toplam: secilenler.length })
    await esZamanliIsle(
      secilenler,
      async (s) => {
        await eserPuanla('sinema', s.eslesme.tmdbId, Number(s.puan), kullanici, {
          baslik: s.eslesme.baslik,
          alt: s.eslesme.yil,
          posterUrl: s.eslesme.posterUrl,
        })
      },
      8,
      (tamam, toplam) => setIlerleme({ tamam, toplam })
    )
    setIceAktariliyor(false)
    setTamamlandi(true)
    onTamamlandi?.()
  }

  const cokBuyukListe = satirlar.length > 200

  return (
    <div className="space-y-3">
      <p className="text-xs text-kraft">
        Letterboxd'dan indirdiğin export ZIP'inin içinden <code>ratings.csv</code> (ya da puanları da içeren{' '}
        <code>diary.csv</code>) dosyasını yükle. Puan ölçeği (0.5-5 yıldız) birebir aynı olduğu için hiçbir dönüşüm
        gerekmiyor. Bu, sadece puanlarını dolduracak — geçmişe dönük yüzlerce gönderi oluşturmayacak, akışın
        şişmeyecek.
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
          {ilerleme.toplam > 300 && ' — büyük bir liste, biraz zaman alabilir, sekmeyi kapatma.'}
        </p>
      )}

      {tamamlandi && !eslestiriliyor && (
        <p className="text-xs text-murekkep">✓ İçe aktarma tamamlandı. Profilindeki puanlarına bakabilirsin.</p>
      )}

      {!eslestiriliyor && satirlar.length > 0 && !tamamlandi && (
        <>
          <p className="text-xs text-kraft">
            {satirlar.filter((s) => s.eslesme).length}/{satirlar.length} eşleşti.
            {cokBuyukListe
              ? ' Liste büyük olduğu için önizlemede afişler gösterilmiyor, sadece eşleşme durumu.'
              : ' İçe aktarmadan önce kontrol et:'}
          </p>
          <ul className="max-h-96 space-y-1 overflow-y-auto">
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
                {!cokBuyukListe && s.eslesme?.posterUrl && (
                  <img src={s.eslesme.posterUrl} alt="" className="h-10 w-7 shrink-0 rounded-sm object-cover" />
                )}
                <span className="min-w-0 flex-1 truncate text-murekkep">
                  {s.isim} {s.yil && `(${s.yil})`}
                </span>
                <span className="shrink-0 text-kraft">★ {s.puan}</span>
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

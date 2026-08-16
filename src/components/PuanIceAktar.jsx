import { useState } from 'react'
import Papa from 'papaparse'
import { useAuth } from '../context/AuthContext.jsx'
import { eserPuanla, eserPuaniGetir, eserPuanindaGunlukVarIsaretle } from '../utils/eserPuani.js'
import { gunlukKaydiEkle } from '../utils/gunluk.js'
import { filmSatirlariniAyikla, tmdbdeAra, esZamanliIsle, TMDB_POSTER } from '../utils/letterboxdCsv.js'
import { turIsimleriGetir } from '../data/tmdbTurler.js'

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
                    turler: turIsimleriGetir(bulunan.genre_ids),
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
    const basarisizlar = []
    await esZamanliIsle(
      secilenler,
      async (s) => {
        // Tek bir satırdaki hata (ör. izin/ağ sorunu) tüm içe aktarmayı
        // sessizce çökertip donuk bırakmasın diye — hatayı burada
        // yakalayıp o satırı "başarısız" olarak işaretleyip devam ediyoruz.
        try {
          // Bu esere DAHA ÖNCE (önceki bir içe aktarmada) zaten doğru
          // tarihli bir günlük kaydı düşürülmüş mü diye kontrol ediyoruz —
          // bu sayede içe aktarmayı güvenle TEKRAR çalıştırabilirsin (ör.
          // bu düzeltmeden önce yapılmış, günlük kaydı olmayan eski bir
          // içe aktarmayı düzeltmek için), mükerrer günlük satırı oluşmadan.
          const mevcutKayit = await eserPuaniGetir('sinema', s.eslesme.tmdbId, kullanici.uid)
          const gunlukZatenVar = mevcutKayit?.gunlukVar === true

          await eserPuanla('sinema', s.eslesme.tmdbId, Number(s.puan), kullanici, {
            baslik: s.eslesme.baslik,
            alt: s.eslesme.yil,
            posterUrl: s.eslesme.posterUrl,
            yil: s.eslesme.yil,
            turler: s.eslesme.turler,
          })
          // Aggregate puanın yanında GERÇEK izleme tarihiyle bir günlük kaydı da
          // düşüyoruz — CSV'de tarih yoksa (bazı export'larda olmayabilir)
          // günlük kaydı hiç oluşturulmuyor (Yılın Özeti'nde "bugün izlendi"
          // gibi yanlış bir kayıt bırakmamak için, boş bırakmak yanlış bir
          // tarih uydurmaktan daha doğru).
          if (s.izlemeTarihi && !gunlukZatenVar) {
            await gunlukKaydiEkle(kullanici, {
              tur: 'sinema',
              disId: s.eslesme.tmdbId,
              baslik: s.eslesme.baslik,
              posterUrl: s.eslesme.posterUrl,
              yil: s.eslesme.yil,
              izlemeTarihiISO: s.izlemeTarihi,
              puan: Number(s.puan),
              tekrarMi: s.tekrarMi,
            })
            await eserPuanindaGunlukVarIsaretle('sinema', s.eslesme.tmdbId, kullanici.uid)
          }
        } catch (err) {
          console.warn(`İçe aktarma hatası (${s.isim}):`, err.message)
          basarisizlar.push(s.isim)
        }
      },
      8,
      (tamam, toplam) => setIlerleme({ tamam, toplam })
    )
    setIceAktariliyor(false)
    setTamamlandi(true)
    if (basarisizlar.length > 0) {
      setHata(`${basarisizlar.length} satır kaydedilemedi (izin/ağ hatası). Konsolda (F12) hangileri olduğunu görebilirsin.`)
    }
    onTamamlandi?.()
  }

  const cokBuyukListe = satirlar.length > 200

  return (
    <div className="space-y-3">
      <p className="text-xs text-kraft">
        Letterboxd'dan indirdiğin export ZIP'inin içinden <code>ratings.csv</code> (ya da puanları da içeren{' '}
        <code>diary.csv</code>) dosyasını yükle. Puan ölçeği (0.5-5 yıldız) birebir aynı olduğu için hiçbir dönüşüm
        gerekmiyor. Bu, sadece puanlarını dolduracak — geçmişe dönük yüzlerce gönderi oluşturmayacak, akışın
        şişmeyecek. Dosyada "Watched Date"/"Date" sütunu varsa (ikisinde de genelde var), gerçek izleme tarihi de
        kaydedilip Günlük'üne ve Yılın Özeti'ne doğru tarihle yansıyor — yoksa o satır için günlük kaydı
        oluşturulmuyor (tarihi olmayan bir satırı "bugün izlendi" gibi göstermemek için). Aynı dosyayı{' '}
        <strong>güvenle tekrar yükleyebilirsin</strong> — daha önce doğru günlük kaydı düşürülmüş satırlar tekrar
        işlenmez, mükerrer kayıt oluşmaz (sadece puanlar güncellenir).
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
                {s.izlemeTarihi && <span className="shrink-0 text-[10px] text-kraft">{s.izlemeTarihi}</span>}
                {s.tekrarMi && <span className="shrink-0 text-[10px] text-kraft">🔄</span>}
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

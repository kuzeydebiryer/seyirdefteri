import { useState } from 'react'
import { Link } from 'react-router-dom'

const AY_ADLARI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

function tariheDevir(deger) {
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  return isNaN(d.getTime()) ? null : d
}

function esereLink(tur, disId) {
  if (tur === 'kitap') return `/kitap/${disId}`
  if (tur === 'dizi') return `/dizi/${disId}`
  return `/film/${disId}`
}

// Profilde zaten var olan üç veri kaynağından yıllık bir özet hesaplar.
//
// ÖNEMLİ — tarih kaynağı önceliği: "gunlukKayitlari" (bkz. utils/gunluk.js)
// birincil kaynak, çünkü orada tutulan "izlemeTarihi" kullanıcının kendi
// belirttiği GERÇEK tarih (Letterboxd içe aktarımında CSV'den, elle
// eklemede kullanıcının seçtiği tarihten). "gonderiler" ve "eserPuanlarim"
// ise sadece o kaydın OLUŞTURULMA anını taşıyor — organik (içe aktarılmamış)
// paylaşımlar için genelde izleme tarihine yakın olur, ama garantisi yok.
// Bu yüzden: bir esere zaten bir gunlukKaydı varsa, o esere ait gönderi/puan
// bu hesaplamaya ikinci kez dahil edilmiyor (çift saymamak için).
export default function YilOzeti({ gonderiler, eserPuanlarim, gunlukKayitlari = [] }) {
  const eserAnahtari = (tur, disId) => `${tur}_${disId}`
  const gunlukKapsananlar = new Set(gunlukKayitlari.map((g) => eserAnahtari(g.tur, g.disId)))

  // Tüm kaynakları TEK bir şekle indirgiyoruz: {tur, disId, baslik, posterUrl, tarih, puan, kaynak}
  const gunlukOlaylari = gunlukKayitlari.map((g) => ({
    tur: g.tur,
    disId: g.disId,
    baslik: g.baslik,
    posterUrl: g.posterUrl,
    tarih: g.izlemeTarihi,
    puan: g.puan,
    kaynak: 'gunluk',
  }))
  const gonderiOlaylari = gonderiler
    .filter((g) => g.posterUrl && !gunlukKapsananlar.has(eserAnahtari(g.tur, g.tmdbId || g.googleBooksId)))
    .map((g) => ({
      tur: g.tur,
      disId: g.tmdbId || g.googleBooksId,
      baslik: g.baslik,
      posterUrl: g.posterUrl,
      tarih: g.tarih,
      puan: g.kullaniciPuani,
      kaynak: 'gonderi',
      gonderiId: g.id,
    }))
  const puanOlaylari = eserPuanlarim
    .filter((e) => !gunlukKapsananlar.has(eserAnahtari(e.tur, e.disId)))
    .filter((e) => !gonderiOlaylari.some((g) => g.tur === e.tur && g.disId === e.disId))
    .map((e) => ({ tur: e.tur, disId: e.disId, baslik: e.baslik, posterUrl: e.posterUrl, tarih: e.tarih, puan: e.puan, kaynak: 'puan' }))

  const tumOlaylar = [...gunlukOlaylari, ...gonderiOlaylari, ...puanOlaylari]

  const tumYillar = [...new Set(tumOlaylar.map((o) => tariheDevir(o.tarih)?.getFullYear()).filter(Boolean))].sort(
    (a, b) => b - a
  )

  const [seciliYil, setSeciliYil] = useState(tumYillar[0] || new Date().getFullYear())

  if (tumYillar.length === 0) {
    return <p className="text-sm text-kraft">Henüz özetlenecek bir etkinlik yok.</p>
  }

  const buYilOlaylar = tumOlaylar.filter((o) => tariheDevir(o.tarih)?.getFullYear() === seciliYil)

  function turSayisi(tur) {
    return buYilOlaylar.filter((o) => o.tur === tur).length
  }

  const filmSayisi = turSayisi('sinema')
  const diziSayisi = turSayisi('dizi')
  const kitapSayisi = turSayisi('kitap')
  const yaziSayisi = gonderiler.filter((g) => g.tur === 'yazi' && tariheDevir(g.tarih)?.getFullYear() === seciliYil).length
  const geziSayisi = gonderiler.filter((g) => g.tur === 'gezi' && tariheDevir(g.tarih)?.getFullYear() === seciliYil).length

  const puanliOlaylar = buYilOlaylar.filter((o) => o.puan != null)
  const ortalamaPuan = puanliOlaylar.length ? puanliOlaylar.reduce((t, o) => t + o.puan, 0) / puanliOlaylar.length : null
  const enYuksekPuanli = [...puanliOlaylar].sort((a, b) => (b.puan || 0) - (a.puan || 0))[0]

  // En aktif ay — o ay içindeki toplam olay sayısına göre (günce + günlük kaydı).
  const ayDagilimi = Array(12).fill(0)
  buYilOlaylar.forEach((o) => {
    const ay = tariheDevir(o.tarih)?.getMonth()
    if (ay != null) ayDagilimi[ay]++
  })
  const enAktifAyIndex = ayDagilimi.some((n) => n > 0) ? ayDagilimi.indexOf(Math.max(...ayDagilimi)) : null

  const toplamEser = filmSayisi + diziSayisi + kitapSayisi

  return (
    <div>
      {tumYillar.length > 1 && (
        <div className="mb-4 flex gap-2">
          {tumYillar.map((y) => (
            <button
              key={y}
              onClick={() => setSeciliYil(y)}
              className={`rounded-sm px-3 py-1 font-govde text-xs ${
                seciliYil === y ? 'bg-murekkep text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {toplamEser === 0 && yaziSayisi === 0 && geziSayisi === 0 ? (
        <p className="text-sm text-kraft">{seciliYil} yılında henüz bir etkinlik yok.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-sm bg-kagitKoyu p-4 text-center ring-1 ring-cizgi">
              <p className="font-baslik text-3xl text-murekkep">{filmSayisi}</p>
              <p className="text-xs text-kraft">🎬 Film</p>
            </div>
            <div className="rounded-sm bg-kagitKoyu p-4 text-center ring-1 ring-cizgi">
              <p className="font-baslik text-3xl text-murekkep">{diziSayisi}</p>
              <p className="text-xs text-kraft">📺 Dizi</p>
            </div>
            <div className="rounded-sm bg-kagitKoyu p-4 text-center ring-1 ring-cizgi">
              <p className="font-baslik text-3xl text-murekkep">{kitapSayisi}</p>
              <p className="text-xs text-kraft">📖 Kitap</p>
            </div>
            <div className="rounded-sm bg-kagitKoyu p-4 text-center ring-1 ring-cizgi">
              <p className="font-baslik text-3xl text-murekkep">{yaziSayisi + geziSayisi}</p>
              <p className="text-xs text-kraft">✍️ Yazı/Gezi</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-murekkep">
            {ortalamaPuan != null && (
              <p>
                Ortalama puanın: <span className="font-medium text-gise">★ {ortalamaPuan.toFixed(1)}</span>
              </p>
            )}
            {enAktifAyIndex != null && (
              <p>
                En üretken ayın: <span className="font-medium">{AY_ADLARI[enAktifAyIndex]}</span> ({ayDagilimi[enAktifAyIndex]} paylaşım)
              </p>
            )}
          </div>

          {enYuksekPuanli && (
            <div className="mt-4 flex items-center gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
              {enYuksekPuanli.posterUrl && (
                <img
                  src={enYuksekPuanli.posterUrl}
                  alt={enYuksekPuanli.baslik}
                  className="h-20 w-14 shrink-0 rounded-sm object-cover ring-1 ring-cizgi"
                />
              )}
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-gise">{seciliYil}'in en yükseğini verdiğin</p>
                <Link
                  to={enYuksekPuanli.kaynak === 'gonderi' ? `/gonderi/${enYuksekPuanli.gonderiId}` : esereLink(enYuksekPuanli.tur, enYuksekPuanli.disId)}
                  className="font-baslik text-base text-murekkep hover:underline"
                >
                  {enYuksekPuanli.baslik}
                </Link>
                <p className="text-xs text-kraft">★ {enYuksekPuanli.puan}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

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

// Profilde zaten var olan iki veri kaynağından (günceler + doğrudan puanlar)
// yıllık bir özet hesaplar — yeni bir Firestore koleksiyonu gerekmiyor, hepsi
// istemci tarafında, elde olan veriden türetiliyor.
export default function YilOzeti({ gonderiler, eserPuanlarim }) {
  // Verideki tüm yılların birleşimi (en yeniden eskiye) — kullanıcı geçmiş
  // yılları da görebilsin diye.
  const tumYillar = [
    ...new Set(
      [...gonderiler.map((g) => g.tarih), ...eserPuanlarim.map((e) => e.tarih)]
        .map((t) => tariheDevir(t)?.getFullYear())
        .filter(Boolean)
    ),
  ].sort((a, b) => b - a)

  const [seciliYil, setSeciliYil] = useState(tumYillar[0] || new Date().getFullYear())

  if (tumYillar.length === 0) {
    return <p className="text-sm text-kraft">Henüz özetlenecek bir etkinlik yok.</p>
  }

  const buYilGonderiler = gonderiler.filter((g) => tariheDevir(g.tarih)?.getFullYear() === seciliYil)
  const buYilPuanlar = eserPuanlarim.filter((e) => tariheDevir(e.tarih)?.getFullYear() === seciliYil)

  // "İzlediklerim" sekmesindeki mantığın aynısı: günce + doğrudan puanı
  // birleştirip aynı esere ait tekrarları ele (bir eser hem günce hem ayrı
  // puanla değerlendirilmiş olabilir).
  function turSayisi(tur) {
    const gundenGelenler = buYilGonderiler.filter((g) => g.tur === tur && g.posterUrl)
    const puandanGelenler = buYilPuanlar.filter(
      (e) => e.tur === tur && !gundenGelenler.some((g) => g.tmdbId === e.disId || g.googleBooksId === e.disId)
    )
    return gundenGelenler.length + puandanGelenler.length
  }

  const filmSayisi = turSayisi('sinema')
  const diziSayisi = turSayisi('dizi')
  const kitapSayisi = turSayisi('kitap')
  const yaziSayisi = buYilGonderiler.filter((g) => g.tur === 'yazi').length
  const geziSayisi = buYilGonderiler.filter((g) => g.tur === 'gezi').length

  const tumPuanlar = [
    ...buYilGonderiler.filter((g) => g.kullaniciPuani != null).map((g) => ({ ...g, puan: g.kullaniciPuani, kaynak: 'gonderi' })),
    ...buYilPuanlar.map((e) => ({ ...e, kaynak: 'puan' })),
  ]
  const ortalamaPuan = tumPuanlar.length ? tumPuanlar.reduce((t, p) => t + p.puan, 0) / tumPuanlar.length : null
  const enYuksekPuanli = [...tumPuanlar].sort((a, b) => (b.puan || 0) - (a.puan || 0))[0]

  // En aktif ay — o ay içindeki toplam günce sayısına göre.
  const ayDagilimi = Array(12).fill(0)
  buYilGonderiler.forEach((g) => {
    const ay = tariheDevir(g.tarih)?.getMonth()
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

      {toplamEser === 0 && buYilGonderiler.length === 0 ? (
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
                  to={
                    enYuksekPuanli.kaynak === 'gonderi'
                      ? `/gonderi/${enYuksekPuanli.id}`
                      : esereLink(enYuksekPuanli.tur, enYuksekPuanli.disId)
                  }
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

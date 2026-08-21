import { Link } from 'react-router-dom'
import { buYilOlaylariHesapla } from '../utils/yilOzeti.js'

const AY_ADLARI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

function tariheDevir(deger) {
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  return isNaN(d.getTime()) ? null : d
}

function esereLink(tur, disId) {
  if (tur === 'gezi' || tur === 'etkinlik') return `/gonderi/${disId}`
  if (tur === 'kitap') return `/kitap/${disId}`
  if (tur === 'dizi') return `/dizi/${disId}`
  return `/film/${disId}`
}

// Hesaplama artık utils/yilOzeti.js'te — Günlük sekmesiyle (Profil.jsx)
// AYNI fonksiyonu paylaşıyor, iki yerde ayrı ayrı (ve birbirinden sapan)
// hesaplama olmasın diye (bkz. o dosyadaki uzun açıklama — bu, gösterilen
// rakamlarla Günlük listesinin tutarsız görünmesinin kök sebebiydi).
export default function YilOzeti({ yil, yukleniyor, gonderiler, eserPuanlarim, gunlukKayitlari = [], onTuruSec }) {
  const buYilOlaylar = buYilOlaylariHesapla(yil, gonderiler, eserPuanlarim, gunlukKayitlari)

  // Aynı esere ait birden fazla olay olabilir (başladım + bitirdim + puanladım
  // hepsi ayrı birer günlük kaydı) — "kaç film/dizi/kitap" sayısı OLAY değil,
  // BENZERSİZ ESER sayısı olmalı, yoksa tek bir kitap "3 kitap okudun" gibi
  // yanlış şişirilmiş bir sonuç üretirdi.
  function turSayisi(tur) {
    return new Set(buYilOlaylar.filter((o) => o.tur === tur).map((o) => o.disId)).size
  }

  const filmSayisi = turSayisi('sinema')
  const diziSayisi = turSayisi('dizi')
  const kitapSayisi = turSayisi('kitap')
  const yaziSayisi = buYilGonderiler.filter((g) => g.tur === 'yazi').length
  const geziEtkinlikSayisi = turSayisi('gezi') + turSayisi('etkinlik')

  const puanliOlaylar = buYilOlaylar.filter((o) => o.puan != null)
  const ortalamaPuan = puanliOlaylar.length ? puanliOlaylar.reduce((t, o) => t + o.puan, 0) / puanliOlaylar.length : null
  const enYuksekPuanli = [...puanliOlaylar].sort((a, b) => (b.puan || 0) - (a.puan || 0))[0]

  const ayDagilimi = Array(12).fill(0)
  buYilOlaylar.forEach((o) => {
    const ay = tariheDevir(o.tarih)?.getMonth()
    if (ay != null) ayDagilimi[ay]++
  })
  const enAktifAyIndex = ayDagilimi.some((n) => n > 0) ? ayDagilimi.indexOf(Math.max(...ayDagilimi)) : null

  const toplamEser = filmSayisi + diziSayisi + kitapSayisi

  if (yukleniyor) return <p className="text-sm text-kraft">Yükleniyor...</p>

  return (
    <div>
      {toplamEser === 0 && yaziSayisi === 0 && geziEtkinlikSayisi === 0 ? (
        <p className="text-sm text-kraft">{yil} yılında henüz bir etkinlik yok.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              onClick={() => onTuruSec?.('sinema')}
              disabled={!onTuruSec || filmSayisi === 0}
              className="rounded-sm bg-kagitKoyu p-4 text-center ring-1 ring-cizgi transition enabled:hover:ring-deniz/50 disabled:cursor-default"
            >
              <p className="font-baslik text-3xl text-murekkep">{filmSayisi}</p>
              <p className="text-xs text-kraft">🎬 Film</p>
            </button>
            <button
              onClick={() => onTuruSec?.('dizi')}
              disabled={!onTuruSec || diziSayisi === 0}
              className="rounded-sm bg-kagitKoyu p-4 text-center ring-1 ring-cizgi transition enabled:hover:ring-deniz/50 disabled:cursor-default"
            >
              <p className="font-baslik text-3xl text-murekkep">{diziSayisi}</p>
              <p className="text-xs text-kraft">📺 Dizi</p>
            </button>
            <button
              onClick={() => onTuruSec?.('kitap')}
              disabled={!onTuruSec || kitapSayisi === 0}
              className="rounded-sm bg-kagitKoyu p-4 text-center ring-1 ring-cizgi transition enabled:hover:ring-deniz/50 disabled:cursor-default"
            >
              <p className="font-baslik text-3xl text-murekkep">{kitapSayisi}</p>
              <p className="text-xs text-kraft">📖 Kitap</p>
            </button>
            <button
              onClick={() => onTuruSec?.('diger')}
              disabled={!onTuruSec || yaziSayisi + geziEtkinlikSayisi === 0}
              className="rounded-sm bg-kagitKoyu p-4 text-center ring-1 ring-cizgi transition enabled:hover:ring-deniz/50 disabled:cursor-default"
              title="Yazılarını görmek için Yazı & Gezi sekmesine gider"
            >
              <p className="font-baslik text-3xl text-murekkep">{yaziSayisi + geziEtkinlikSayisi}</p>
              <p className="text-xs text-kraft">✍️ Yazı/Gezi/Etkinlik</p>
            </button>
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
                <p className="text-[11px] uppercase tracking-widest text-gise">{yil}'in en yükseğini verdiğin</p>
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

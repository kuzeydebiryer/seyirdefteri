import { Link } from 'react-router-dom'
import YildizPuan from './YildizPuan.jsx'
import { gunlukKaydiSil } from '../utils/gunluk.js'

const AY_ADLARI = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK']

function tariheDevir(deger) {
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  return isNaN(d.getTime()) ? null : d
}

// Gezi/Etkinlik'in kendi bir TMDB/Google Books sayfası yok — "eser" doğrudan
// gönderinin kendisi, bu yüzden disId aslında gönderinin Firestore ID'si.
function esereLink(tur, disId) {
  if (tur === 'gezi' || tur === 'etkinlik') return `/gonderi/${disId}`
  if (tur === 'kitap') return `/kitap/${disId}`
  if (tur === 'dizi') return `/dizi/${disId}`
  return `/film/${disId}`
}

const TUR_IKONU = { sinema: '🎬', dizi: '📺', kitap: '📖', gezi: '🧳', etkinlik: '🎟️' }
const OLAY_ROZETI = { baslama: '▶ Başladı', bitirme: '✓ Bitirdi' }

// Profildeki "Günlük" sekmesi — bir eserin ne zaman tekrar tekrar (yeniden
// izleme/okuma dahil) tüketildiğinin tam kaydı. "Yılın Özeti"nin özet
// kartlarının aksine, burası ham/kronolojik liste — Letterboxd'un Diary
// ekranıyla aynı fikir.
export default function GunlukListesi({ kayitlar, kendiProfiliMi, onDegisti }) {
  if (kayitlar.length === 0) {
    return (
      <p className="text-sm text-kraft">
        Henüz bir günlük kaydı yok. Bir eseri puanlarken, başlarken/bitirirken ya da gezi-etkinlik güncesi paylaşırken
        buraya otomatik düşer.
      </p>
    )
  }

  const gruplar = []
  let sonAyYil = null
  kayitlar.forEach((k) => {
    const tarih = tariheDevir(k.izlemeTarihi)
    if (!tarih) return
    const ayYil = `${AY_ADLARI[tarih.getMonth()]} ${tarih.getFullYear()}`
    if (ayYil !== sonAyYil) {
      gruplar.push({ baslik: ayYil, kayitlar: [] })
      sonAyYil = ayYil
    }
    gruplar[gruplar.length - 1].kayitlar.push({ ...k, _tarih: tarih })
  })

  async function silTiklandi(kayit) {
    if (!window.confirm('Bu günlük kaydını silmek istediğine emin misin?')) return
    await gunlukKaydiSil(kayit.id)
    onDegisti?.()
  }

  return (
    <div className="space-y-6">
      {gruplar.map((grup) => (
        <div key={grup.baslik}>
          <p className="mb-2 text-xs uppercase tracking-widest text-kraft">{grup.baslik}</p>
          <div className="space-y-2">
            {grup.kayitlar.map((k) => (
              <div key={k.id} className="flex items-center gap-3 rounded-sm bg-kagitKoyu p-2 ring-1 ring-cizgi">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-kagit text-sm text-kraft ring-1 ring-cizgi">
                  {k._tarih.getDate()}
                </div>
                {k.posterUrl && (
                  <img src={k.posterUrl} alt={k.baslik} className="h-14 w-10 shrink-0 rounded-sm object-cover ring-1 ring-cizgi" />
                )}
                {/* min-w-0 olmadan flex çocukları taşan içeriği küçültmüyor —
                    uzun başlıklar (özellikle Letterboxd'dan gelen İngilizce
                    filmler) tüm satırı bozuyordu, bu satır o hatayı çözüyor. */}
                <div className="min-w-0 flex-1">
                  {/* Link varsayılan olarak inline (<a>) render ediyor —
                      "truncate" (ellipsis) sadece block/inline-block
                      elemanlarda çalışıyor, bu yüzden "block" eklenmeden
                      truncate hiç etkisi olmuyordu. */}
                  <Link to={esereLink(k.tur, k.disId)} className="block truncate text-sm text-murekkep hover:underline">
                    {TUR_IKONU[k.tur] || ''} {k.baslik} {k.yil && <span className="text-kraft">({k.yil})</span>}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    {OLAY_ROZETI[k.olayTuru] && (
                      <span className="text-xs font-medium text-deniz">{OLAY_ROZETI[k.olayTuru]}</span>
                    )}
                    {k.puan != null && <YildizPuan puan={k.puan} boyut="text-xs" onluGoster={false} />}
                    {k.tekrarMi && (
                      <span className="text-xs text-kraft" title="Yeniden izleme/okuma">
                        🔄
                      </span>
                    )}
                  </div>
                  {k.not && <p className="mt-0.5 truncate text-xs text-murekkep/80">"{k.not}"</p>}
                </div>
                {kendiProfiliMi && (
                  <button onClick={() => silTiklandi(k)} className="shrink-0 text-[11px] text-kraft hover:text-muhur">
                    Sil
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import YildizPuan from './YildizPuan.jsx'
import { gunlukKaydiSil, gunlukKaydiGuncelle, gunlukKaydiEkle } from '../utils/gunluk.js'
import { eserPuanindaGunlukVarIsaretle } from '../utils/eserPuani.js'

const AY_ADLARI = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK']

function tariheDevir(deger) {
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  return isNaN(d.getTime()) ? null : d
}

// Gezi/Etkinlik'in kendi bir TMDB/Google Books sayfası yok — "eser" doğrudan
// gönderinin kendisi, bu yüzden disId aslında gönderinin Firestore ID'si.
function esereLink(tur, disId, kaynak, gonderiId) {
  if (kaynak === 'gonderi') return `/gonderi/${gonderiId}`
  if (tur === 'gezi' || tur === 'etkinlik') return `/gonderi/${disId}`
  if (tur === 'kitap') return `/kitap/${disId}`
  if (tur === 'dizi') return `/dizi/${disId}`
  return `/film/${disId}`
}

const TUR_IKONU = { sinema: '🎬', dizi: '📺', kitap: '📖', gezi: '🧳', etkinlik: '🎟️' }
const OLAY_ROZETI = { baslama: '▶ Başladı', bitirme: '✓ Bitirdi' }

// Profildeki "Günlük" sekmesi — bir eserin ne zaman tekrar tekrar (yeniden
// izleme/okuma dahil) tüketildiğinin tam kaydı. Artık Yılın Özeti'yle AYNI
// hesaplamadan (bkz. utils/yilOzeti.js) besleniyor, bu yüzden bazı satırlar
// GERÇEK bir günlük kaydı olmayabilir (kaynak: 'gonderi'/'puan') — bunlar bir
// puanlama/gönderiden geliyor ama henüz günlüğe düşmemiş "hayalet" kayıtlar.
// Bu satırlarda tarih düzenleme/silme yerine, isteğe bağlı "Günlüğe Kaydet"
// butonuyla kalıcı bir günlük satırına dönüştürülebiliyor.
export default function GunlukListesi({ kayitlar, kendiProfiliMi, onDegisti }) {
  const { kullanici } = useAuth()
  const [duzenlenenId, setDuzenlenenId] = useState(null)
  const [yeniTarih, setYeniTarih] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [donusturulenId, setDonusturulenId] = useState(null)

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

  function duzenlemeyiAc(kayit) {
    setDuzenlenenId(kayit.id)
    setYeniTarih(kayit._tarih.toISOString().slice(0, 10))
  }

  async function tarihKaydet(kayitId) {
    if (!yeniTarih) return
    setKaydediliyor(true)
    try {
      await gunlukKaydiGuncelle(kayitId, { izlemeTarihiISO: yeniTarih })
      setDuzenlenenId(null)
      onDegisti?.()
    } finally {
      setKaydediliyor(false)
    }
  }

  // "Hayalet" bir kaydı (kaynak: 'puan' — sadece eserPuanlari'nda var, hiç
  // günlük satırı yok) gerçek bir günlük kaydına dönüştürür.
  async function gunlugeKaydet(kayit) {
    if (!kullanici) return
    setDonusturulenId(kayit.id)
    try {
      await gunlukKaydiEkle(kullanici, {
        tur: kayit.tur,
        disId: kayit.disId,
        baslik: kayit.baslik,
        posterUrl: kayit.posterUrl,
        yil: kayit.yil || '',
        izlemeTarihiISO: kayit._tarih.toISOString().slice(0, 10),
        puan: kayit.puan,
      })
      await eserPuanindaGunlukVarIsaretle(kayit.tur, kayit.disId, kullanici.uid)
      onDegisti?.()
    } finally {
      setDonusturulenId(null)
    }
  }

  return (
    <div className="space-y-6">
      {gruplar.map((grup) => (
        <div key={grup.baslik}>
          <p className="mb-2 text-xs uppercase tracking-widest text-kraft">{grup.baslik}</p>
          <div className="space-y-2">
            {grup.kayitlar.map((k) => {
              const gercekGunlukKaydiMi = k.kaynak === 'gunluk' || k.kaynak == null
              return (
                <div key={k.id} className="flex items-center gap-3 rounded-sm bg-kagitKoyu p-2 ring-1 ring-cizgi">
                  {kendiProfiliMi && gercekGunlukKaydiMi && duzenlenenId === k.id ? (
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <input
                        type="date"
                        value={yeniTarih}
                        onChange={(e) => setYeniTarih(e.target.value)}
                        max={new Date().toISOString().slice(0, 10)}
                        className="w-28 rounded-sm bg-kagit px-1 py-0.5 text-[11px] text-murekkep ring-1 ring-cizgi"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => tarihKaydet(k.id)}
                          disabled={kaydediliyor}
                          className="rounded-sm bg-muhur px-1.5 py-0.5 text-[10px] text-kagit disabled:opacity-40"
                        >
                          Kaydet
                        </button>
                        <button onClick={() => setDuzenlenenId(null)} className="rounded-sm bg-kagit px-1.5 py-0.5 text-[10px] text-kraft ring-1 ring-cizgi">
                          Vazgeç
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => kendiProfiliMi && gercekGunlukKaydiMi && duzenlemeyiAc(k)}
                      title={
                        !gercekGunlukKaydiMi
                          ? 'Bu bir puanlama kaydı, henüz günlüğe düşmemiş'
                          : kendiProfiliMi
                            ? 'Tarihi düzenle'
                            : undefined
                      }
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-sm ring-1 ring-cizgi ${
                        gercekGunlukKaydiMi ? 'bg-kagit text-kraft' : 'bg-kagit/50 text-kraft/60'
                      } ${kendiProfiliMi && gercekGunlukKaydiMi ? 'hover:ring-deniz/50' : ''}`}
                    >
                      {k._tarih.getDate()}
                    </button>
                  )}
                  {k.posterUrl && (
                    <img src={k.posterUrl} alt={k.baslik} className="h-14 w-10 shrink-0 rounded-sm object-cover ring-1 ring-cizgi" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      to={esereLink(k.tur, k.disId, k.kaynak, k.gonderiId)}
                      className="block truncate text-sm text-murekkep hover:underline"
                    >
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
                      {!gercekGunlukKaydiMi && k.kaynak === 'puan' && (
                        <span className="text-[10px] text-kraft opacity-70">— henüz günlükte değil</span>
                      )}
                    </div>
                    {k.not && <p className="mt-0.5 truncate text-xs text-murekkep/80">"{k.not}"</p>}
                  </div>
                  {kendiProfiliMi && gercekGunlukKaydiMi && (
                    <button onClick={() => silTiklandi(k)} className="shrink-0 text-[11px] text-kraft hover:text-muhur">
                      Sil
                    </button>
                  )}
                  {kendiProfiliMi && k.kaynak === 'puan' && (
                    <button
                      onClick={() => gunlugeKaydet(k)}
                      disabled={donusturulenId === k.id}
                      className="shrink-0 text-[11px] text-deniz hover:underline disabled:opacity-40"
                    >
                      {donusturulenId === k.id ? '...' : 'Günlüğe Kaydet'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

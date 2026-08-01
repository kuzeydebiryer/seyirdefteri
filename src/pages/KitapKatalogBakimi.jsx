import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { dogrulanmamisKitaplariGetir, kitapDogrula, kitapDuzenlemeSayisi } from '../utils/kitapKatalog.js'

// Faz 3: Küçük/davetli bir topluluk olduğumuz için ayrı bir "admin" rolü yok —
// herkes güvenilir kabul ediliyor (mevcut Firestore Rules deseniyle tutarlı).
// Bu sayfa, giriş yapmış HERKESİN görebildiği basit bir "henüz doğrulanmamış
// kitaplar" kuyruğu: Faz 1'de otomatik dolan ya da Faz 2'de düzenlenen ama
// kimsenin "bu bilgi doğru" demediği kayıtlar burada birikir.
export default function KitapKatalogBakimi() {
  const { kullanici } = useAuth()
  const [kitaplar, setKitaplar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')
  const [dogrulanıyor, setDogrulanıyor] = useState(null) // hangi kitapId işleniyor

  async function yeniden() {
    setYukleniyor(true)
    setHata('')
    try {
      const liste = await dogrulanmamisKitaplariGetir(30)
      const duzenlemeSayilariyla = await Promise.all(
        liste.map(async (k) => ({ ...k, duzenlemeSayisi: await kitapDuzenlemeSayisi(k.id) }))
      )
      setKitaplar(duzenlemeSayilariyla)
    } catch (err) {
      console.error('Bakım kuyruğu yüklenemedi:', err)
      setHata(
        err.code === 'failed-precondition'
          ? 'Firestore index\'i hâlâ oluşturuluyor. Firebase Console > Firestore > İndeksler sekmesinde durum "Etkinleştirilmiş" olunca sayfayı yenile (birkaç dakika sürebilir).'
          : 'Kitaplar yüklenirken bir hata oluştu: ' + err.message
      )
    } finally {
      setYukleniyor(false)
    }
  }

  useEffect(() => {
    yeniden()
  }, [])

  async function dogrula(id) {
    if (!kullanici) return
    setDogrulanıyor(id)
    try {
      await kitapDogrula(id, kullanici)
      setKitaplar((liste) => liste.filter((k) => k.id !== id))
    } finally {
      setDogrulanıyor(null)
    }
  }

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep mb-1">Kitap Kataloğu Bakımı</h1>
      <p className="mb-6 text-sm text-kraft">
        Google Books + Open Library'den otomatik doldurulmuş ama henüz kimsenin "doğru" demediği kitaplar. Bilgiyi
        kontrol edip eksikse kitap sayfasından düzenle, sonra "Doğrulandı" ile işaretle.
      </p>

      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {hata && <p className="text-sm text-muhur">{hata}</p>}
      {!yukleniyor && !hata && kitaplar.length === 0 && (
        <p className="text-sm text-kraft">Bakım gereken kitap yok — katalog güncel. 🎉</p>
      )}

      <div className="space-y-3">
        {kitaplar.map((k) => (
          <div key={k.id} className="flex gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
            <Link to={`/kitap/${k.id}`} className="shrink-0">
              <div className="h-24 w-16 overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                {k.posterUrl && <img src={k.posterUrl} alt={k.baslik} className="h-full w-full object-cover" />}
              </div>
            </Link>
            <div className="min-w-0 flex-1">
              <Link to={`/kitap/${k.id}`} className="font-baslik text-sm text-murekkep hover:text-deniz">
                {k.baslik || '(Başlık yok)'}
              </Link>
              <p className="text-xs text-kraft">{k.yazar || '(Yazar yok)'}</p>

              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-kraft">
                {!k.posterUrl && <span className="text-muhur">⚠ Kapak eksik</span>}
                {!k.ozet && <span className="text-muhur">⚠ Özet eksik</span>}
                {!k.turler && <span className="text-muhur">⚠ Tür eksik</span>}
                {!k.sayfaSayisi && <span className="text-muhur">⚠ Sayfa sayısı eksik</span>}
              </div>

              <p className="mt-1 text-[11px] text-kraft">
                Kaynak:{' '}
                {[
                  k.kaynaklar?.google && 'Google',
                  k.kaynaklar?.openLibrary && 'Open Library',
                  k.kaynaklar?.kullanici && 'Kullanıcı düzeltmesi',
                ]
                  .filter(Boolean)
                  .join(' + ') || 'bilinmiyor'}
                {k.duzenlemeSayisi > 0 && ` · ${k.duzenlemeSayisi} kez düzenlendi`}
              </p>

              <div className="mt-2 flex gap-2">
                <Link
                  to={`/kitap/${k.id}`}
                  className="rounded-sm bg-kagit px-2 py-1 font-govde text-[11px] text-kraft ring-1 ring-cizgi hover:text-murekkep"
                >
                  İncele / Düzenle
                </Link>
                <button
                  onClick={() => dogrula(k.id)}
                  disabled={dogrulanıyor === k.id}
                  className="rounded-sm bg-muhur px-2 py-1 font-govde text-[11px] text-kagit disabled:opacity-40"
                >
                  {dogrulanıyor === k.id ? 'İşleniyor...' : '✓ Doğrulandı'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { dogrulanmamisKitaplariGetir, kapaksizKitaplariGetir, kitapDogrula, kitapDuzenlemeSayisi, kitapKapaklariniTopluDoldur, kitapYenidenZenginlestir } from '../utils/kitapKatalog.js'

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
  const [yenidenDeneniyor, setYenidenDeneniyor] = useState(null)
  const [topluDolduruluyor, setTopluDolduruluyor] = useState(false)
  const [topluSonuc, setTopluSonuc] = useState(null)

  async function yeniden() {
    setYukleniyor(true)
    setHata('')
    try {
      // İki ayrı sorgu birleştiriliyor: "henüz doğrulanmamış" (Faz 3'ün
      // orijinal kuyruğu) ve "kapağı eksik" (dogrulanmis durumuna
      // bakmadan — bkz. kapaksizKitaplariGetir'in üstündeki not, aksi
      // halde Kitapyurdu kaynaklı ama sonsuza kadar kapaksız kalmış
      // kayıtlar bu kuyruğa hiç düşmüyordu).
      const [dogrulanmamislar, kapaksizlar] = await Promise.all([
        dogrulanmamisKitaplariGetir(30),
        kapaksizKitaplariGetir(30),
      ])
      const gorulenler = new Set()
      const birlesik = []
      for (const k of [...dogrulanmamislar, ...kapaksizlar]) {
        if (gorulenler.has(k.id)) continue
        gorulenler.add(k.id)
        birlesik.push(k)
      }
      const duzenlemeSayilariyla = await Promise.all(
        birlesik.map(async (k) => ({ ...k, duzenlemeSayisi: await kitapDuzenlemeSayisi(k.id) }))
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

  async function yenidenDene(id) {
    setYenidenDeneniyor(id)
    try {
      const guncellenen = await kitapYenidenZenginlestir(id)
      setKitaplar((liste) => liste.map((k) => (k.id === id ? { ...k, ...guncellenen } : k)))
    } finally {
      setYenidenDeneniyor(null)
    }
  }

  async function topluDoldur() {
    setTopluDolduruluyor(true)
    setTopluSonuc(null)
    try {
      const sonuc = await kitapKapaklariniTopluDoldur()
      setTopluSonuc(sonuc)
      await yeniden()
    } catch (err) {
      setTopluSonuc({ hata: err.message })
    } finally {
      setTopluDolduruluyor(false)
    }
  }

  return (
    <div>
      <h1 className="font-baslik text-2xl text-murekkep mb-1">Kitap Kataloğu Bakımı</h1>
      <p className="mb-3 text-sm text-kraft">
        Google Books + Open Library'den otomatik doldurulmuş ama henüz kimsenin "doğru" demediği kitaplar. Bilgiyi
        kontrol edip eksikse kitap sayfasından düzenle, sonra "Doğrulandı" ile işaretle.
      </p>

      <div className="mb-6 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
        <p className="mb-2 text-xs text-kraft">
          Tek seferlik toplu araç: kapağı boş olan TÜM kitaplarda Open Library'yi dener (30'luk kuyruk sınırı yok).
          Kuyruk büyükse tekrar tekrar çalıştırmak güvenli — sadece hâlâ kapaksız kalanlara dokunuyor.
        </p>
        <button
          onClick={topluDoldur}
          disabled={topluDolduruluyor}
          className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
        >
          {topluDolduruluyor ? 'Taranıyor (birkaç dakika sürebilir)...' : '🪄 Kapakları Toplu Bul'}
        </button>
        {topluSonuc && (
          <p className="mt-2 text-[11px] text-kraft">
            {topluSonuc.hata ? (
              <span className="text-muhur">Hata: {topluSonuc.hata}</span>
            ) : (
              <>
                {topluSonuc.taranan} kitap tarandı, {topluSonuc.bulunan} tanesine kapak bulundu, {topluSonuc.bulunamayan}{' '}
                tanesi bulunamadı.
                {topluSonuc.sinirlandiMi && ' Kuyrukta daha fazlası olabilir — butona tekrar bas.'}
                {topluSonuc.hatali?.length > 0 && ` (${topluSonuc.hatali.length} kayıtta hata oluştu)`}
              </>
            )}
          </p>
        )}
      </div>

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
                  onClick={() => yenidenDene(k.id)}
                  disabled={yenidenDeneniyor === k.id}
                  className="rounded-sm bg-kagit px-2 py-1 font-govde text-[11px] text-kraft ring-1 ring-cizgi hover:text-murekkep disabled:opacity-40"
                >
                  {yenidenDeneniyor === k.id ? 'Deneniyor...' : '🔄 Yeniden Dene'}
                </button>
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

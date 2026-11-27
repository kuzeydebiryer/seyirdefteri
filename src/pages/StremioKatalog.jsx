import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { manifestAdresi, stremioAnahtariniIptalEt, stremioAnahtariOlustur, stremioAnahtarimiGetir, stremioUygulamaAdresi } from '../utils/stremio.js'

// 📺 Seyirdefteri kataloğunu Stremio / Nuvio'ya ekleme sayfası (/katalog-eklentisi).
export default function StremioKatalog() {
  const { kullanici } = useAuth()
  const [anahtar, setAnahtar] = useState(undefined) // undefined = yükleniyor, null = yok
  const [mesgul, setMesgul] = useState(false)
  const [kopyalandi, setKopyalandi] = useState(false)
  const [hata, setHata] = useState('')

  useEffect(() => {
    if (!kullanici) return
    stremioAnahtarimiGetir(kullanici.uid)
      .then(setAnahtar)
      .catch((e) => {
        setAnahtar(null)
        setHata(e.message)
      })
  }, [kullanici])

  async function olustur(onay) {
    if (onay && !window.confirm('Yeni adres oluşturulunca eski adres çalışmaz; Stremio/Nuvio\'ya yeni adresi eklemen gerekir. Devam edilsin mi?')) return
    setMesgul(true)
    setHata('')
    try {
      setAnahtar(await stremioAnahtariOlustur(kullanici.uid))
    } catch (e) {
      setHata(`Adres oluşturulamadı: ${e.message}`)
    } finally {
      setMesgul(false)
    }
  }
  async function iptal() {
    if (!window.confirm('Adres iptal edilsin mi? Stremio/Nuvio\'daki Seyirdefteri katalogları çalışmayı bırakır.')) return
    setMesgul(true)
    try {
      await stremioAnahtariniIptalEt(kullanici.uid)
      setAnahtar(null)
    } finally {
      setMesgul(false)
    }
  }
  async function kopyala() {
    await navigator.clipboard.writeText(manifestAdresi(anahtar))
    setKopyalandi(true)
    setTimeout(() => setKopyalandi(false), 2500)
  }

  return (
    <div className="max-w-2xl">
      <Link to="/listelerim" className="mb-2 inline-block text-xs text-kraft hover:text-deniz">
        ← Listelerim
      </Link>
      <h1 className="font-baslik text-2xl text-murekkep">📺 Stremio / Nuvio Kataloğu</h1>
      <p className="mt-1 text-sm text-kraft">
        Seyirdefteri listelerini Stremio ya da Nuvio'nun ana ekranında raf raf gör. Listelerin sitede güncellendikçe katalog da güncellenir.
      </p>

      <div className="mt-4 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-murekkep">Katalogda neler var?</p>
        <ul className="space-y-1 text-sm text-murekkep">
          <li>🆕 <b>Dijitalde Yeni Çıkanlar</b>: sitedeki bölümle aynı, en yeni başta</li>
          <li>📡 <b>Platformlarda Yeni</b>: son 30 günde Netflix, MUBI, HBO Max… her platforma eklenenler ayrı rafta</li>
          <li>📌 <b>İzleyeceklerim</b>: film ve dizi ayrı raflarda</li>
          <li>📋 <b>Listelerim</b>: her listen ayrı bir raf (film/dizi öğeleri)</li>
          <li>🏅 <b>Dış listeler</b>: Letterboxd 500, IMDb 250 vb.</li>
          <li>🏆 <b>Oscar adayları</b>: Oscar bölümündeki son sezonun filmleri (en çok adaylık alan başta)</li>
        </ul>
        <p className="mt-2 text-[11px] text-kraft">
          Eklenti yalnızca katalog verir (ad, afiş, yıl). Film yayını ya da bağlantısı içermez. Kitaplar ve IMDb kaydı olmayan yapımlar katalogda görünmez.
        </p>
      </div>

      <div className="mt-4 rounded-sm bg-kagit p-4 ring-1 ring-cizgi">
        {anahtar === undefined ? (
          <p className="text-sm text-kraft">Yükleniyor…</p>
        ) : anahtar === null ? (
          <>
            <p className="text-sm text-murekkep">Sana özel bir eklenti adresi oluştur. Adres yalnızca seninle ilgili katalogları içerir; kimseyle paylaşma.</p>
            <button onClick={() => olustur(false)} disabled={mesgul} className="mt-3 rounded-sm bg-gise px-4 py-2 font-govde text-sm text-kagit disabled:opacity-40">
              {mesgul ? 'Oluşturuluyor…' : '🔑 Eklenti adresimi oluştur'}
            </button>
          </>
        ) : (
          <>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-murekkep">Eklenti adresin</p>
            <div className="flex gap-2">
              <input readOnly value={manifestAdresi(anahtar)} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-sm bg-kagitKoyu px-2 py-1.5 font-mono text-[11px] text-murekkep ring-1 ring-cizgi" />
              <button onClick={kopyala} className="shrink-0 rounded-sm bg-deniz px-3 py-1.5 font-govde text-xs text-kagit">
                {kopyalandi ? '✓ Kopyalandı' : 'Kopyala'}
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
                <p className="font-baslik text-base text-murekkep">Stremio</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-murekkep">
                  <li>Aşağıdaki düğmeye bas (Stremio açılır) <i>ya da</i></li>
                  <li>Stremio → Eklentiler → arama kutusuna adresi yapıştır → <b>Yükle</b></li>
                </ol>
                <a href={stremioUygulamaAdresi(anahtar)} className="mt-2 inline-block rounded-sm bg-gise px-3 py-1.5 font-govde text-xs text-kagit">
                  Stremio'da aç
                </a>
              </div>
              <div className="rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
                <p className="font-baslik text-base text-murekkep">Nuvio</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-murekkep">
                  <li>Nuvio → Ayarlar → <b>Eklentiler (Addons)</b></li>
                  <li>"Eklenti ekle"ye adresi yapıştır → <b>Yükle</b></li>
                  <li>Ana ekranda Seyirdefteri rafları görünür</li>
                </ol>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-kraft">
              Yeni bir liste ekleyince raf olarak görünmesi için uygulamada eklentiyi bir kez yenilemen gerekebilir (Stremio’da eklentiyi kaldırıp tekrar yüklemek ya da uygulamayı yeniden başlatmak yeterli). İlk açılışta
              büyük listeler (Letterboxd 500 gibi) birkaç saniye sürebilir; sonrası hızlıdır.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => olustur(true)} disabled={mesgul} className="rounded-sm bg-kagitKoyu px-3 py-1.5 font-govde text-xs text-murekkep ring-1 ring-cizgi">
                🔄 Adresi yenile
              </button>
              <button onClick={iptal} disabled={mesgul} className="rounded-sm bg-kagitKoyu px-3 py-1.5 font-govde text-xs text-muhur ring-1 ring-cizgi">
                Adresi iptal et
              </button>
            </div>
          </>
        )}
        {hata && <p className="mt-2 text-xs text-muhur">{hata}</p>}
      </div>
    </div>
  )
}

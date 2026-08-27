import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { yakindaGelenEkle } from '../utils/yakindaGelecek.js'
import { dijitalTarihGetir } from '../utils/dijitalTarih.js'
import EserSecici from './EserSecici.jsx'

const yarin = () => {
  const t = new Date()
  t.setDate(t.getDate() + 1)
  return t.toISOString().slice(0, 10)
}

export default function YakindaGelecekFormu({ platformlar, onEklendi }) {
  const { kullanici } = useAuth()
  const [acik, setAcik] = useState(false)
  const [tur, setTur] = useState('sinema')
  const [secili, setSecili] = useState(null)
  const [hedefTuru, setHedefTuru] = useState('platform')
  const [platformId, setPlatformId] = useState('')
  const [cikisTarihi, setCikisTarihi] = useState(yarin())
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [tmdbAraniyor, setTmdbAraniyor] = useState(false)
  const [tmdbBulunanNot, setTmdbBulunanNot] = useState('')

  // Film seçilince TMDB'de dijital çıkış tarihi var mı diye otomatik bakılıyor
  // — bu, topluluk tarafından isteğe bağlı girilen, çoğu filmde boş olabilen
  // bir veri (bkz. utils/dijitalTarih.js). Bulunursa tarihi otomatik
  // dolduruyor (elle değiştirilebilir), bulunamazsa sessizce hiçbir şey
  // yapmıyor — kullanıcı zaten elle girmeye devam ediyordu.
  useEffect(() => {
    setTmdbBulunanNot('')
    if (tur !== 'sinema' || hedefTuru === 'sinema' || !secili) return
    let iptal = false
    setTmdbAraniyor(true)
    dijitalTarihGetir(secili.disId).then((sonuc) => {
      if (iptal) return
      setTmdbAraniyor(false)
      // TMDB'nin bulduğu tarih bugün ya da geçmişse (film zaten dijitale
      // çıkmış demektir) doldurmuyoruz — bu form "yakında" içindir, "yarin()"
      // alt sınırına takılıp form hata verirdi. Böyle bir durumda kullanıcı
      // muhtemelen doğrudan "Dijitalde Yeni Çıkanlar"a eklemeli.
      if (sonuc && sonuc.tarih > new Date().toISOString().slice(0, 10)) {
        setCikisTarihi(sonuc.tarih)
        setTmdbBulunanNot(sonuc.platformNotu ? `TMDB'de bulundu (${sonuc.platformNotu})` : "TMDB'de bulundu")
      }
    })
    return () => {
      iptal = true
    }
  }, [secili, tur, hedefTuru])

  if (!kullanici) return null

  async function eklemeYap(e) {
    e.preventDefault()
    if (!secili || (hedefTuru === 'platform' && !platformId)) return
    setGonderiliyor(true)
    try {
      const platform = platformlar.find((p) => String(p.provider_id) === platformId)
      await yakindaGelenEkle(kullanici, {
        tur,
        disId: secili.disId,
        baslik: secili.baslik,
        posterUrl: secili.posterUrl,
        hedefTuru,
        platformId,
        platformAdi: platform?.provider_name || '',
        cikisTarihi,
      })
      setSecili(null)
      setAcik(false)
      onEklendi?.()
    } catch (err) {
      window.alert(`Eklenemedi: ${err.message || 'Bilinmeyen bir hata oluştu.'}`)
    } finally {
      setGonderiliyor(false)
    }
  }

  return (
    <div className="mb-6">
      <button onClick={() => setAcik((a) => !a)} className="text-xs text-deniz hover:underline">
        {acik ? 'Vazgeç' : '+ Yakında Geliyor Ekle'}
      </button>

      {acik && (
        <form onSubmit={eklemeYap} className="mt-2 max-w-md space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          {hedefTuru !== 'sinema' && (
            <div className="flex gap-1">
              {[
                { id: 'sinema', etiket: '🎬 Film' },
                { id: 'dizi', etiket: '📺 Dizi' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTur(t.id)
                    setSecili(null)
                  }}
                  className={`rounded-sm px-3 py-1 text-xs font-govde ${
                    tur === t.id ? 'bg-murekkep text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'
                  }`}
                >
                  {t.etiket}
                </button>
              ))}
            </div>
          )}

          <EserSecici kategori={tur === 'sinema' ? 'Film' : 'Dizi'} secili={secili} onSecim={setSecili} onTemizle={() => setSecili(null)} />

          <div>
            <label className="mb-1 block text-[11px] text-kraft">Nereye geliyor?</label>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => {
                  setHedefTuru('sinema')
                  setTur('sinema') // Vizyon tarihi sadece film için anlamlı, dizi bu modda seçilemesin diye Film'e sabitleniyor.
                  setSecili(null)
                }}
                className={`rounded-sm px-3 py-1 text-xs font-govde ${
                  hedefTuru === 'sinema' ? 'bg-murekkep text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'
                }`}
              >
                🎬 Sinema (Vizyon)
              </button>
              <button
                type="button"
                onClick={() => setHedefTuru('platform')}
                className={`rounded-sm px-3 py-1 text-xs font-govde ${
                  hedefTuru === 'platform' ? 'bg-murekkep text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'
                }`}
              >
                📡 Belirli Platform
              </button>
              <button
                type="button"
                onClick={() => setHedefTuru('dijital')}
                className={`rounded-sm px-3 py-1 text-xs font-govde ${
                  hedefTuru === 'dijital' ? 'bg-murekkep text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'
                }`}
              >
                💻 Genel Dijital
              </button>
            </div>
            {hedefTuru === 'sinema' && (
              <p className="mt-1 text-[11px] text-kraft">
                Vizyon tarihi geçince bu kayıt otomatik olarak silinir — hiçbir listeye taşınmaz. Film daha sonra bir
                platforma/dijitale gelirse, o zaman ayrı bir "Yakında Geliyor" kaydı açman gerekir.
              </p>
            )}
          </div>

          {hedefTuru === 'platform' && (
            <div>
              <label className="mb-1 block text-[11px] text-kraft">Platform</label>
              <select
                value={platformId}
                onChange={(e) => setPlatformId(e.target.value)}
                required
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              >
                <option value="">Seç...</option>
                {platformlar.map((p) => (
                  <option key={p.provider_id} value={p.provider_id}>
                    {p.provider_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px] text-kraft">Çıkış Tarihi</label>
            <input
              type="date"
              value={cikisTarihi}
              onChange={(e) => setCikisTarihi(e.target.value)}
              min={yarin()}
              required
              className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
            {tmdbAraniyor && <p className="mt-1 text-[11px] text-kraft">TMDB'de dijital tarih aranıyor...</p>}
            {tmdbBulunanNot && <p className="mt-1 text-[11px] text-gise">✓ {tmdbBulunanNot} — tarih otomatik dolduruldu, dilersen değiştir.</p>}
          </div>

          <button
            type="submit"
            disabled={gonderiliyor || !secili || (hedefTuru === 'platform' && !platformId)}
            className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {gonderiliyor ? 'Ekleniyor...' : 'Ekle'}
          </button>
        </form>
      )}
    </div>
  )
}

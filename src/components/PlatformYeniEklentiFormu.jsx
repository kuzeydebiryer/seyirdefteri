import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { platformYeniEklentiEkle } from '../utils/platformYeniEklenenler.js'
import EserSecici from './EserSecici.jsx'

const bugun = () => new Date().toISOString().slice(0, 10)

// Otomatik günlük tespit bir şeyi kaçırırsa (ör. platform kataloğu çok
// büyükse ve o başlık ilk 200'e girmiyorsa) elle tamamlamak için — aynı
// koleksiyona (platformYeniEklenenler) yazıyor, otomatik tespit edilenlerle
// aynı yerlerde (platform sayfası + anasayfa widget'ı) görünüyor.
export default function PlatformYeniEklentiFormu({ platformlar }) {
  const { kullanici } = useAuth()
  const [acik, setAcik] = useState(false)
  const [tur, setTur] = useState('sinema')
  const [secili, setSecili] = useState(null)
  const [platformId, setPlatformId] = useState('')
  const [tarih, setTarih] = useState(bugun())
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [basariMesaji, setBasariMesaji] = useState('')
  const [eklenenPlatform, setEklenenPlatform] = useState(null) // { id, ad } — az önce eklenenin nerede göründüğünü doğrudan göstermek için

  if (!kullanici) return null

  async function eklemeYap(e) {
    e.preventDefault()
    if (!secili || !platformId) return
    setGonderiliyor(true)
    setBasariMesaji('')
    try {
      const platform = platformlar.find((p) => String(p.provider_id) === platformId)
      await platformYeniEklentiEkle({
        platformId,
        platformAdi: platform?.provider_name || '',
        tur,
        disId: secili.disId,
        baslik: secili.baslik,
        posterUrl: secili.posterUrl,
        tarih,
      })
      setSecili(null)
      setBasariMesaji(`"${secili.baslik}" eklendi.`)
      setEklenenPlatform({ id: platformId, ad: platform?.provider_name || '' })
    } catch (err) {
      window.alert(`Eklenemedi: ${err.message || 'Bilinmeyen bir hata oluştu.'}`)
    } finally {
      setGonderiliyor(false)
    }
  }

  return (
    <div className="mb-6">
      <button onClick={() => setAcik((a) => !a)} className="text-xs text-deniz hover:underline">
        {acik ? 'Vazgeç' : '+ Elle Ekle'}
      </button>

      {acik && (
        <form onSubmit={eklemeYap} className="mt-2 max-w-md space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <p className="text-[11px] text-kraft">
            Eklenen kayıt burada değil, seçtiğin platformun kendi sayfasında ("Son 30 Günde Eklenenler") ve anasayfadaki
            "Platformlarda Yeni" widget'ında görünür.
          </p>
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

          <EserSecici kategori={tur === 'sinema' ? 'Film' : 'Dizi'} secili={secili} onSecim={setSecili} onTemizle={() => setSecili(null)} />

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

          <div>
            <label className="mb-1 block text-[11px] text-kraft">Eklenme Tarihi</label>
            <input
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
              max={bugun()}
              required
              className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
          </div>

          {basariMesaji && (
            <p className="text-xs text-gise">
              ✓ {basariMesaji}{' '}
              {eklenenPlatform && (
                <>
                  —{' '}
                  <Link to={`/platform/${eklenenPlatform.id}?ad=${encodeURIComponent(eklenenPlatform.ad)}`} className="text-deniz hover:underline">
                    {eklenenPlatform.ad} sayfasında görüntüle
                  </Link>
                </>
              )}
            </p>
          )}

          <button
            type="submit"
            disabled={gonderiliyor || !secili || !platformId}
            className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {gonderiliyor ? 'Ekleniyor...' : 'Ekle'}
          </button>
        </form>
      )}
    </div>
  )
}

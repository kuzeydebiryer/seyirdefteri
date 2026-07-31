import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { haberEkle, haberSil } from '../utils/haber.js'

function tarihGoster(deger) {
  if (!deger) return ''
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function HaberBolumu({ kategori, haberler, yenidenYukle }) {
  const { kullanici } = useAuth()
  const [formuAcik, setFormuAcik] = useState(false)
  const [baslik, setBaslik] = useState('')
  const [icerik, setIcerik] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  async function gonder(e) {
    e.preventDefault()
    if (!baslik.trim() || !kullanici) return
    setKaydediliyor(true)
    try {
      await haberEkle({ kategori, baslik: baslik.trim(), icerik, kullanici })
      setBaslik('')
      setIcerik('')
      setFormuAcik(false)
      yenidenYukle()
    } finally {
      setKaydediliyor(false)
    }
  }

  async function sil(id) {
    if (!window.confirm('Bu haberi silmek istediğine emin misin?')) return
    await haberSil(id)
    yenidenYukle()
  }

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">Haberler</h2>
        {kullanici && (
          <button
            onClick={() => setFormuAcik((a) => !a)}
            className="rounded-sm bg-kagitKoyu px-3 py-1 font-govde text-xs text-kraft ring-1 ring-cizgi"
          >
            {formuAcik ? 'Vazgeç' : '+ Haber Ekle'}
          </button>
        )}
      </div>

      {formuAcik && (
        <form onSubmit={gonder} className="mb-4 space-y-2 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <input
            type="text"
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            required
            placeholder="Haber başlığı"
            className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
          <textarea
            value={icerik}
            onChange={(e) => setIcerik(e.target.value)}
            rows={2}
            placeholder="Kısa içerik (opsiyonel)"
            className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
          />
          <button
            type="submit"
            disabled={kaydediliyor}
            className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {kaydediliyor ? 'Ekleniyor...' : 'Paylaş'}
          </button>
        </form>
      )}

      {haberler.length === 0 ? (
        <p className="text-sm text-kraft">Henüz haber yok.</p>
      ) : (
        <ul className="space-y-2">
          {haberler.map((h) => (
            <li key={h.id} className="rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-govde text-sm text-murekkep">{h.baslik}</p>
                  <p className="text-[11px] text-kraft">
                    {h.ekleyenAdi} · {tarihGoster(h.tarih)}
                  </p>
                  {h.icerik && <p className="mt-1 text-sm text-murekkep/90">{h.icerik}</p>}
                </div>
                {kullanici?.uid === h.ekleyenId && (
                  <button onClick={() => sil(h.id)} className="shrink-0 text-xs text-kraft hover:text-muhur">
                    Sil
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

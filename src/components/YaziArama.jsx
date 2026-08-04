import { useState } from 'react'
import GonderiKarti from './GonderiKarti.jsx'
import { yaziAra } from '../utils/yaziArama.js'

const ALT_TURLER = [
  { id: '', etiket: 'Tüm Türler' },
  { id: 'deneme', etiket: 'Deneme' },
  { id: 'film-incelemesi', etiket: 'Film İncelemesi' },
  { id: 'kitap-incelemesi', etiket: 'Kitap İncelemesi' },
  { id: 'sanat-elestirisi', etiket: 'Sanat Eleştirisi' },
  { id: 'kisi-yazisi', etiket: 'Kişi Yazısı' },
  { id: 'liste-yazisi', etiket: 'Liste Yazısı' },
  { id: 'soylesi', etiket: 'Söyleşi' },
]

export default function YaziArama() {
  const [acik, setAcik] = useState(false)
  const [metin, setMetin] = useState('')
  const [altTur, setAltTur] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [aramaYapildi, setAramaYapildi] = useState(false)

  async function ara(e) {
    e.preventDefault()
    setYukleniyor(true)
    setAramaYapildi(true)
    try {
      setSonuclar(await yaziAra({ metin, altTur }))
    } finally {
      setYukleniyor(false)
    }
  }

  function temizle() {
    setMetin('')
    setAltTur('')
    setSonuclar([])
    setAramaYapildi(false)
  }

  return (
    <div className="mb-10">
      <button
        onClick={() => setAcik((a) => !a)}
        className="mb-3 flex w-full items-center justify-between rounded-sm bg-kagitKoyu px-4 py-2 text-left ring-1 ring-cizgi"
      >
        <span className="font-baslik text-lg text-murekkep">🔍 Yazı Ara</span>
        <span className="text-xs text-kraft">{acik ? '▲ Gizle' : '▼ Göster'}</span>
      </button>

      {acik && (
        <>
          <form onSubmit={ara} className="flex flex-wrap gap-2">
            <input
              type="text"
              value={metin}
              onChange={(e) => setMetin(e.target.value)}
              placeholder="Başlık, yazar adı ya da içerikte ara..."
              className="min-w-0 flex-1 rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
            <select
              value={altTur}
              onChange={(e) => setAltTur(e.target.value)}
              className="rounded-sm bg-kagitKoyu px-2 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            >
              {ALT_TURLER.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.etiket}
                </option>
              ))}
            </select>
            <button type="submit" disabled={yukleniyor} className="rounded-sm bg-muhur px-4 py-2 font-govde text-sm text-kagit disabled:opacity-40">
              {yukleniyor ? 'Aranıyor...' : 'Ara'}
            </button>
            {(metin || altTur || sonuclar.length > 0) && (
              <button type="button" onClick={temizle} className="text-xs text-kraft hover:text-muhur">
                Temizle
              </button>
            )}
          </form>

          {aramaYapildi && !yukleniyor && sonuclar.length === 0 && <p className="mt-3 text-sm text-kraft">Sonuç bulunamadı.</p>}

          {sonuclar.length > 0 && (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-kraft">{sonuclar.length} sonuç</p>
              {sonuclar.map((g, i) => (
                <div key={g.id}>
                  <GonderiKarti gonderi={g} />
                  {i < sonuclar.length - 1 && <div className="defter-cizgi mt-4" />}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

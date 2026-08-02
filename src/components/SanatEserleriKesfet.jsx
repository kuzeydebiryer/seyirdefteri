import { useEffect, useState } from 'react'
import { sanatEseriAra, rastgeleEserGetir } from '../utils/sanatEserleri.js'

function EserKarti({ eser }) {
  return (
    <a href={eser.sourceUrl} target="_blank" rel="noreferrer" className="block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
        <img src={eser.imageUrl} alt={eser.title} loading="lazy" className="h-full w-full object-cover" />
        <span className="absolute bottom-0 right-0 rounded-tl-sm bg-murekkep/80 px-1 py-0.5 text-[9px] text-kagit">
          {eser.kaynakAdi}
        </span>
      </div>
      <p className="mt-1 truncate text-xs font-medium text-murekkep">{eser.title || 'İsimsiz'}</p>
      <p className="truncate text-[11px] text-kraft">
        {eser.artistDisplayName || 'Bilinmeyen sanatçı'}
        {eser.objectDate && ` · ${eser.objectDate}`}
      </p>
    </a>
  )
}

// Müze/Sergi kategorisini zenginleştirmek için The Met'in açık erişim
// koleksiyonundan (anahtar gerektirmez, CORS açık) rastgele bir "Günün Eseri"
// ve arama imkânı sunar. Tıklanan eser The Met'in kendi sayfasında açılır —
// görselleri kendi sunucumuzda barındırmıyoruz, doğrudan onlara atıf veriyoruz.
export default function SanatEserleriKesfet() {
  const [gununEseri, setGununEseri] = useState(null)
  const [gununEseriYukleniyor, setGununEseriYukleniyor] = useState(true)
  const [arama, setArama] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [aramaYukleniyor, setAramaYukleniyor] = useState(false)
  const [aramaYapildi, setAramaYapildi] = useState(false)

  async function gununEseriniYenile() {
    setGununEseriYukleniyor(true)
    const eser = await rastgeleEserGetir()
    setGununEseri(eser)
    setGununEseriYukleniyor(false)
  }

  useEffect(() => {
    gununEseriniYenile()
  }, [])

  async function ara(e) {
    e.preventDefault()
    if (!arama.trim()) return
    setAramaYukleniyor(true)
    setAramaYapildi(true)
    try {
      const liste = await sanatEseriAra(arama)
      setSonuclar(liste)
    } finally {
      setAramaYukleniyor(false)
    }
  }

  return (
    <div className="mb-10">
      <h2 className="font-baslik text-lg text-murekkep mb-1">🖼️ Sanat Eserleri Keşfet</h2>
      <p className="mb-3 text-xs text-kraft">The Met ve Art Institute of Chicago'nun açık erişim koleksiyonlarından.</p>

      {!gununEseriYukleniyor && gununEseri && (
        <div className="mb-4 flex gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
          <a href={gununEseri.sourceUrl} target="_blank" rel="noreferrer" className="shrink-0">
            <img
              src={gununEseri.imageUrl}
              alt={gununEseri.title}
              className="h-28 w-20 rounded-sm object-cover ring-1 ring-cizgi"
            />
          </a>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-widest text-gise">Günün Eseri · {gununEseri.kaynakAdi}</p>
            <a href={gununEseri.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate font-baslik text-sm text-murekkep hover:underline">
              {gununEseri.title || 'İsimsiz'}
            </a>
            <p className="truncate text-xs text-kraft">
              {gununEseri.artistDisplayName || 'Bilinmeyen sanatçı'}
              {gununEseri.objectDate && ` · ${gununEseri.objectDate}`}
            </p>
            <button onClick={gununEseriniYenile} className="mt-2 text-[11px] text-kraft hover:text-deniz hover:underline">
              🔄 Başka Bir Eser Göster
            </button>
          </div>
        </div>
      )}

      <form onSubmit={ara} className="flex gap-2">
        <input
          type="text"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Sanatçı, dönem, konu ara... (ör. Van Gogh, Ottoman, portrait)"
          className="flex-1 rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
        />
        <button type="submit" disabled={aramaYukleniyor} className="rounded-sm bg-muhur px-4 py-2 font-govde text-sm text-kagit disabled:opacity-40">
          {aramaYukleniyor ? 'Aranıyor...' : 'Ara'}
        </button>
      </form>

      {aramaYapildi && !aramaYukleniyor && sonuclar.length === 0 && <p className="mt-2 text-sm text-kraft">Sonuç bulunamadı.</p>}

      {sonuclar.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {sonuclar.map((eser) => (
            <EserKarti key={eser.id} eser={eser} />
          ))}
        </div>
      )}
    </div>
  )
}

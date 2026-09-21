import { useState } from 'react'

function paraFormatla(sayi) {
  return Number(sayi).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })
}

// Bir uçuş/konaklama/madde satırında, PLANI PAYLAŞAN HERKESİN kendi PNR'si,
// kendi ödediği ücret gibi bilgileri ayrı ayrı girebilmesi için — ortak
// alanlar (havayolu, tarih, konum vb.) tek, ama "ben ne kadar ödedim" gibi
// kişiye özel alanlar herkes için ayrı tutuluyor.
export default function KisiselBilgilerBolumu({ kisiselBilgiler = {}, alanlar, currentUid, isimHaritasi, onKaydet }) {
  const [duzenleniyor, setDuzenleniyor] = useState(false)
  const [taslak, setTaslak] = useState(() => kisiselBilgiler[currentUid] || {})

  const girisler = Object.entries(kisiselBilgiler).filter(
    ([, v]) => v && alanlar.some((a) => v[a.key] != null && v[a.key] !== '')
  )

  function kaydet(e) {
    e.preventDefault()
    onKaydet(currentUid, taslak)
    setDuzenleniyor(false)
  }

  return (
    <div className="mt-1.5 space-y-1">
      {girisler.length > 0 && (
        <div className="space-y-0.5">
          {girisler.map(([uid, veri]) => (
            <p key={uid} className="text-[11px] text-kraft">
              <span className="text-murekkep">{uid === currentUid ? 'Sen' : isimHaritasi[uid] || 'İsimsiz'}:</span>{' '}
              {alanlar
                .map((a) => {
                  if (veri[a.key] == null || veri[a.key] === '') return null
                  return `${a.etiket}: ${a.tip === 'number' ? paraFormatla(veri[a.key]) : veri[a.key]}`
                })
                .filter(Boolean)
                .join(' · ')}
            </p>
          ))}
        </div>
      )}
      {!duzenleniyor ? (
        <button type="button" onClick={() => setDuzenleniyor(true)} className="text-[11px] text-deniz hover:underline">
          {kisiselBilgiler[currentUid] ? 'Kendi bilgini düzenle' : '+ Kendi bilgini ekle'}
        </button>
      ) : (
        <form onSubmit={kaydet} className="flex flex-wrap items-center gap-1.5">
          {alanlar.map((a) => (
            <input
              key={a.key}
              type={a.tip === 'number' ? 'number' : 'text'}
              value={taslak[a.key] || ''}
              onChange={(e) => setTaslak((t) => ({ ...t, [a.key]: e.target.value }))}
              placeholder={a.etiket}
              className="w-24 rounded-sm bg-kagit px-1.5 py-1 text-[11px] text-murekkep ring-1 ring-cizgi"
            />
          ))}
          <button type="submit" className="rounded-sm bg-muhur px-2 py-1 font-govde text-[11px] text-kagit">
            Kaydet
          </button>
          <button type="button" onClick={() => setDuzenleniyor(false)} className="text-[11px] text-kraft">
            Vazgeç
          </button>
        </form>
      )}
    </div>
  )
}

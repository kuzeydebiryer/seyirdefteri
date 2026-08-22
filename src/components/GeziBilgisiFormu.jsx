import { useEffect, useState } from 'react'
import { ULKELER } from '../data/ulkeler.js'
import { geziMekanlariGetir, geziKampanyalariGetir } from '../utils/ilhamPanosu.js'

// İlham Panosu'nda kategori "Gezi" seçildiğinde beliren ek alanlar: ülke
// (tutarlılık için sabit liste, aynı zamanda Dünya Haritası'nda vurgulanan
// ülkeyle birebir eşleşsin diye), mekan (serbest metin + daha önce girilen
// mekanlardan datalist önerisi) ve kampanya/tur adı (aynı mantık).
export default function GeziBilgisiFormu({ deger, onDegisim }) {
  const [mekanOnerileri, setMekanOnerileri] = useState([])
  const [kampanyaOnerileri, setKampanyaOnerileri] = useState([])

  useEffect(() => {
    geziMekanlariGetir().then(setMekanOnerileri)
    geziKampanyalariGetir().then(setKampanyaOnerileri)
  }, [])

  function alanGuncelle(alan, deger_) {
    onDegisim({ ...deger, [alan]: deger_ })
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <div>
        <label className="mb-1 block text-[11px] text-kraft">Ülke</label>
        <select
          value={deger.ulkeKodu || ''}
          onChange={(e) => alanGuncelle('ulkeKodu', e.target.value)}
          className="w-full rounded-sm bg-kagit px-2 py-2 text-sm text-murekkep ring-1 ring-cizgi"
        >
          <option value="">Seç...</option>
          {ULKELER.map((u) => (
            <option key={u.kod} value={u.kod}>
              {u.ad}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-kraft">Mekan / Şehir</label>
        <input
          type="text"
          list="gezi-mekan-onerileri"
          value={deger.konum || ''}
          onChange={(e) => alanGuncelle('konum', e.target.value)}
          placeholder="Kapadokya, Roma..."
          className="w-full rounded-sm bg-kagit px-2 py-2 text-sm text-murekkep ring-1 ring-cizgi"
        />
        <datalist id="gezi-mekan-onerileri">
          {mekanOnerileri.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-kraft">Kampanya / Tur (opsiyonel)</label>
        <input
          type="text"
          list="gezi-kampanya-onerileri"
          value={deger.kampanya || ''}
          onChange={(e) => alanGuncelle('kampanya', e.target.value)}
          placeholder="Balon Turu 2026..."
          className="w-full rounded-sm bg-kagit px-2 py-2 text-sm text-murekkep ring-1 ring-cizgi"
        />
        <datalist id="gezi-kampanya-onerileri">
          {kampanyaOnerileri.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
      </div>
    </div>
  )
}

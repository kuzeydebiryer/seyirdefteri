import { useState } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

const GEOGRAPHY_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// Bir gezi planının rotasını gösteren harita — günlerin ülke bilgisinden
// (ulkeIso) ülkeler vurgulanıyor, konaklama + gün maddelerinin konum
// bilgisinden (geocode edilmiş enlem/boylem) pinler konuyor. Diğer Gezi
// haritalarıyla (DunyaHaritasi, IlhamGeziHaritasi) aynı görsel dil.
export default function GeziPlaniHaritasi({ gunler, konaklamalar }) {
  const [uzerindeGezinilen, setUzerindeGezinilen] = useState(null)

  const ziyaretEdilenIsoKodlari = new Set((gunler || []).map((g) => g.ulkeIso).filter(Boolean))

  const konaklamaPinleri = (konaklamalar || [])
    .filter((k) => k.enlem != null && k.boylem != null)
    .map((k) => ({ id: k.id, ad: k.ad, enlem: k.enlem, boylem: k.boylem, ikon: '🏨' }))

  const maddePinleri = (gunler || [])
    .flatMap((g) => g.maddeler || [])
    .filter((m) => m.enlem != null && m.boylem != null)
    .map((m) => ({ id: m.id, ad: m.baslik, enlem: m.enlem, boylem: m.boylem, ikon: m.tip === 'yeme-icme' ? '🍽️' : m.tip === 'ulasim' ? '🚕' : '📍' }))

  const tumPinler = [...konaklamaPinleri, ...maddePinleri]

  if (ziyaretEdilenIsoKodlari.size === 0 && tumPinler.length === 0) {
    return <p className="text-sm text-kraft">Günlere ülke/şehir, konaklama ve maddelere konum eklendikçe burada harita oluşacak.</p>
  }

  return (
    <div className="rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
      <div className="relative">
        <ComposableMap projectionConfig={{ scale: 130 }} width={800} height={420} style={{ width: '100%', height: 'auto' }}>
          <Geographies geography={GEOGRAPHY_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const ziyaretEdildi = ziyaretEdilenIsoKodlari.has(geo.id)
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={ziyaretEdildi ? '#B33A3A' : '#C9BC98'}
                    stroke="#8C8368"
                    strokeWidth={0.6}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: ziyaretEdildi ? '#9c3232' : '#B5A67D' },
                      pressed: { outline: 'none' },
                    }}
                  />
                )
              })
            }
          </Geographies>

          {tumPinler.map((p) => (
            <Marker key={p.id} coordinates={[p.boylem, p.enlem]}>
              <circle
                r={4}
                fill="#4A6E6B"
                stroke="#F5EFE1"
                strokeWidth={1.5}
                onMouseEnter={() => setUzerindeGezinilen({ metin: `${p.ikon} ${p.ad}` })}
                onMouseLeave={() => setUzerindeGezinilen(null)}
              />
            </Marker>
          ))}
        </ComposableMap>

        {uzerindeGezinilen && (
          <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 rounded-sm bg-murekkep px-2 py-1 text-[11px] text-kagit">
            {uzerindeGezinilen.metin}
          </div>
        )}
      </div>

      <p className="mt-2 text-center text-xs text-kraft">
        {ziyaretEdilenIsoKodlari.size} ülke · {tumPinler.length} mekan işaretlendi
      </p>
    </div>
  )
}

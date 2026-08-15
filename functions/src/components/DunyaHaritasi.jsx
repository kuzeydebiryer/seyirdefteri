import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

// world-atlas'ın herkese açık CDN kopyası — react-simple-maps'in tipik kullanım
// şekli, kendi topojson dosyanı bundle etmek yerine bunu çalışma anında çeker.
const GEOGRAPHY_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

export default function DunyaHaritasi({ geziler }) {
  const navigate = useNavigate()
  const [uzerindeGezinilen, setUzerindeGezinilen] = useState(null) // {metin}

  const ziyaretEdilenIsoKodlari = new Set(geziler.map((g) => g.ulkeIso).filter(Boolean))
  const ziyaretEdilenUlkeSayisi = new Set(geziler.map((g) => g.ulkeKodu).filter(Boolean)).size
  const sehirPinleri = geziler.filter((g) => g.enlem != null && g.boylem != null)
  const ziyaretEdilenSehirSayisi = new Set(sehirPinleri.map((g) => `${g.konum}-${g.ulkeKodu}`)).size

  return (
    <div className="mb-8 rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
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

          {sehirPinleri.map((g) => (
            <Marker key={g.id} coordinates={[g.boylem, g.enlem]}>
              <circle
                r={4}
                fill="#4A6E6B"
                stroke="#F5EFE1"
                strokeWidth={1.5}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/gonderi/${g.id}`)}
                onMouseEnter={() => setUzerindeGezinilen({ metin: `${g.konum}${g.ulkeAdi ? ', ' + g.ulkeAdi : ''}` })}
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
        {ziyaretEdilenUlkeSayisi > 0 || ziyaretEdilenSehirSayisi > 0
          ? `${ziyaretEdilenUlkeSayisi} ülke · ${ziyaretEdilenSehirSayisi} şehir gezildi`
          : 'Bir gezi paylaşırken ülke seç, haritada işaretlensin.'}
      </p>
    </div>
  )
}

import { useState } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

const GEOGRAPHY_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// Gezi Günceleri'ndeki DunyaHaritasi.jsx ile aynı görsel dil — ama burada
// veri kaynağı Instagram paylaşımları (ilhamPanosu/Gezi) ve tıklama bir
// gönderiye gitmiyor, üstteki filtreyi (ülke veya mekan) değiştiriyor.
export default function IlhamGeziHaritasi({ ilhamlar, onUlkeTikla, onMekanTikla }) {
  const [uzerindeGezinilen, setUzerindeGezinilen] = useState(null)

  const ziyaretEdilenIsoKodlari = new Set(ilhamlar.map((i) => i.geziUlkeIso).filter(Boolean))
  const ziyaretEdilenUlkeSayisi = new Set(ilhamlar.map((i) => i.geziUlkeKodu).filter(Boolean)).size
  const mekanPinleri = ilhamlar.filter((i) => i.geziEnlem != null && i.geziBoylem != null)
  const ziyaretEdilenMekanSayisi = new Set(mekanPinleri.map((i) => `${i.geziKonum}-${i.geziUlkeKodu}`)).size

  return (
    <div className="mb-6 rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
      <div className="relative">
        <ComposableMap projectionConfig={{ scale: 130 }} width={800} height={420} style={{ width: '100%', height: 'auto' }}>
          <Geographies geography={GEOGRAPHY_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const ziyaretEdildi = ziyaretEdilenIsoKodlari.has(geo.id)
                const buUlkeninKodu = ilhamlar.find((i) => i.geziUlkeIso === geo.id)?.geziUlkeKodu
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => ziyaretEdildi && buUlkeninKodu && onUlkeTikla(buUlkeninKodu)}
                    fill={ziyaretEdildi ? '#B33A3A' : '#C9BC98'}
                    stroke="#8C8368"
                    strokeWidth={0.6}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: ziyaretEdildi ? '#9c3232' : '#B5A67D', cursor: ziyaretEdildi ? 'pointer' : 'default' },
                      pressed: { outline: 'none' },
                    }}
                  />
                )
              })
            }
          </Geographies>

          {mekanPinleri.map((i) => (
            <Marker key={i.id} coordinates={[i.geziBoylem, i.geziEnlem]}>
              <circle
                r={4}
                fill="#4A6E6B"
                stroke="#F5EFE1"
                strokeWidth={1.5}
                style={{ cursor: 'pointer' }}
                onClick={() => onMekanTikla(i.geziKonum)}
                onMouseEnter={() => setUzerindeGezinilen({ metin: `${i.geziKonum}${i.geziUlkeAdi ? ', ' + i.geziUlkeAdi : ''}` })}
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
        {ziyaretEdilenUlkeSayisi > 0 || ziyaretEdilenMekanSayisi > 0
          ? `${ziyaretEdilenUlkeSayisi} ülke · ${ziyaretEdilenMekanSayisi} mekan — bir ülkeye/pine tıkla, filtrelesin`
          : 'Bir gezi paylaşımı ülke/mekan bilgisiyle eklendiğinde burada görünecek.'}
      </p>
    </div>
  )
}

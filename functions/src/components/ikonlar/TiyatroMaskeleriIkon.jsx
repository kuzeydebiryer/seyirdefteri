// Klasik tiyatro maskeleri (komedi + trajedi) — tema değiştiriciye özgün bir
// "kültür-sanat" dokunuşu. Aydınlık modda gülen (komedi) maske öne/vurgulu,
// karanlık modda üzgün (trajedi) maske öne/vurgulu çıkıyor — güneş/ay
// emojisi yerine sitenin kimliğine ait bir sembol. Sitenin diğer özel
// ikonlarıyla (OscarHeykelIkon) aynı ince çizgi üslubunda.
export default function TiyatroMaskeleriIkon({ tema, boyut = 20, className = '' }) {
  const komikOndeMi = tema !== 'koyu'

  return (
    <svg width={boyut} height={boyut} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Trajedi maskesi (üzgün) */}
      <g opacity={komikOndeMi ? 0.32 : 1}>
        <path
          d="M4.5 6.2c0-1.8 1.8-3.2 4-3.2s4 1.4 4 3.2v3.8c0 3.1-1.8 5.6-4 5.6s-4-2.5-4-5.6V6.2Z"
          stroke="currentColor"
          strokeWidth="1.3"
          fill={komikOndeMi ? 'none' : 'currentColor'}
          fillOpacity={komikOndeMi ? 0 : 0.08}
        />
        <circle cx="6.8" cy="7.6" r="0.65" fill="currentColor" />
        <circle cx="10.2" cy="7.6" r="0.65" fill="currentColor" />
        <path d="M6.6 13c.8-1.1 2.4-1.1 3.2 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </g>

      {/* Komedi maskesi (gülen) — önde, arkadakini kısmen örtüyor (klasik "iki maske" kompozisyonu) */}
      <g opacity={komikOndeMi ? 1 : 0.32}>
        <path
          d="M11.5 9c0-1.8 1.8-3.2 4-3.2s4 1.4 4 3.2v3.8c0 3.1-1.8 5.6-4 5.6s-4-2.5-4-5.6V9Z"
          stroke="currentColor"
          strokeWidth="1.3"
          fill={komikOndeMi ? 'currentColor' : 'none'}
          fillOpacity={komikOndeMi ? 0.08 : 0}
        />
        <circle cx="13.8" cy="10.4" r="0.65" fill="currentColor" />
        <circle cx="17.2" cy="10.4" r="0.65" fill="currentColor" />
        <path d="M13.6 14.4c.9 1.2 2.9 1.2 3.8 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

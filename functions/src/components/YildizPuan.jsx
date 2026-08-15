export default function YildizPuan({ puan, boyut = 'text-base', onluGoster = true }) {
  if (puan == null) return null
  const tam = Math.floor(puan)
  const yarim = puan % 1 !== 0
  return (
    <span className={`inline-flex items-center gap-1.5 ${boyut}`}>
      <span className="yildiz tracking-tight" aria-label={`${puan} yıldız`}>
        {'★'.repeat(tam)}
        {yarim && '½'}
      </span>
      {onluGoster && <span className="text-kraft">{(puan * 2).toFixed(1)}/10</span>}
    </span>
  )
}

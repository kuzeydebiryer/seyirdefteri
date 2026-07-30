export default function YildizPuan({ puan, boyut = 'text-base' }) {
  if (puan == null) return null
  const tam = Math.floor(puan)
  const yarim = puan % 1 !== 0
  return (
    <span className={`yildiz ${boyut} tracking-tight`} aria-label={`${puan} yıldız`}>
      {'★'.repeat(tam)}
      {yarim && '½'}
    </span>
  )
}

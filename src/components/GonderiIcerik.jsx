import { icerikBloklariniAyir } from '../utils/icerikAyristir.js'

// tam=true: gönderi detay sayfasında tüm bloklar gösterilir
// tam=false: akış kartında önizleme için ilk 1-2 metin bloğu, görseller atlanır
export default function GonderiIcerik({ metin, tam = true }) {
  const bloklar = icerikBloklariniAyir(metin)
  if (bloklar.length === 0) return null

  if (!tam) {
    const ilkMetin = bloklar.find((b) => b.tip === 'metin')
    if (!ilkMetin) return null
    return <p className="mt-1 text-sm text-murekkep/90 leading-snug line-clamp-3 whitespace-pre-wrap">{ilkMetin.icerik}</p>
  }

  return (
    <div className="space-y-4">
      {bloklar.map((blok, i) =>
        blok.tip === 'gorsel' ? (
          <img key={i} src={blok.url} alt="" className="w-full rounded-sm ring-1 ring-cizgi" />
        ) : (
          <p key={i} className="whitespace-pre-wrap text-sm text-murekkep leading-relaxed">
            {blok.icerik}
          </p>
        )
      )}
    </div>
  )
}

import { icerikBloklariniAyir, satirIciBicimlendir, okumaSuresiTahminEt } from '../utils/icerikAyristir.js'

function SatirIci({ metin }) {
  return satirIciBicimlendir(metin).map((parca) =>
    parca.kalin ? (
      <strong key={parca.anahtar} className="font-semibold text-murekkep">
        {parca.metin}
      </strong>
    ) : (
      <span key={parca.anahtar}>{parca.metin}</span>
    )
  )
}

// tam=true: gönderi detay sayfasında tüm bloklar gösterilir
// tam=false: akış kartında önizleme için ilk 1-2 metin bloğu, görseller atlanır
export default function GonderiIcerik({ metin, tam = true }) {
  const bloklar = icerikBloklariniAyir(metin)
  if (bloklar.length === 0) return null

  if (!tam) {
    const ilkMetin = bloklar.find((b) => b.tip === 'metin' || b.tip === 'baslik')
    if (!ilkMetin) return null
    const onizlemeOkumaSuresi = okumaSuresiTahminEt(metin)
    return (
      <div>
        {onizlemeOkumaSuresi >= 2 && <p className="text-[11px] text-kraft">⏱ {onizlemeOkumaSuresi} dk okuma</p>}
        <p className="mt-1 text-sm text-murekkep/90 leading-snug line-clamp-3 whitespace-pre-wrap">{ilkMetin.icerik}</p>
      </div>
    )
  }

  // Okuma süresi sadece gerçekten uzun (2+ dakikalık) yazılarda gösteriliyor —
  // kısa bir film/dizi güncesinde "1 dk okuma" yazmanın bir anlamı yok, bu
  // bilgi asıl Yazı bölümündeki denemeler/incelemeler için değerli.
  const okumaSuresi = okumaSuresiTahminEt(metin)

  return (
    <div className="space-y-4">
      {okumaSuresi >= 2 && <p className="text-xs text-kraft">⏱ {okumaSuresi} dk okuma</p>}
      {bloklar.map((blok, i) => {
        if (blok.tip === 'gorsel') {
          return <img key={i} src={blok.url} alt="" className="w-full rounded-sm ring-1 ring-cizgi" />
        }
        if (blok.tip === 'baslik') {
          return (
            <h3 key={i} className="font-baslik text-lg text-murekkep">
              {blok.icerik}
            </h3>
          )
        }
        if (blok.tip === 'alinti') {
          return (
            <blockquote key={i} className="whitespace-pre-wrap border-l-2 border-muhur pl-3 text-sm italic text-kraft">
              {blok.icerik}
            </blockquote>
          )
        }
        return (
          <p key={i} className="whitespace-pre-wrap text-sm text-murekkep leading-relaxed">
            <SatirIci metin={blok.icerik} />
          </p>
        )
      })}
    </div>
  )
}

// Sinema Odası yan paneli: o haftanın filminin künyesi ve kadrosu.
// Renkler sabit (koyu sinema paleti) — sitenin açık/koyu temasından bağımsız.
function Satir({ etiket, deger }) {
  if (!deger) return null
  return (
    <div className="flex gap-2 py-1 text-[13px] leading-snug">
      <span className="w-28 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-[#C9A227]">{etiket}</span>
      <span className="text-[#f5f0e1]">{deger}</span>
    </div>
  )
}

export default function KunyeCekmecesi({ etkinlik, kunye }) {
  const liste = (a) => (a && a.length ? a.join(', ') : '')
  const meta = [etkinlik?.eserYil, kunye?.sureDk && `${kunye.sureDk} dk`, liste(kunye?.turler)].filter(Boolean).join(' · ')
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {(kunye?.posterUrl || etkinlik?.eserPosterUrl) && (
          <img
            src={kunye?.posterUrl || etkinlik.eserPosterUrl}
            alt={etkinlik?.eserBaslik}
            className="w-20 shrink-0 rounded-sm object-cover shadow-lg ring-1 ring-white/20"
          />
        )}
        <div className="min-w-0">
          <h3 className="font-baslik text-xl leading-tight text-white">{etkinlik?.eserBaslik}</h3>
          {kunye?.orijinalBaslik && kunye.orijinalBaslik !== etkinlik?.eserBaslik && (
            <p className="text-xs italic text-[#b9b2a3]">{kunye.orijinalBaslik}</p>
          )}
          {meta && <p className="mt-1 text-xs text-[#d9d2c3]">{meta}</p>}
          {kunye?.slogan && <p className="mt-1 text-xs italic text-[#C9A227]">“{kunye.slogan}”</p>}
        </div>
      </div>

      {!kunye && <p className="text-sm text-[#b9b2a3]">Künye bilgisi yüklenemedi.</p>}

      {kunye && (
        <>
          <div className="divide-y divide-white/10 rounded-sm bg-white/5 px-3 py-1 ring-1 ring-white/10">
            <Satir etiket="Yönetmen" deger={liste(kunye.yonetmenler)} />
            <Satir etiket="Senaryo" deger={liste(kunye.senaristler)} />
            <Satir etiket="Görüntü Yön." deger={liste(kunye.goruntuYonetmenleri)} />
            <Satir etiket="Kurgu" deger={liste(kunye.kurgucular)} />
            <Satir etiket="Müzik" deger={kunye.bestekar} />
            <Satir etiket="Ülke" deger={liste(kunye.ulkeler)} />
          </div>

          {kunye.ozet && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#C9A227]">Özet</p>
              <p className="text-[13px] leading-relaxed text-[#ece6d8]">{kunye.ozet}</p>
            </div>
          )}

          {kunye.kadro?.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#C9A227]">Oyuncular</p>
              <ul className="grid grid-cols-3 gap-2">
                {kunye.kadro.map((k) => (
                  <li key={k.ad + k.karakter} className="text-center">
                    {k.foto ? (
                      <img src={k.foto} alt={k.ad} loading="lazy" className="mx-auto aspect-[2/3] w-full rounded-sm object-cover ring-1 ring-white/15" />
                    ) : (
                      <div className="mx-auto flex aspect-[2/3] w-full items-center justify-center rounded-sm bg-white/10 text-2xl">🎭</div>
                    )}
                    <p className="mt-1 text-[11px] font-semibold leading-tight text-white">{k.ad}</p>
                    {k.karakter && <p className="text-[10px] leading-tight text-[#b9b2a3]">{k.karakter}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

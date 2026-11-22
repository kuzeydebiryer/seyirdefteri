import { klaketBirak } from '../../utils/sinemaOdasiCanli.js'

// Söz isteme sırası (yan panel). Moderatör konuşması biteni "✓ Konuştu" ile düşürür;
// herkes kendi isteğini geri çekebilir. Sabit koyu palet.
export default function KlaketSirasi({ etkinlikId, sira, benimUid, moderatorMu }) {
  if (sira.length === 0) {
    return (
      <div className="rounded-sm bg-white/5 p-4 text-center ring-1 ring-white/10">
        <p className="text-3xl">🎬</p>
        <p className="mt-2 text-sm text-[#d9d2c3]">Sırada kimse yok.</p>
        <p className="mt-1 text-xs text-[#b9b2a3]">Söz almak için üstteki “Söz İste” klaketine bas.</p>
      </div>
    )
  }
  return (
    <ol className="space-y-2">
      {sira.map((k, i) => (
        <li
          key={k.uid}
          className={`flex items-center gap-3 rounded-sm px-3 py-2 ring-1 ${
            i === 0 ? 'bg-[#C9A227]/20 ring-[#C9A227]/60' : 'bg-white/5 ring-white/10'
          }`}
        >
          <span className={`font-baslik text-xl ${i === 0 ? 'text-[#ffd84d]' : 'text-[#b9b2a3]'}`}>{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white">
              {k.ad}
              {k.uid === benimUid && <span className="ml-1 text-[10px] uppercase tracking-wider text-[#C9A227]">sen</span>}
            </p>
            {i === 0 && <p className="text-[11px] text-[#ffd84d]">Söz sırası onda</p>}
          </div>
          {moderatorMu ? (
            <button
              type="button"
              onClick={() => klaketBirak(etkinlikId, k.uid).catch(() => {})}
              className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white ring-1 ring-white/20 hover:bg-white/20"
              title="Sıradan düşür"
            >
              ✓ Konuştu
            </button>
          ) : (
            k.uid === benimUid && (
              <button
                type="button"
                onClick={() => klaketBirak(etkinlikId, k.uid).catch(() => {})}
                className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white ring-1 ring-white/20 hover:bg-white/20"
              >
                Vazgeç
              </button>
            )
          )}
        </li>
      ))}
    </ol>
  )
}

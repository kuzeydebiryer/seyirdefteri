// 🏆 Ortak ekranda bir filmin ödül adaylıkları: her kategori bir kart, içinde rakip adaylar.
// Bu filmin adaylığı altın çerçeveli; kulübün tahmin sayısı 🔮, sonuç girildiyse kazanan 🏆.
// Bir kategoriye dokunan, o kategoriyi herkesin ekranında büyütür (vurgu = kategoriId).

const SARI = '#ffd84d'

function Gorsel({ a, buyuk }) {
  const src = a.kisiFotoUrl || a.posterUrl
  const boyut = buyuk ? 'w-full aspect-[2/3]' : 'h-12 w-8'
  return src ? (
    <img src={src} alt="" loading="lazy" className={`${boyut} shrink-0 rounded-sm object-cover`} />
  ) : (
    <div className={`${boyut} flex shrink-0 items-center justify-center rounded-sm bg-white/10 text-xs`}>🎬</div>
  )
}

function OdakKategori({ k }) {
  return (
    <div className="mb-6 rounded-md bg-white/5 p-4 ring-1 ring-[#ffd84d]/50">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: SARI }}>
        Kategori
      </p>
      <h3 className="font-baslik text-2xl text-white sm:text-3xl">{k.ad}</h3>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {k.adaylar.map((a) => {
          const kazanan = k.kazananAdayId === a.id
          return (
            <div
              key={a.id}
              className={`rounded-md p-2 ${a.buFilm ? 'bg-[#C9A227]/25 ring-2 ring-[#ffd84d]' : 'bg-[#1f1f2e] ring-1 ring-white/15'}`}
            >
              <Gorsel a={a} buyuk />
              <p className="mt-2 text-sm font-semibold leading-tight text-white">
                {kazanan && '🏆 '}
                {a.kisiAdi || a.filmBasligi}
              </p>
              {a.kisiAdi && <p className="text-[11px] leading-tight text-[#d9d2c3]">{a.filmBasligi}</p>}
              {a.tahmin > 0 && <p className="mt-1 text-[11px]" style={{ color: SARI }}>🔮 {a.tahmin} kulüp tahmini</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function OdulGorunumu({ odul, vurgu, onVurgu }) {
  const odak = odul?.sezonlar?.flatMap((s) => s.kategoriler).find((k) => k.id === vurgu)
  if (!odul || odul.toplam === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-4xl">🏆</p>
        <p className="mt-2 text-white">{odul?.filmBaslik} için sitede kayıtlı bir ödül adaylığı yok.</p>
        <p className="mt-1 text-xs text-[#d9d2c3]">Adaylar “Ödül Yolculuğu” sayfasındaki sezonlardan gelir.</p>
      </div>
    )
  }
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: SARI }}>
        🏆 Ödül adaylıkları
      </p>
      <h2 className="mt-1 font-baslik text-3xl text-white">
        {odul.filmBaslik} <span className="text-xl text-[#d9d2c3]">· {odul.toplam} adaylık</span>
      </h2>
      <p className="mb-4 text-xs text-[#d9d2c3]">Bir kategoriye dokununca herkesin ekranında büyür. Altın çerçeve: bu film.</p>

      {odak && <OdakKategori k={odak} />}

      {odul.sezonlar.map((s) => (
        <div key={s.sezonAd} className="mb-6">
          <p className="mb-2 font-baslik text-lg" style={{ color: SARI }}>
            {s.sezonAd} <span className="text-sm text-[#d9d2c3]">({s.kategoriler.length})</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {s.kategoriler.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => onVurgu(vurgu === k.id ? null : k.id)}
                className={`flex h-full flex-col justify-start rounded-md p-3 text-left transition ${vurgu === k.id ? 'bg-white/10 ring-2 ring-[#ffd84d]' : 'bg-white/5 ring-1 ring-white/10 hover:ring-white/40'}`}
              >
                <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: SARI }}>
                  {k.ad}
                </p>
                <ul className="space-y-1.5">
                  {k.adaylar.map((a) => (
                    <li
                      key={a.id}
                      className={`flex items-center gap-2 rounded-sm px-1 py-0.5 ${a.buFilm ? 'bg-[#C9A227]/25 ring-1 ring-[#ffd84d]/70' : ''}`}
                    >
                      <Gorsel a={a} />
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-xs ${a.buFilm ? 'font-bold text-white' : 'text-[#ece6d8]'}`}>
                          {k.kazananAdayId === a.id && '🏆 '}
                          {a.kisiAdi || a.filmBasligi}
                        </p>
                        {a.kisiAdi && <p className="truncate text-[10px] text-[#b9b2a3]">{a.filmBasligi}</p>}
                      </div>
                      {a.tahmin > 0 && (
                        <span className="shrink-0 text-[10px]" style={{ color: SARI }}>
                          🔮{a.tahmin}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

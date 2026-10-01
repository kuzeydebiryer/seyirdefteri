import { useState } from 'react'
import { Link } from 'react-router-dom'
import { rastgeleEserGetir } from '../utils/disariListeler.js'

const FILTRELER = [
  { id: 'tumu', etiket: 'Tümü' },
  { id: 'sinema', etiket: '🎬 Film' },
  { id: 'dizi', etiket: '📺 Dizi' },
]

// "Ne izlesem?" için basit bir rastgele öneri — Dış Listeler'deki (Letterboxd
// 500, IMDb 250, NYT 100 Dizi vb.) KALİTE FİLTRESİNDEN GEÇMİŞ havuzdan
// çekiyor, TMDB'nin tüm kataloğundan değil. Basit mantık: önce filtreye
// uyan listelerden rastgele biri seçiliyor, sonra o listeden rastgele bir
// öğe — her tıklamada TÜM listelerin TÜM öğelerini çekmek yerine (bkz.
// utils/disariListeler.js'teki rastgeleEserGetir) tek bir listenin
// öğeleri kadar okuma yapılıyor.
export default function RastgeleOneriWidget() {
  const [filtre, setFiltre] = useState('tumu')
  const [oneri, setOneri] = useState(undefined) // undefined = henüz denenmedi
  const [yukleniyor, setYukleniyor] = useState(false)
  const [bosMu, setBosMu] = useState(false) // dış listeler hiç tanımlanmamışsa

  async function oner() {
    setYukleniyor(true)
    setBosMu(false)
    try {
      const sonuc = await rastgeleEserGetir(filtre === 'tumu' ? null : filtre)
      if (!sonuc) {
        setBosMu(true)
        setOneri(null)
      } else {
        setOneri(sonuc)
      }
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <div className="mb-10 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-baslik text-lg text-murekkep">🎲 Ne İzlesem?</h2>
        <div className="flex gap-1.5">
          {FILTRELER.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltre(f.id)}
              className={`rounded-full px-2.5 py-1 text-[11px] ${
                filtre === f.id ? 'bg-gise text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi hover:text-murekkep'
              }`}
            >
              {f.etiket}
            </button>
          ))}
        </div>
      </div>

      {oneri === undefined && (
        <p className="mb-3 text-xs text-kraft">
          Letterboxd 500, IMDb 250, NYT'nin En İyi 100 Dizisi gibi dış listelerden rastgele bir öneri çeker.
        </p>
      )}

      {bosMu && <p className="mb-3 text-xs text-kraft">Bu filtrede henüz bir dış liste tanımlanmamış.</p>}

      {oneri && (
        <Link
          to={`/${oneri.tur === 'dizi' ? 'dizi' : 'film'}/${oneri.id}`}
          className="mb-3 flex items-center gap-3 rounded-sm bg-kagit p-2.5 ring-1 ring-cizgi transition hover:ring-deniz"
        >
          <div className="h-24 w-16 shrink-0 overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
            {oneri.posterUrl ? (
              <img src={oneri.posterUrl} alt={oneri.baslik} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">{oneri.tur === 'dizi' ? '📺' : '🎬'}</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-kraft">{oneri.tur === 'dizi' ? 'Dizi' : 'Film'}</p>
            <p className="truncate font-baslik text-base text-murekkep">{oneri.baslik}</p>
            {oneri.yil && <p className="text-xs text-kraft">{oneri.yil}</p>}
            <p className="mt-0.5 truncate text-[11px] text-kraft">{oneri.listeAdi}'nden</p>
          </div>
        </Link>
      )}

      <button
        onClick={oner}
        disabled={yukleniyor}
        className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
      >
        {yukleniyor ? 'Seçiliyor...' : oneri ? '🎲 Başka Öner' : '🎲 Bir Şey Öner'}
      </button>
    </div>
  )
}

import { Link } from 'react-router-dom'
import YildizPuan from './YildizPuan.jsx'

const ESER_LINKI = (tur, disId) => (tur === 'dizi' ? `/dizi/${disId}` : tur === 'kitap' ? `/kitap/${disId}` : `/film/${disId}`)

// Letterboxd'daki "New from friends" grid'inin karşılığı — takip ettiklerinin
// en son günlük kayıtlarından bir poster şeridi. TakipGunlukKarti'nden farkı:
// bu tam bir akış öğesi değil, hızlı bir "kim ne izliyor" taraması —
// dokunulunca doğrudan esere gidiyor, kartın kendisine değil.
export default function YeniGunlukGridi({ kayitlar }) {
  if (!kayitlar || kayitlar.length === 0) return null

  return (
    <div className="mb-10">
      <h2 className="mb-3 font-baslik text-lg text-murekkep">Takip Ettiklerinden Yeni</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {kayitlar.map((k) => (
          <Link key={k.id} to={ESER_LINKI(k.tur, k.disId)} className="shrink-0" style={{ width: 104 }}>
            <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
              {k.posterUrl ? (
                <img src={k.posterUrl} alt={k.baslik} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">{k.tur === 'kitap' ? '📖' : '🎬'}</div>
              )}
            </div>
            <p className="mt-1 truncate text-[11px] text-murekkep">{k.kullaniciAdi}</p>
            {k.puan != null ? (
              <YildizPuan puan={k.puan} boyut="text-[10px]" onluGoster={false} />
            ) : (
              <span className="text-[10px] text-kraft">{k.olayTuru === 'baslama' ? 'başladı' : ''}</span>
            )}
            {k.not && <span className="ml-1 text-[10px] text-kraft">📝</span>}
          </Link>
        ))}
      </div>
    </div>
  )
}

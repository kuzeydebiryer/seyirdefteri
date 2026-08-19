import { Link } from 'react-router-dom'
import YildizPuan from './YildizPuan.jsx'
import { gunlukKaydiLinki, gunlukKaydiYerTutucuIkon } from '../utils/gunluk.js'

// Letterboxd'daki "New from friends" grid'inin karşılığı — takip ettiklerinin
// en son günlük kayıtlarından bir poster şeridi. TakipGunlukKarti'nden farkı:
// bu tam bir akış öğesi değil, hızlı bir "kim ne izliyor" taraması —
// dokunulunca doğrudan hedefe gidiyor, kartın kendisine değil.
export default function YeniGunlukGridi({ kayitlar, tumunuGorLink }) {
  if (!kayitlar || kayitlar.length === 0) return null

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">Takip Ettiklerinden Yeni</h2>
        {tumunuGorLink && (
          <Link to={tumunuGorLink} className="shrink-0 whitespace-nowrap text-sm text-kraft hover:text-deniz">
            Tümünü Gör ›
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {kayitlar.map((k) => (
          <Link key={k.id} to={gunlukKaydiLinki(k)} className="shrink-0" style={{ width: 104 }}>
            <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
              {k.posterUrl ? (
                <img src={k.posterUrl} alt={k.baslik} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">{gunlukKaydiYerTutucuIkon(k)}</div>
              )}
            </div>
            <p className="mt-1 truncate text-[11px] text-murekkep">{k.kullaniciAdi}</p>
            {k.puan != null ? (
              <YildizPuan puan={k.puan} boyut="text-[10px]" onluGoster={false} />
            ) : (
              <span className="text-[10px] text-kraft">
                {k.tur === 'gezi' ? 'gezi' : k.tur === 'etkinlik' ? 'etkinlik' : k.olayTuru === 'baslama' ? 'başladı' : ''}
              </span>
            )}
            {k.not && <span className="ml-1 text-[10px] text-kraft">📝</span>}
          </Link>
        ))}
      </div>
    </div>
  )
}

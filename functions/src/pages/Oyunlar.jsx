import { Link } from 'react-router-dom'

const OYUNLAR = [
  { yol: '/oyunlar/omubumu', ikon: '🆚', baslik: 'O mu Bu mu', aciklama: 'En İyi Film Listeleri\'nden iki film karşı karşıya — hangisini daha çok seversin?' },
  { yol: '/oyunlar/sinemadle', ikon: '🎯', baslik: 'Sinemadle', aciklama: 'Günün gizli filmini ipuçlarıyla tahmin et — her gün yeni bir film.' },
  { yol: '/oyunlar/slogan', ikon: '💬', baslik: 'Bu Slogan Hangi Filme Ait?', aciklama: 'Afişteki o vurucu cümleyi hangi film taşıyordu?' },
  { yol: '/oyunlar/sahne', ikon: '🎬', baslik: 'Bu Sahne Hangi Filmden?', aciklama: 'Bir kare gösteriyoruz, filmi bulabilecek misin?' },
  { yol: '/oyunlar/oyuncu', ikon: '🎭', baslik: 'Hangi Oyuncu Oynamadı?', aciklama: 'Dördünden biri bu filmde hiç yoktu.' },
  { yol: '/oyunlar/poster', ikon: '🔍', baslik: 'Afişten Filmi Bil', aciklama: 'Yakınlaştırılmış bir kesitten filmi tanı.' },
  { yol: '/oyunlar/kopru', ikon: '🔗', baslik: 'Film Köprüsü', aciklama: 'İki filmi bağlayan görünmez oyuncuyu bul.' },
  { yol: '/oyunlar/alinti', ikon: '📖', baslik: 'Bu Alıntı Hangi Kitaptan?', aciklama: 'Alıntı Duvarı\'ndan gerçek paylaşımlar — tamamen sizin.' },
  { yol: '/oyunlar/muzik', ikon: '🎵', baslik: 'Bu Müzik Hangi Filmden?', aciklama: '30 saniyelik bir parça — filmi bulabilecek misin?' },
]

export default function Oyunlar() {
  return (
    <div>
      <h1 className="mb-1 font-baslik text-2xl text-murekkep">🎲 Sinema Oyunları</h1>
      <p className="mb-6 text-sm text-kraft">Topluluğun izlediği filmlerden, topluluğun paylaştığı alıntılardan — tamamen size özel sorular.</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OYUNLAR.map((o) => (
          <Link
            key={o.yol}
            to={o.yol}
            className="rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi transition hover:ring-deniz/50"
          >
            <p className="text-2xl">{o.ikon}</p>
            <p className="mt-1 font-baslik text-base text-murekkep">{o.baslik}</p>
            <p className="mt-0.5 text-xs text-kraft">{o.aciklama}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

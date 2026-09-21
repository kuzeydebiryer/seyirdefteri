// IMDb'nin resmi logosu — sarı zemin (#F5C518), kalın/bloklu siyah harfler.
// Gerçek bir font dosyası indirmek yerine (marka fontu genelde özel/ücretli
// oluyor), Tailwind'in en kalın ağırlığı (font-black) + sıkı harf aralığı
// (tracking-tighter) ile aynı görsel etkiyi taklit ediyoruz — sarı kutu
// içinde kalın "IMDb" yazısı, gerçek logoya çok yakın duruyor. Sitede IMDb
// her göründüğü yerde (film sayfasındaki puan rozeti, En İyi Film
// Listeleri'ndeki liste rozeti) TEK bu bileşen kullanılıyor, tutarlılık
// için ayrı ayrı stillendirme tekrarlanmıyor.
export default function IMDbIkon({ className = 'text-[10px] px-1.5 py-0.5' }) {
  return <span className={`inline-block rounded-[2px] bg-[#F5C518] font-black tracking-tighter text-black ${className}`}>IMDb</span>
}

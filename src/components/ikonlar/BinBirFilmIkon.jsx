// "Ölmeden Önce Görmeniz Gereken 1001 Film" — Letterboxd/IMDb/Criterion'un
// aksine resmi bir şirket/uygulama markası değil (Steven Jay Schneider
// editörlüğündeki bir kitap serisi), yani sabit bir "resmi logo" kaynağı
// yok. IMDb'nin kalın rakamlı, yüksek kontrastlı rozet mantığını (sarı
// kutuda kalın harfler) buraya da uyguladık — beyaz kutuda kalın "1001"
// rakamı, kitap kapağının kendi yüksek kontrastlı (siyah-beyaz) kimliğine
// de yakın duruyor.
export default function BinBirFilmIkon({ className = 'text-[9px] px-1 py-0.5' }) {
  return <span className={`inline-block rounded-[2px] bg-white font-black tracking-tighter text-black ${className}`}>1001</span>
}

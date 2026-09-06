// Storytel uygulamasının kendi kategori/renk dilini birebir yansıtıyor —
// kitap işaretlenirken bu listeden biri seçiliyor (bkz.
// utils/storytelKitaplari.js, StorytelKitaplari.jsx).
export const STORYTEL_KATEGORILERI = [
  { id: 'fantastik', ad: 'Fantastik', renk: '#e8622e' },
  { id: 'bilim-kurgu', ad: 'Bilim Kurgu', renk: '#6badf0' },
  { id: 'tarih', ad: 'Tarih', renk: '#4fae82' },
  { id: 'kisisel-gelisim', ad: 'Kişisel Gelişim', renk: '#f5c95c' },
  { id: 'genclik', ad: 'Gençlik', renk: '#f0a0c4' },
  { id: 'oyku', ad: 'Öykü', renk: '#4fae82' },
  { id: 'dil-egitimi', ad: 'Dil Eğitimi', renk: '#f5c95c' },
  { id: 'siir-drama', ad: 'Şiir & Drama', renk: '#e8622e' },
  { id: 'biyografi', ad: 'Biyografi', renk: '#e8622e' },
  { id: 'cocuk', ad: 'Çocuk', renk: '#6badf0' },
  { id: 'polisiye', ad: 'Polisiye', renk: '#4fae82' },
  { id: 'roman', ad: 'Roman', renk: '#f5c95c' },
  { id: 'kurgu-disi', ad: 'Kurgu Dışı', renk: '#f0a0c4' },
  { id: 'klasikler', ad: 'Klasikler', renk: '#4fae82' },
]

// Storytel kitap sayfasından çekilen ham kategori metnini (ör. "Roman",
// "Bilimkurgu") yukarıdaki pil listesine eşleştiriyor — kullanıcı linki
// yapıştırdığında ilgili pil otomatik seçilsin, elle tekrar seçmeye
// gerek kalmasın diye. Storytel'in tam adları çoğunlukla birebir aynı,
// ama bazı sayfalarda farklı yazılmış olabilir diye küçük bir eşanlamlı
// tablosu da tutuyoruz. Eşleşme yoksa null döner, kullanıcı elle seçer.
const ESANLAMLI_ESLESTIRME = {
  bilimkurgu: 'bilim-kurgu',
  'bilim kurgu': 'bilim-kurgu',
  'kişisel gelişim': 'kisisel-gelisim',
  'dil eğitimi': 'dil-egitimi',
  'şiir': 'siir-drama',
  'şiir & drama': 'siir-drama',
  'şiir ve drama': 'siir-drama',
  drama: 'siir-drama',
  'kurgu dışı': 'kurgu-disi',
  'kurgu dışı kitaplar': 'kurgu-disi',
}

export function storytelHamKategoridenPilEslestir(hamKategori) {
  if (!hamKategori) return null
  // Birden fazla kategori virgülle gelmiş olabilir (bkz.
  // functions/index.js'teki storytelKitapBilgisiGetir) — ilkini deniyoruz.
  const ilkKategori = hamKategori.split(',')[0].trim().toLocaleLowerCase('tr-TR')
  if (!ilkKategori) return null
  const birebir = STORYTEL_KATEGORILERI.find((k) => k.ad.toLocaleLowerCase('tr-TR') === ilkKategori)
  if (birebir) return birebir.id
  return ESANLAMLI_ESLESTIRME[ilkKategori] || null
}

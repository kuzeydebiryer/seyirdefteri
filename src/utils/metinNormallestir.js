// Farklı veri kaynakları aynı yabancı ismi farklı yazabiliyor — ör. Nobel
// API'sinin İngilizce alanı "Laszlo Krasznahorkai" (aksansız, sadeleştirilmiş)
// derken, Türkçe Kitap Veri Tabanı "László Krasznahorkai" (Macarca aksanlarıyla,
// doğru) yazıyor. Basit .toLowerCase() bu farkı görmezden gelmiyor çünkü "a" ile
// "á" bilgisayar için tamamen farklı karakterler.
//
// Unicode NFD normalizasyonu, aksanlı bir harfi "temel harf + ayrı aksan işareti"
// olarak ikiye ayırıyor (á → a + ´) — sonra o ayrı aksan işaretlerini
// (\u0300-\u036f aralığı) silince geriye sade "a" kalıyor. Bu sayede "László"
// ve "Laszlo" karşılaştırma amacıyla aynı hale geliyor (görüntülemede orijinal
// yazım hep korunuyor, bu sadece EŞLEŞTİRME için kullanılıyor).
export function aksansizKucultulmus(metin) {
  return (metin || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('tr-TR')
}

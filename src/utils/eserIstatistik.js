// Eser İstatistikleri — "Bizim Aramızda Popüler" listelerinin (Film/Dizi/Kitap
// sayfaları) her açılışta binlerce puan kaydını taramak yerine okuyabileceği
// küçük bir özet koleksiyonu. Bir eser puanlandığında (ister doğrudan yıldıza
// tıklayarak, ister puanlı bir günce yazarak) bu özet güncellenir.
//
// Doküman ID'si `${tur}_${disId}` — bir eser için tek bir özet kaydı olur.
// `eskiPuan` verilirse (kullanıcı puanını DEĞİŞTİRİYORSA) sadece farkı kadar
// toplam güncellenir, sayaç artmaz — aksi hâlde yeni bir puan olarak sayılır.
//
// Not: Bir kullanıcı hem doğrudan yıldızla hem ayrıca puanlı bir günceyle aynı
// esere puan verebiliyor (mevcut veri modelinin bir özelliği/kısıtı) — bu
// durumda ikisi de ayrı birer "puan" olarak sayılır. Bu, eser sayfasında
// zaten gösterilen topluluk ortalamasıyla tutarlı bir davranış.

import { doc, increment, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function eserIstatistikGuncelle(tur, disId, { baslik, alt, posterUrl, yil }, yeniPuan, eskiPuan = null) {
  if (yeniPuan == null) return
  const id = `${tur}_${disId}`
  const fark = eskiPuan != null ? yeniPuan - eskiPuan : yeniPuan
  const sayacFarki = eskiPuan != null ? 0 : 1
  await setDoc(
    doc(db, 'eserIstatistikleri', id),
    {
      tur,
      disId,
      baslik: baslik || '',
      alt: alt || '',
      posterUrl: posterUrl || '',
      yil: yil || '',
      puanToplam: increment(fark),
      puanSayisi: increment(sayacFarki),
    },
    { merge: true }
  )
}

import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase.js'

// Topluluğun en çok değerlendirdiği/favorilediği kişileri (yönetmen/oyuncu)
// getirir — Oyuncular keşif sayfasında "Bizim Aramızda Popüler" için kullanılır.
//
// Eskiden bu, TÜM `kisiDegerlendirmeleri` koleksiyonunu tarayıp tarayıcıda
// gruplardı. Artık `kisiIstatistikleri` özet koleksiyonunu okuyor — bu kayıt,
// bir kişiye her puan verildiğinde (bkz. kisiDegerlendirme.js) güncelleniyor.
export async function topluluktaPopulerKisiler(enFazla = 12) {
  const q = query(collection(db, 'kisiIstatistikleri'), orderBy('puanSayisi', 'desc'), limit(enFazla))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const veri = d.data()
    return {
      id: veri.kisiTmdbId,
      kisiAdi: veri.kisiAdi,
      kisiFotoUrl: veri.kisiFotoUrl,
      puanSayisi: veri.puanSayisi || 0,
      ortalamaPuan: veri.puanSayisi ? veri.puanToplam / veri.puanSayisi : null,
    }
  })
}

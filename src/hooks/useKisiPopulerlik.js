import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase.js'

// Topluluğun en çok değerlendirdiği/favorilediği kişileri (yönetmen/oyuncu)
// hesaplar — Oyuncular keşif sayfasında "Bizim Aramızda Popüler" için kullanılır.
export async function topluluktaPopulerKisiler(enFazla = 12) {
  const snap = await getDocs(collection(db, 'kisiDegerlendirmeleri'))
  const gruplar = new Map()
  snap.docs.forEach((d) => {
    const veri = d.data()
    const id = veri.kisiTmdbId
    if (!id) return
    if (!gruplar.has(id)) gruplar.set(id, { id, kisiAdi: veri.kisiAdi, kisiFotoUrl: veri.kisiFotoUrl, puanlar: [] })
    if (veri.puan != null) gruplar.get(id).puanlar.push(veri.puan)
  })
  const liste = Array.from(gruplar.values()).map((k) => ({
    ...k,
    ortalamaPuan: k.puanlar.length ? k.puanlar.reduce((a, b) => a + b, 0) / k.puanlar.length : null,
    puanSayisi: k.puanlar.length,
  }))
  liste.sort((a, b) => b.puanSayisi - a.puanSayisi)
  return liste.slice(0, enFazla)
}

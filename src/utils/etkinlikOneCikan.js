// Öne Çıkan Etkinlikler — Etkinlik.io'dan gelen onlarca sonuç arasından
// topluluğun bilerek seçtiği EN FAZLA 3 etkinlik. Tüm liste varsayılan olarak
// gizli/daraltılmış, sadece bu 3 tanesi öne çıkıyor — hem sayfa kısa kalıyor
// hem "hangisine gideceğiz" sorusuna topluluk cevap veriyor.

import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'

const MAKS_ONE_CIKAN = 3

export async function oneCikanlariGetir() {
  const q = query(collection(db, 'etkinlikOneCikanlar'), orderBy('eklemeTarihi', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function etkinligiOneCikar(kullanici, etkinlik, mevcutSayi) {
  if (mevcutSayi >= MAKS_ONE_CIKAN) {
    throw new Error(`Zaten ${MAKS_ONE_CIKAN} etkinlik öne çıkarılmış — önce birini kaldır.`)
  }
  await addDoc(collection(db, 'etkinlikOneCikanlar'), {
    etkinlikId: etkinlik.id,
    baslik: etkinlik.baslik,
    gorselUrl: etkinlik.gorselUrl || '',
    baslangic: etkinlik.baslangic || '',
    mekan: etkinlik.mekan || '',
    sehir: etkinlik.sehir || '',
    kategori: etkinlik.kategori || '',
    url: etkinlik.url,
    ekleyenId: kullanici.uid,
    eklemeTarihi: serverTimestamp(),
  })
}

export async function etkinligiKaldir(docId) {
  await deleteDoc(doc(db, 'etkinlikOneCikanlar', docId))
}

export const MAKS_ONE_CIKAN_SAYISI = MAKS_ONE_CIKAN

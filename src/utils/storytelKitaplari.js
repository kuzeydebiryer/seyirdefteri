import { deleteDoc, doc, getDoc, getDocs, collection, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// Storytel'in resmi bir API'si yok (bu oturumda araştırdık — sadece
// gayrı resmi, tersine mühendislikle erişilen kaynaklar var, onlara
// bağlanmıyoruz). Bu yüzden "bu kitap Storytel'de mevcut" bilgisi tamamen
// ELLE işaretleniyor — Yeni Gelen Filmler'deki gibi, sadece yönetici değil,
// giriş yapmış herkes ekleyebiliyor/kaldırabiliyor.
export async function storytelKitaplariGetir() {
  const snap = await getDocs(query(collection(db, 'storytelKitaplari'), orderBy('tarih', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function storytelKitabiMi(kitapId) {
  const snap = await getDoc(doc(db, 'storytelKitaplari', String(kitapId)))
  return snap.exists()
}

export async function storytelKitabiIsaretle(kullanici, { disId, baslik, alt, posterUrl, kategori, populerMi = false }) {
  await setDoc(doc(db, 'storytelKitaplari', String(disId)), {
    baslik,
    alt: alt || '',
    posterUrl: posterUrl || '',
    kategori: kategori || null,
    populerMi,
    ekleyenId: kullanici.uid,
    tarih: serverTimestamp(),
  })
}

// Anasayfa/Kitap sayfasındaki önizleme şeritleri ve "Storytel'de Popüler"
// bölümü için — populerMi:true olanları getiriyor. Serkan bunu her hafta
// elle güncelliyor (bkz. storytelPopulerligiDegistir), otomatik bir
// "trend" hesaplaması yok.
export async function storytelPopulerleriGetir() {
  const snap = await getDocs(query(collection(db, 'storytelKitaplari'), where('populerMi', '==', true), orderBy('tarih', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function storytelPopulerligiDegistir(kitapId, yeniDeger) {
  await updateDoc(doc(db, 'storytelKitaplari', String(kitapId)), { populerMi: yeniDeger })
}

export async function storytelKitabiKaldir(kitapId) {
  await deleteDoc(doc(db, 'storytelKitaplari', String(kitapId)))
}

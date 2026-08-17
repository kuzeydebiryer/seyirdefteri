import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// Mevcut "yorumlar" koleksiyonunu (şu ana kadar sadece günce/gönderi detay
// sayfasında kullanılıyordu, gonderiId alanıyla) eser sayfalarına da
// genişletiyoruz. Aynı dokümanda ya gonderiId YA DA (eserTur + eserDisId)
// dolu olur, ikisi birden değil — iki farklı "neye bağlı" ilişkisi.
//
// orderBy KULLANMIYORUZ (istemci tarafında sıralıyoruz) — iki eşitlik
// filtresi (eserTur + eserDisId) tek başına bileşik indeks GEREKTİRMEZ,
// Firestore bunları otomatik tekil alan indeksleriyle karşılıyor. orderBy
// eklersek bileşik indeks gerekir ve bugün yaşadığımız "deploy edilmemiş
// indeks" sürprizini tekrar riske atarız — bu yüzden bilinçli olarak kaçınıyoruz.
export async function eserYorumlariGetir(tur, disId) {
  const q = query(collection(db, 'yorumlar'), where('eserTur', '==', tur), where('eserDisId', '==', disId))
  const snap = await getDocs(q)
  const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  liste.sort((a, b) => (a.tarih?.toMillis?.() || 0) - (b.tarih?.toMillis?.() || 0))
  return liste
}

export async function eserYorumEkle(tur, disId, kullanici, yazarAdi, metin) {
  const ref = await addDoc(collection(db, 'yorumlar'), {
    eserTur: tur,
    eserDisId: disId,
    yazarId: kullanici.uid,
    yazarAdi: yazarAdi || kullanici.displayName || 'İsimsiz',
    metin: metin.trim(),
    tarih: serverTimestamp(),
  })
  return ref.id
}

export async function yorumSil(yorumId) {
  await deleteDoc(doc(db, 'yorumlar', yorumId))
}

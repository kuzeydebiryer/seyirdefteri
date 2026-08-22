import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

function planRef(id) {
  return doc(db, 'geziPlanlari', id)
}

export async function geziPlaniOlustur(kullanici, profil, { baslik, baslangicTarihi, bitisTarihi }) {
  const belge = await addDoc(collection(db, 'geziPlanlari'), {
    sahipId: kullanici.uid,
    sahipAdi: profil?.adSoyad || kullanici.displayName || 'İsimsiz',
    ortakDuzenleyenler: [],
    baslik: baslik || 'Yeni Gezi Planı',
    durum: 'planlaniyor',
    baslangicTarihi: baslangicTarihi || '',
    bitisTarihi: bitisTarihi || '',
    ucuslar: [],
    konaklamalar: [],
    gunler: [],
    olusturmaTarihi: serverTimestamp(),
  })
  return belge.id
}

// Sadece sahip görür (MVP — ortak düzenleme v2'de eklenecek, alan zaten
// hazır duruyor).
export async function geziPlanlariniGetir(uid) {
  const q = query(collection(db, 'geziPlanlari'), where('sahipId', '==', uid))
  const snap = await getDocs(q)
  const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  liste.sort((a, b) => (b.olusturmaTarihi?.toMillis?.() || 0) - (a.olusturmaTarihi?.toMillis?.() || 0))
  return liste
}

export async function geziPlaniGetir(id) {
  const snap = await getDoc(planRef(id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

// Genel amaçlı kısmi güncelleme — ucuslar/konaklamalar/gunler dizilerinin
// TAMAMI, ilgili alan değiştiğinde yeniden yazılıyor (küçük bir gezi planı
// için — birkaç uçuş, birkaç konaklama, birkaç gün — bu, alt koleksiyon +
// tekil doküman güncellemesi karmaşıklığından çok daha basit ve tek okumada
// tüm planı getirmeye devam ediyor).
export async function geziPlaniGuncelle(id, kismiVeri) {
  await updateDoc(planRef(id), kismiVeri)
}

export async function geziPlaniSil(id) {
  await deleteDoc(planRef(id))
}

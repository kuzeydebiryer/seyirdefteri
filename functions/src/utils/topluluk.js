import { arrayRemove, arrayUnion, deleteDoc, doc, getDoc, getDocs, collection, increment, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function topluluğaKatil(topluluklId, uid) {
  const batch = writeBatch(db)
  batch.set(doc(db, 'topluluklar', topluluklId, 'uyeler', uid), { katilmaTarihi: serverTimestamp() })
  batch.update(doc(db, 'topluluklar', topluluklId), { uyeSayisi: increment(1) })
  // Ters indeks: "bu kullanıcı hangi topluluklara üye" sorusuna, sitedeki
  // HER topluluğu tek tek kontrol etmeden (eskiden TopluluklarBildirimSeridi
  // bunu yapıyordu — N topluluk = N okuma, her anasayfa ziyaretinde) tek bir
  // okumayla cevap verebilmek için. Sadece bir görüntüleme/bildirim optimizasyonu
  // — gerçek yetkilendirme hâlâ topluluklar/{id}/uyeler/{uid} alt koleksiyonundan
  // kontrol ediliyor, bu dizi güvenlik kararı vermek için kullanılmıyor.
  batch.update(doc(db, 'kullanicilar', uid), { uyeOlduklarim: arrayUnion(topluluklId) })
  await batch.commit()
}

export async function topluluktanAyril(topluluklId, uid) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'topluluklar', topluluklId, 'uyeler', uid))
  batch.update(doc(db, 'topluluklar', topluluklId), { uyeSayisi: increment(-1) })
  batch.update(doc(db, 'kullanicilar', uid), { uyeOlduklarim: arrayRemove(topluluklId) })
  await batch.commit()
}

// --- Moderatör rolü ---
// "rol" alanı sadece kurucu tarafından değiştirilebilir (bkz. firestore.rules).
export async function rolDegistir(topluluklId, uid, yeniRol) {
  await updateDoc(doc(db, 'topluluklar', topluluklId, 'uyeler', uid), { rol: yeniRol })
}

// --- Kapalı/davetli topluluklar: katılma istekleri ---
export async function katilmaIstegiGonder(topluluklId, kullanici) {
  await setDoc(doc(db, 'topluluklar', topluluklId, 'istekler', kullanici.uid), {
    adSoyad: kullanici.displayName || 'İsimsiz',
    istekTarihi: serverTimestamp(),
  })
}

export async function katilmaIstegiIptalEt(topluluklId, uid) {
  await deleteDoc(doc(db, 'topluluklar', topluluklId, 'istekler', uid))
}

export async function katilmaIstegiVarMi(topluluklId, uid) {
  if (!uid) return false
  const snap = await getDoc(doc(db, 'topluluklar', topluluklId, 'istekler', uid))
  return snap.exists()
}

export async function katilmaIstekleriGetir(topluluklId) {
  const snap = await getDocs(collection(db, 'topluluklar', topluluklId, 'istekler'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Onaylama: üyeliği oluşturup isteği siliyor (tek batch). Sadece yönetici
// çağırabilir — kural bunu zorunlu kılıyor (uyeler/create: yönetici her zaman
// yazabilir, istekler/delete: yönetici her zaman silebilir).
export async function katilmaIstegiOnayla(topluluklId, uid) {
  const batch = writeBatch(db)
  batch.set(doc(db, 'topluluklar', topluluklId, 'uyeler', uid), { katilmaTarihi: serverTimestamp() })
  batch.update(doc(db, 'topluluklar', topluluklId), { uyeSayisi: increment(1) })
  batch.delete(doc(db, 'topluluklar', topluluklId, 'istekler', uid))
  batch.update(doc(db, 'kullanicilar', uid), { uyeOlduklarim: arrayUnion(topluluklId) })
  await batch.commit()
}

export async function katilmaIstegiReddet(topluluklId, uid) {
  await deleteDoc(doc(db, 'topluluklar', topluluklId, 'istekler', uid))
}

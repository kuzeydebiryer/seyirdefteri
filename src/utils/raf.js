import { addDoc, collection, deleteDoc, doc, getDocs, increment, limit, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function rafOlustur(kullanici, baslik, aciklama) {
  const ref = await addDoc(collection(db, 'raflar'), {
    kullaniciId: kullanici.uid,
    baslik,
    aciklama: aciklama || '',
    olusturmaTarihi: serverTimestamp(),
    ogeSayisi: 0,
  })
  return ref.id
}

export async function rafSil(rafId) {
  await deleteDoc(doc(db, 'raflar', rafId))
}

export async function rafOgeEkle(rafId, kullanici, { tur, disId, baslik, alt, posterUrl, ozelTur }) {
  await addDoc(collection(db, 'rafOgeleri'), {
    rafId,
    kullaniciId: kullanici.uid,
    tur,
    disId,
    baslik,
    alt: alt || '',
    posterUrl: posterUrl || '',
    ozelTur: ozelTur || null,
    eklemeTarihi: serverTimestamp(),
  })
  await updateDoc(doc(db, 'raflar', rafId), { ogeSayisi: increment(1) })
}

export async function rafOgeGuncelle(ogeId, { posterUrl }) {
  await updateDoc(doc(db, 'rafOgeleri', ogeId), { posterUrl })
}

export async function rafOgeSil(rafId, ogeId) {
  await deleteDoc(doc(db, 'rafOgeleri', ogeId))
  await updateDoc(doc(db, 'raflar', rafId), { ogeSayisi: increment(-1) })
}

// --- Kitaplığımda -------------------------------------------------------
// Sıfırdan yeni bir sistem kurmak yerine var olan Raflar altyapısını
// kullanıyor: her kullanıcının, ilk "Kitaplığımda" tıklamasında otomatik
// oluşan, ozelTur:'kitapligim' ile işaretlenmiş TEK bir özel rafı var.
// Bu sayede "Kitaplığımda" işaretlenen kitaplar başka bir şey yapmaya
// gerek kalmadan zaten "Raflarım" sekmesinde görünüyor.
export async function kitapligimRafIdGetir(uid) {
  const q = query(collection(db, 'raflar'), where('kullaniciId', '==', uid), where('ozelTur', '==', 'kitapligim'), limit(1))
  const snap = await getDocs(q)
  return snap.docs[0]?.id || null
}

async function kitapligimRafiOlustur(kullanici) {
  const ref = await addDoc(collection(db, 'raflar'), {
    kullaniciId: kullanici.uid,
    baslik: 'Kitaplığım',
    aciklama: 'Elimde olan / sahip olduğum kitaplar',
    ozelTur: 'kitapligim',
    olusturmaTarihi: serverTimestamp(),
    ogeSayisi: 0,
  })
  return ref.id
}

async function rafOgeIdGetir(rafId, disId) {
  const q = query(collection(db, 'rafOgeleri'), where('rafId', '==', rafId), where('disId', '==', disId), limit(1))
  const snap = await getDocs(q)
  return snap.docs[0]?.id || null
}

export async function kitaplikDurumuGetir(uid, disId) {
  const rafId = await kitapligimRafIdGetir(uid)
  if (!rafId) return false
  return !!(await rafOgeIdGetir(rafId, disId))
}

// Ekler/çıkarır, sonuçtaki YENİ durumu (true = artık kitaplıkta) döndürür.
export async function kitapligimdaDegistir(kullanici, { disId, baslik, alt, posterUrl }) {
  let rafId = await kitapligimRafIdGetir(kullanici.uid)
  if (!rafId) rafId = await kitapligimRafiOlustur(kullanici)
  const mevcutOgeId = await rafOgeIdGetir(rafId, disId)
  if (mevcutOgeId) {
    await rafOgeSil(rafId, mevcutOgeId)
    return false
  }
  await rafOgeEkle(rafId, kullanici, { tur: 'kitap', disId, baslik, alt, posterUrl, ozelTur: 'kitapligim' })
  return true
}

// "Şu kitabı arıyorum" isteklerinde otomatik eşleştirme için — bu kitabı
// "Kitaplığımda" işaretlemiş herkesi buluyor. rafOgeleri'ne ozelTur
// denormalize edildiği için (bkz. kitapligimdaDegistir) tek sorguda,
// raflar koleksiyonuna hiç gitmeden çalışıyor.
export async function kitabinSahipleriniBul(disId) {
  const q = query(collection(db, 'rafOgeleri'), where('disId', '==', disId), where('ozelTur', '==', 'kitapligim'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data().kullaniciId)
}

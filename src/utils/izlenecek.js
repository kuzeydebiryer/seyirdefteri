import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

function izlenecekDokId(uid, tur, disId) {
  return `${uid}_${tur}_${disId}`
}

export async function izlenecekEkle(kullanici, { tur, disId, baslik, alt, posterUrl, toplamSayfa, durum }) {
  const id = izlenecekDokId(kullanici.uid, tur, disId)
  await setDoc(doc(db, 'izlenecekler', id), {
    kullaniciId: kullanici.uid,
    tur, // 'sinema' | 'dizi' | 'kitap'
    disId,
    baslik,
    alt: alt || '',
    posterUrl: posterUrl || '',
    durum: durum || 'planlanan', // 'planlanan' | 'okunuyor'
    toplamSayfa: toplamSayfa || null,
    suankiSayfa: durum === 'okunuyor' ? 0 : null,
    eklemeTarihi: serverTimestamp(),
  })
}

export async function izlenecekKaldir(uid, tur, disId) {
  await deleteDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, tur, disId)))
}

export function izlenecekDokIdOlustur(uid, tur, disId) {
  return izlenecekDokId(uid, tur, disId)
}

export async function izlenecekMi(uid, tur, disId) {
  if (!uid) return false
  const snap = await getDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, tur, disId)))
  return snap.exists()
}

export async function izlenecekGetir(uid, tur, disId) {
  if (!uid) return null
  const snap = await getDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, tur, disId)))
  return snap.exists() ? snap.data() : null
}

// "İzleyeceklerim"den "Şu An Okuyorum/İzliyorum"a geçiş
export async function okumayaBasla(uid, tur, disId, toplamSayfa) {
  await updateDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, tur, disId)), {
    durum: 'okunuyor',
    toplamSayfa: toplamSayfa || null,
    suankiSayfa: 0,
  })
}

export async function ilerlemeGuncelle(uid, tur, disId, suankiSayfa) {
  await updateDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, tur, disId)), { suankiSayfa })
}

// "Okumaya Başlıyorum" tıklandığı anda kitabın sayfa sayısı katalogda henüz
// yoksa, izlenecek kaydı toplamSayfa:null ile oluşuyor. Kitap sonradan
// (Bilgiyi Düzenle veya Yeniden Dene ile) güncellenirse bu ESKİ kayıt kendiliğinden
// güncellenmiyor — iki ayrı belge. Bu fonksiyon o boşluğu kendiliğinden onarır:
// kayıt hâlâ toplamSayfa'sızsa ve katalogda artık bir değer varsa, geriye dönük doldurur.
export async function toplamSayfaTamamla(uid, tur, disId, toplamSayfa) {
  await updateDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, tur, disId)), { toplamSayfa })
}

// Kitap Kesfet hub sayfasındaki "Şu An Okuduğum Kitap" widget'ı için: kullanıcının
// durum:'okunuyor' olan tek kitabını (varsa) getirir. Birden fazla kitap aynı anda
// "okunuyor" işaretlenmişse en son eklenen döner (pratikte nadir bir durum).
export async function suankiOkunanKitabiGetir(uid) {
  if (!uid) return null
  const q = query(
    collection(db, 'izlenecekler'),
    where('kullaniciId', '==', uid),
    where('tur', '==', 'kitap'),
    where('durum', '==', 'okunuyor'),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

// Anasayfa'daki "Kitap Dünyası" widget'ı için: TÜM topluluğun şu an okuduğu
// kitapları getirir (herkese görünür, kişisel değil). En son okumaya
// başlayanlar önce gelir.
export async function topluluktaSuankiOkunanlariGetir(limitSayisi = 6) {
  const q = query(
    collection(db, 'izlenecekler'),
    where('tur', '==', 'kitap'),
    where('durum', '==', 'okunuyor'),
    orderBy('eklemeTarihi', 'desc'),
    limit(limitSayisi)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

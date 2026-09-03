import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  endAt,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAt,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { gorunenAdGetir } from './gorunenAd.js'

function planRef(id) {
  return doc(db, 'geziPlanlari', id)
}

export async function geziPlaniOlustur(kullanici, profil, { baslik, baslangicTarihi, bitisTarihi }) {
  const belge = await addDoc(collection(db, 'geziPlanlari'), {
    sahipId: kullanici.uid,
    sahipAdi: gorunenAdGetir(profil, kullanici.displayName),
    sahipAvatarUrl: profil?.avatarUrl || '',
    ortakDuzenleyenler: [],
    ortakDuzenleyenlerBilgi: {},
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

// Sahip olduğun VEYA ortak düzenleyeni olduğun tüm planlar — Firestore tek
// sorguda iki farklı alana göre OR yapamadığı için iki ayrı sorgu atılıp
// sonuçlar birleştiriliyor (küçük bir kişisel koleksiyon için sorun değil).
export async function geziPlanlariniGetir(uid) {
  const [sahipSnap, ortakSnap] = await Promise.all([
    getDocs(query(collection(db, 'geziPlanlari'), where('sahipId', '==', uid))),
    getDocs(query(collection(db, 'geziPlanlari'), where('ortakDuzenleyenler', 'array-contains', uid))),
  ])
  const map = new Map()
  ;[...sahipSnap.docs, ...ortakSnap.docs].forEach((d) => map.set(d.id, { id: d.id, ...d.data() }))
  const liste = [...map.values()]
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

// --- Paylaşım / ortak düzenleme -----------------------------------------

// Kullanıcı adına göre (baştan eşleşen) arama — plana ortak düzenleyen
// eklerken kullanılıyor. Kullanicilar.jsx'teki keşfet aramasıyla aynı desen.
// Önceden SADECE kullaniciAdi alanının BAŞLANGICINI (prefix) eşleştiriyordu
// — kişinin gerçek adını soyadını yazan biri (ki insanların doğal
// içgüdüsü bu, kullanıcı adını ezbere bilmek değil) hiçbir sonuç
// alamıyordu. Site küçük, davetle büyüyen bir topluluk olduğu için (binlerce
// değil, onlarca/yüzlerce kullanıcı) tüm kullanıcıları çekip istemci
// tarafında hem adSoyad HEM kullaniciAdi üzerinde, büyük/küçük harf
// duyarsız bir "içeriyor" (prefix değil) araması yapmak çok daha
// kullanışlı ve hâlâ performanslı.
export async function kullaniciAraKullaniciAdiIle(terim) {
  const temizTerim = terim.trim().toLocaleLowerCase('tr-TR')
  if (!temizTerim) return []
  const snap = await getDocs(query(collection(db, 'kullanicilar'), limit(500)))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter(
      (k) =>
        k.kullaniciAdi?.toLocaleLowerCase('tr-TR').includes(temizTerim) ||
        k.adSoyad?.toLocaleLowerCase('tr-TR').includes(temizTerim)
    )
    .slice(0, 8)
}

export async function planaOrtakDuzenleyenEkle(planId, eklenecekKullanici) {
  await updateDoc(planRef(planId), {
    ortakDuzenleyenler: arrayUnion(eklenecekKullanici.id),
    [`ortakDuzenleyenlerBilgi.${eklenecekKullanici.id}`]: {
      adSoyad: gorunenAdGetir(eklenecekKullanici, 'İsimsiz'),
      avatarUrl: eklenecekKullanici.avatarUrl || '',
    },
  })
}

export async function plandanOrtakDuzenleyenCikar(planId, uid) {
  await updateDoc(planRef(planId), {
    ortakDuzenleyenler: arrayRemove(uid),
  })
}

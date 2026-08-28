import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import { gorunenAdGetir } from './gorunenAd.js'
import { kitabinSahipleriniBul } from './raf.js'

export async function kitapIstegiOlustur(kullanici, profil, { disId, baslik, alt, posterUrl, not: notMetni }) {
  const ref = await addDoc(collection(db, 'kitapIstekleri'), {
    isteyenId: kullanici.uid,
    isteyenAdi: gorunenAdGetir(profil, kullanici.displayName),
    isteyenSehir: profil?.sehir || '',
    disId,
    baslik,
    alt: alt || '',
    posterUrl: posterUrl || '',
    not: notMetni || '',
    durum: 'acik',
    olusturmaTarihi: serverTimestamp(),
  })
  return ref.id
}

export async function kitapIstekleriGetir() {
  const q = query(collection(db, 'kitapIstekleri'), orderBy('olusturmaTarihi', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function kitapIstegiKapat(id) {
  await updateDoc(doc(db, 'kitapIstekleri', id), { durum: 'kapandi' })
}

// v2 — ödünç verme akışı. Durum: 'acik' → 'oduncte' → 'tamamlandi'.
export async function kitapOduncVer(istekId, kullanici, profil, iadeTarihiISO) {
  await updateDoc(doc(db, 'kitapIstekleri', istekId), {
    durum: 'oduncte',
    oduncVerenId: kullanici.uid,
    oduncVerenAdi: gorunenAdGetir(profil, kullanici.displayName),
    iadeTarihi: iadeTarihiISO,
    oduncVerildigiTarihi: serverTimestamp(),
    iadeHatirlatmaGonderildi: false,
  })
}

export async function kitapIadeEdildi(istekId) {
  await updateDoc(doc(db, 'kitapIstekleri', istekId), { durum: 'tamamlandi' })
}

// v3 — Profil > Ödünç Kitaplar sekmesi ve itibar sayısı için.
export async function oduncVerdiklerimiGetir(uid) {
  const q = query(collection(db, 'kitapIstekleri'), where('oduncVerenId', '==', uid))
  const snap = await getDocs(q)
  const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  liste.sort((a, b) => (b.oduncVerildigiTarihi?.toMillis?.() || 0) - (a.oduncVerildigiTarihi?.toMillis?.() || 0))
  return liste
}

export async function oduncAldiklarimiGetir(uid) {
  const q = query(collection(db, 'kitapIstekleri'), where('isteyenId', '==', uid))
  const snap = await getDocs(q)
  const liste = snap.docs.filter((d) => d.data().durum !== 'acik').map((d) => ({ id: d.id, ...d.data() }))
  liste.sort((a, b) => (b.oduncVerildigiTarihi?.toMillis?.() || 0) - (a.oduncVerildigiTarihi?.toMillis?.() || 0))
  return liste
}

// Basit bir güven göstergesi — kaç kez ödünç verdiği (durumdan bağımsız,
// ödünç vermeyi kabul etmiş olması zaten anlamlı).
export async function itibarSayisiGetir(uid) {
  const q = query(collection(db, 'kitapIstekleri'), where('oduncVerenId', '==', uid))
  const snap = await getDocs(q)
  return snap.size
}

export async function kitapIstegiSil(id) {
  await deleteDoc(doc(db, 'kitapIstekleri', id))
}

// Bir istek kartında "X kişi bu kitaba sahip" göstermek için — kitabinSahipleriniBul'u
// (raf.js) doğrudan yeniden kullanıyor, ayrı bir mekanizma yok.
export { kitabinSahipleriniBul }

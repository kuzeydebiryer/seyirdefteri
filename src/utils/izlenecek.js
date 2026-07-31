import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
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

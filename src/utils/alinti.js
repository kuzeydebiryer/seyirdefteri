// Alıntı Duvarı — bir kitaptan beğenilen bir alıntıyı paylaşma özelliği.
// Üst seviye `alintilar` koleksiyonu: hem kitap sayfasında ("bu kitaptan
// alıntılar") hem de genel bir "Alıntı Duvarı" akışında (tüm kitaplardan
// son alıntılar) kullanılabilsin diye topluluğun geri kalanıyla aynı desende
// (bkz. tavsiyeler, haberler) üst seviyede tutuluyor.

import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDocs, limit, orderBy, query, updateDoc, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'
import { gorunenAdGetir } from './gorunenAd.js'

export async function alintiEkle(kullanici, profil, { kitapId, kitapBaslik, kitapYazar, kitapPosterUrl, metin, sayfa }) {
  await addDoc(collection(db, 'alintilar'), {
    kullaniciId: kullanici.uid,
    kullaniciAdi: gorunenAdGetir(profil, kullanici.displayName),
    kullaniciKullaniciAdi: profil?.kullaniciAdi || '',
    kullaniciAvatarUrl: profil?.avatarUrl || '',
    kitapId,
    kitapBaslik: kitapBaslik || '',
    kitapYazar: kitapYazar || '',
    kitapPosterUrl: kitapPosterUrl || '',
    metin: metin.trim(),
    sayfa: sayfa ? Number(sayfa) : null,
    begenenler: [],
    tarih: serverTimestamp(),
  })
}

export async function alintiSil(id) {
  await deleteDoc(doc(db, 'alintilar', id))
}

export async function alintiBegenDegistir(id, uid, begeniyorMu) {
  await updateDoc(doc(db, 'alintilar', id), {
    begenenler: begeniyorMu ? arrayRemove(uid) : arrayUnion(uid),
  })
}

// Bir kitaba ait tüm alıntıları getirir (kitap sayfası için).
export async function kitapAlintilariGetir(kitapId) {
  const q = query(collection(db, 'alintilar'), where('kitapId', '==', kitapId), orderBy('tarih', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Topluluk genelinde en son paylaşılan alıntılar (Alıntı Duvarı sayfası için).
export async function sonAlintilariGetir(limitSayisi = 30) {
  const q = query(collection(db, 'alintilar'), orderBy('tarih', 'desc'), limit(limitSayisi))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

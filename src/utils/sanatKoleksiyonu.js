// Sanat Koleksiyonum — Sanat Eserleri Keşfet'te (Met/AIC) beğenilen bir eseri
// kişisel bir "koleksiyona" kaydetme. Doküman ID'si `${uid}_${eserId}` —
// bir kullanıcı aynı eseri iki kez kaydedemez, tekrar tıklamak kaldırır.

import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function eseriKoleksiyonaEkle(kullanici, eser) {
  await setDoc(doc(db, 'sanatKoleksiyonu', `${kullanici.uid}_${eser.id}`), {
    kullaniciId: kullanici.uid,
    eserId: eser.id,
    title: eser.title || '',
    artistDisplayName: eser.artistDisplayName || '',
    objectDate: eser.objectDate || '',
    imageUrl: eser.imageUrl,
    sourceUrl: eser.sourceUrl,
    kaynakAdi: eser.kaynakAdi,
    eklemeTarihi: serverTimestamp(),
  })
}

export async function eseriKoleksiyondanCikar(uid, eserId) {
  await deleteDoc(doc(db, 'sanatKoleksiyonu', `${uid}_${eserId}`))
}

// Bir kullanıcının koleksiyonundaki eser ID'lerini getirir (Set) — Sanat
// Eserleri Keşfet'te hangi kartların "kaydedildi" işaretli görüneceğini
// bilmek için, tek tek her eser için sorgu atmadan bir kerede çekiyoruz.
export async function kullaniciKoleksiyonEserIdleriGetir(uid) {
  const snap = await getDocs(query(collection(db, 'sanatKoleksiyonu'), where('kullaniciId', '==', uid)))
  return new Set(snap.docs.map((d) => d.data().eserId))
}

// Profil sayfasındaki "Sanat Koleksiyonum" duvarı için — en son eklenenden eskiye.
export async function kullaniciKoleksiyonuGetir(uid) {
  const q = query(collection(db, 'sanatKoleksiyonu'), where('kullaniciId', '==', uid), orderBy('eklemeTarihi', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function tavsiyeEkle({ tur, disId, baslik, alt, posterUrl, not: notMetni, kullanici, koleksiyon = 'tavsiyeler' }) {
  await addDoc(collection(db, koleksiyon), {
    tur, // 'sinema' | 'dizi' | 'kitap'
    disId: tur === 'kitap' ? disId : Number(disId),
    baslik,
    alt: alt || '',
    posterUrl: posterUrl || '',
    not: notMetni || '',
    ekleyenId: kullanici.uid,
    ekleyenAdi: kullanici.displayName || 'İsimsiz',
    tarih: serverTimestamp(),
  })
}

export async function tavsiyeGuncelle(tavsiyeId, { posterUrl }, koleksiyon = 'tavsiyeler') {
  await updateDoc(doc(db, koleksiyon, tavsiyeId), { posterUrl })
}

export async function tavsiyeSil(tavsiyeId, koleksiyon = 'tavsiyeler') {
  await deleteDoc(doc(db, koleksiyon, tavsiyeId))
}

// Kendiliğinden onarım: bir eser tavsiye edildiğinde kapak henüz yoksa
// tavsiye kaydı posterUrl:'' ile kalıyordu. Eser sonradan (Bilgiyi Düzenle
// ile) güncellenip kapak eklenince, bu ESKİ tavsiye kayıtları kendiliğinden
// güncellenmiyordu — ayrı belgeler. Bu fonksiyon eser düzenlendiğinde
// çağrılıp, o esere ait posterUrl'siz tavsiyeleri geriye dönük doldurur.
// (Sadece kaydı ekleyen kişi güncelleyebildiği için — Firestore kuralı — bazı
// eski kayıtlar başka bir üyeye ait olduğunda sessizce atlanır.)
export async function tavsiyePosterleriniSenkronizeEt(tur, disId, posterUrl, koleksiyon = 'tavsiyeler') {
  if (!posterUrl) return
  const q = query(collection(db, koleksiyon), where('tur', '==', tur), where('disId', '==', disId))
  const snap = await getDocs(q)
  await Promise.all(
    snap.docs.filter((d) => !d.data().posterUrl).map((d) => updateDoc(doc(db, koleksiyon, d.id), { posterUrl }).catch(() => {}))
  )
}

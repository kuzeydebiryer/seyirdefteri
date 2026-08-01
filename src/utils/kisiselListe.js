// Kişisel Listeler — Letterboxd/Goodreads tarzı, kişiye ait, sıralı, kapak
// gridli listeler. Topluluklardaki "ortak izleme/etkinlik" listelerinden
// KASITLI olarak ayrı tutuldu (o listelerde etkinlik tarihi + üye puanlaması
// var, bu ise sade bir küratörlük/koleksiyon aracı).
//
// Şema:
//   kisiselListeler/{listeId}        — { kullaniciId, baslik, aciklama, herkeseAcik, kapakUrl, ogeSayisi, olusturmaTarihi }
//   kisiselListeOgeleri/{ogeId}      — { listeId, tur, disId, baslik, alt, posterUrl, sira, eklemeTarihi }

import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function listeOlustur(kullanici, { baslik, aciklama, herkeseAcik }) {
  const ref = await addDoc(collection(db, 'kisiselListeler'), {
    kullaniciId: kullanici.uid,
    baslik,
    aciklama: aciklama || '',
    herkeseAcik: herkeseAcik !== false,
    kapakUrl: '',
    ogeSayisi: 0,
    olusturmaTarihi: serverTimestamp(),
  })
  return ref.id
}

export async function listeSil(listeId) {
  const ogelerSnap = await getDocs(query(collection(db, 'kisiselListeOgeleri'), where('listeId', '==', listeId)))
  await Promise.all(ogelerSnap.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'kisiselListeler', listeId))
}

export async function listeGetir(listeId) {
  const snap = await getDoc(doc(db, 'kisiselListeler', listeId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function kullaniciListeleriGetir(uid) {
  const q = query(collection(db, 'kisiselListeler'), where('kullaniciId', '==', uid), orderBy('olusturmaTarihi', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function listeOgeleriGetir(listeId) {
  const q = query(collection(db, 'kisiselListeOgeleri'), where('listeId', '==', listeId), orderBy('sira', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Tek bir eser ekler; sıra numarasını otomatik olarak (mevcut öğe sayısı) atar.
// Kapak görseli boşsa (listenin ilk öğesiyse) listenin kapağı olarak da kaydedilir.
export async function ogeEkle(liste, oge) {
  await addDoc(collection(db, 'kisiselListeOgeleri'), {
    listeId: liste.id,
    tur: oge.tur,
    disId: oge.disId,
    baslik: oge.baslik,
    alt: oge.alt || '',
    posterUrl: oge.posterUrl || '',
    sira: liste.ogeSayisi || 0,
    eklemeTarihi: serverTimestamp(),
  })
  await updateDoc(doc(db, 'kisiselListeler', liste.id), {
    ogeSayisi: increment(1),
    ...(liste.ogeSayisi === 0 && oge.posterUrl ? { kapakUrl: oge.posterUrl } : {}),
  })
}

// Letterboxd CSV içe aktarımı gibi TOPLU eklemeler için: her satırı sırayla
// yazar (Firestore'da tek seferde binlerce satır atmak yerine, ilerleme
// göstermek isteyen çağıran taraf için bir dizi olarak veriliyor, bkz.
// LetterboxdIceAktar.jsx — orada satır satır ilerleme çubuğuyla birlikte
// bu ogeEkle fonksiyonu tek tek çağrılıyor).
export async function ogeSil(ogeId) {
  await deleteDoc(doc(db, 'kisiselListeOgeleri', ogeId))
}

export async function listeGuncelle(listeId, alanlar) {
  await updateDoc(doc(db, 'kisiselListeler', listeId), alanlar)
}

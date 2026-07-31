import { addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

// Yönetmenler, TMDB'nin genel "kişi" kavramından farklı olarak üyelerin elle
// seçip eklediği küratörlü bir liste. Doküman ID'si TMDB kişi ID'si — bu sayede
// aynı yönetmen iki kez eklenemiyor (setDoc ile üzerine yazılıyor, zarar vermiyor).
export async function yonetmenEkle(tmdbId, { ad, fotoUrl, kullanici }) {
  await setDoc(doc(db, 'yonetmenler', String(tmdbId)), {
    tmdbId: Number(tmdbId),
    ad,
    fotoUrl: fotoUrl || '',
    ekleyenId: kullanici.uid,
    ekleyenAdi: kullanici.displayName || 'İsimsiz',
    eklemeTarihi: serverTimestamp(),
  })
}

export async function yonetmenSil(tmdbId) {
  await deleteDoc(doc(db, 'yonetmenler', String(tmdbId)))
}

export async function ilgiliKitapEkle(yonetmenTmdbId, { googleBooksId, baslik, yazar, posterUrl, kullanici }) {
  await addDoc(collection(db, 'yonetmenler', String(yonetmenTmdbId), 'ilgiliKitaplar'), {
    googleBooksId,
    baslik,
    yazar: yazar || '',
    posterUrl: posterUrl || '',
    ekleyenId: kullanici.uid,
    eklemeTarihi: serverTimestamp(),
  })
}

export async function ilgiliKitapSil(yonetmenTmdbId, kitapId) {
  await deleteDoc(doc(db, 'yonetmenler', String(yonetmenTmdbId), 'ilgiliKitaplar', kitapId))
}

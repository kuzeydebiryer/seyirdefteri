import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
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

// Sayfa birleşmesinden (bkz. KisiSayfasi.jsx) önce, "İlgili Kitaplar" özelliği
// sadece Yönetmen sayfasında vardı ve bu alt koleksiyonu kullanıyordu. Artık
// yeni eklemeler genel "ilgiliEser" sistemine gidiyor, ama eskiden burada
// eklenmiş veriyi kaybetmemek için KisiSayfasi bunu da okuyup birleştiriyor.
export async function ilgiliKitaplarGetir(yonetmenTmdbId) {
  const q = query(collection(db, 'yonetmenler', String(yonetmenTmdbId), 'ilgiliKitaplar'), orderBy('eklemeTarihi', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

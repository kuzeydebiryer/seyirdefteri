import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// filmMuzigiBegeni.js ile aynı desen — ama KASITLI OLARAK ayrı bir koleksiyon
// (begenilenDiziMuzikleri) kullanıyor. Sebep: TMDB'de film ve dizi ID
// uzayları birbirinden bağımsız — aynı sayısal id hem bir filme hem bir
// diziye ait olabilir. Aynı koleksiyonu paylaşsaydık `${uid}_${tmdbId}`
// doküman id'si çakışıp bir filmin beğenisi bir dizininkinin üzerine
// yazabilirdi.
function begeniId(uid, tmdbId) {
  return `${uid}_${tmdbId}`
}

export async function diziMuzikBegeniliMi(uid, tmdbId) {
  if (!uid) return false
  const snap = await getDoc(doc(db, 'begenilenDiziMuzikleri', begeniId(uid, tmdbId)))
  return snap.exists()
}

export async function diziMuzikBegen(uid, { kullaniciAdi, tmdbId, diziBaslik, diziYil, posterUrl, spotifyAlbumId }) {
  await setDoc(doc(db, 'begenilenDiziMuzikleri', begeniId(uid, tmdbId)), {
    kullaniciId: uid,
    kullaniciAdi: kullaniciAdi || '',
    tmdbId,
    diziBaslik,
    diziYil: diziYil || '',
    posterUrl: posterUrl || '',
    spotifyAlbumId,
    eklemeTarihi: serverTimestamp(),
  })
}

export async function diziMuzikBegeniKaldir(uid, tmdbId) {
  await deleteDoc(doc(db, 'begenilenDiziMuzikleri', begeniId(uid, tmdbId)))
}

export async function begenilenDiziMuzikleriGetir(uid) {
  const q = query(collection(db, 'begenilenDiziMuzikleri'), where('kullaniciId', '==', uid), orderBy('eklemeTarihi', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Diziler sayfasındaki "Beğenilen Dizi Müzikleri" widget'ı için.
export async function sonBegenilenDiziMuzikleriGetir(limitSayisi = 15) {
  const q = query(collection(db, 'begenilenDiziMuzikleri'), orderBy('eklemeTarihi', 'desc'), limit(limitSayisi))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

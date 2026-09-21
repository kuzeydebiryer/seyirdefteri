import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../firebase.js'

function begeniId(uid, tmdbId) {
  return `${uid}_${tmdbId}`
}

export async function muzikBegeniliMi(uid, tmdbId) {
  if (!uid) return false
  const snap = await getDoc(doc(db, 'begenilenMuzikler', begeniId(uid, tmdbId)))
  return snap.exists()
}

export async function muzikBegen(uid, { kullaniciAdi, tmdbId, filmBaslik, filmYil, posterUrl, spotifyAlbumId }) {
  await setDoc(doc(db, 'begenilenMuzikler', begeniId(uid, tmdbId)), {
    kullaniciId: uid,
    kullaniciAdi: kullaniciAdi || '',
    tmdbId,
    filmBaslik,
    filmYil: filmYil || '',
    posterUrl: posterUrl || '',
    spotifyAlbumId,
    eklemeTarihi: serverTimestamp(),
  })
}

export async function muzikBegeniKaldir(uid, tmdbId) {
  await deleteDoc(doc(db, 'begenilenMuzikler', begeniId(uid, tmdbId)))
}

// Bir kullanıcının beğendiği tüm film müzikleri — Profil sayfasındaki
// "🎵 Film Müzikleri" sekmesi için.
export async function begenilenMuzikleriGetir(uid) {
  const q = query(collection(db, 'begenilenMuzikler'), where('kullaniciId', '==', uid), orderBy('eklemeTarihi', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Herkesin en son beğendiği film müzikleri — anasayfa widget'ı için.
export async function sonBegenilenMuzikleriGetir(limitSayisi = 15) {
  const q = query(collection(db, 'begenilenMuzikler'), orderBy('eklemeTarihi', 'desc'), limit(limitSayisi))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

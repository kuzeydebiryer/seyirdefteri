import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// Önceden sinemaAltTurleri.js'de sabit kodlanmıştı (sadece Korku Sineması,
// 4 alt tür). Yeni tür eklemek her seferinde kod değişikliği + deploy
// gerektiriyordu. Artık Firestore'da — yönetici, TMDB'de canlı doğrulama
// yaptıktan sonra kod değişikliği olmadan yeni tür/alt tür ekleyebiliyor
// (bkz. SinemaTuruEkleFormu.jsx).

export async function anaTurleriGetir() {
  const snap = await getDocs(query(collection(db, 'sinemaTurleri'), orderBy('sira', 'asc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function anaTurGetir(anaTurId) {
  const turler = await anaTurleriGetir()
  return turler.find((t) => t.id === anaTurId) || null
}

export async function anaTurEkle(kullanici, { ad, ikon, tmdbFilmTurId, tmdbDiziTurId }) {
  const mevcutSayisi = (await anaTurleriGetir()).length
  const belge = await addDoc(collection(db, 'sinemaTurleri'), {
    ad,
    ikon,
    tmdbFilmTurId: tmdbFilmTurId || null,
    tmdbDiziTurId: tmdbDiziTurId || null,
    sira: mevcutSayisi,
    ekleyenId: kullanici.uid,
    tarih: serverTimestamp(),
  })
  return belge.id
}

export async function altTurleriGetir(anaTurId) {
  const snap = await getDocs(query(collection(db, 'sinemaAltTurleri'), where('anaTurId', '==', anaTurId), orderBy('sira', 'asc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Film/dizi sayfasındaki "bu eser hangi alt türlere ait" rozetleri için —
// TÜM alt türleri (hangi ana türe ait olduklarıyla birlikte) tek seferde
// çekiyor. Veri seti küçük (küratörlü alt türler, kullanıcı üretimi
// binlerce kayıt değil) olduğu için sayfalamaya gerek yok.
export async function tumAltTurleriGetir() {
  const [altTurSnap, anaTurler] = await Promise.all([getDocs(collection(db, 'sinemaAltTurleri')), anaTurleriGetir()])
  const anaTurHaritasi = Object.fromEntries(anaTurler.map((a) => [a.id, a]))
  return altTurSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .map((altTur) => ({ ...altTur, anaTur: anaTurHaritasi[altTur.anaTurId] }))
    .filter((altTur) => altTur.anaTur) // ana türü silinmiş yetim bir alt tür varsa göstermeyelim
}

// anahtarKelimeler: [{ id, ad }] — TMDB'deki gerçek anahtar kelime ID'si VE
// okunabilir adı birlikte saklanıyor (yönetim ekranında "hangi kelimeleri
// seçmiştim" diye tekrar TMDB'ye sormaya gerek kalmasın diye).
export async function altTurEkle(kullanici, { anaTurId, ad, ikon, anahtarKelimeler }) {
  const mevcutSayisi = (await altTurleriGetir(anaTurId)).length
  await addDoc(collection(db, 'sinemaAltTurleri'), {
    anaTurId,
    ad,
    ikon,
    anahtarKelimeler,
    sira: mevcutSayisi,
    ekleyenId: kullanici.uid,
    tarih: serverTimestamp(),
  })
}

export async function altTurSil(altTurId) {
  await deleteDoc(doc(db, 'sinemaAltTurleri', altTurId))
}

export async function anaTurSil(anaTurId) {
  await deleteDoc(doc(db, 'sinemaTurleri', anaTurId))
}

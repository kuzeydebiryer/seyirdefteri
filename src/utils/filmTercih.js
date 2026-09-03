import { doc, getDocs, collection, increment, orderBy, query, limit, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'

// "O mu Bu mu" oyunu — iki filmden birini seçtirip, TOPLULUĞUN tercihlerini
// biriktiriyor. Ham oyları (kim, ne zaman, hangisini seçti) tutmuyoruz —
// sadece her filmin toplam kazanma/kaybetme sayacını, atomik increment ile.
// Bu hem daha az veri hem de "en çok tercih edilen filmler" gibi bir
// istatistiği tek bir sıralı sorguyla (agregasyon yapmadan) almayı sağlıyor.
export async function oyKullan(kazananFilm, kaybedenFilm) {
  await Promise.all([
    setDoc(
      doc(db, 'filmTercihPuanlari', String(kazananFilm.id)),
      { baslik: kazananFilm.baslik, posterUrl: kazananFilm.posterUrl || '', kazanma: increment(1), sonGuncelleme: serverTimestamp() },
      { merge: true }
    ),
    setDoc(
      doc(db, 'filmTercihPuanlari', String(kaybedenFilm.id)),
      { baslik: kaybedenFilm.baslik, posterUrl: kaybedenFilm.posterUrl || '', kaybetme: increment(1), sonGuncelleme: serverTimestamp() },
      { merge: true }
    ),
  ])
}

export async function enCokTercihEdilenleriGetir(limitSayisi = 20) {
  const snap = await getDocs(query(collection(db, 'filmTercihPuanlari'), orderBy('kazanma', 'desc'), limit(limitSayisi)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

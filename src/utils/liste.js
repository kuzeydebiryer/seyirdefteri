import { addDoc, collection, doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function listeOlustur(topluluklId, { baslik, aciklama, kullanici }) {
  const ref = await addDoc(collection(db, 'topluluklar', topluluklId, 'listeler'), {
    baslik,
    aciklama,
    olusturanId: kullanici.uid,
    olusturanAdi: kullanici.displayName || 'İsimsiz',
    olusturmaTarihi: serverTimestamp(),
    ogeSayisi: 0,
  })
  return ref.id
}

export async function ogeEkle(topluluklId, listeId, oge) {
  await addDoc(collection(db, 'topluluklar', topluluklId, 'listeler', listeId, 'ogeler'), {
    ...oge,
    topluluklId,
    listeId,
    eklemeTarihi: serverTimestamp(),
    puanlar: {},
  })
  await updateDoc(doc(db, 'topluluklar', topluluklId, 'listeler', listeId), { ogeSayisi: increment(1) })
}

// puanlar bir map olarak tutuluyor ({uid: puan}) — bu sayede bir üye puanını
// güncellediğinde eskisini aramaya/silmeye gerek kalmadan doğrudan üzerine yazılıyor.
export async function ogePuanla(topluluklId, listeId, ogeId, uid, puan) {
  await updateDoc(doc(db, 'topluluklar', topluluklId, 'listeler', listeId, 'ogeler', ogeId), {
    [`puanlar.${uid}`]: puan,
  })
}

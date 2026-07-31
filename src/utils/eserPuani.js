import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

// Bir esere (günce yazmadan) doğrudan verilen puan. Doküman ID'si
// `${tur}_${disId}_${uid}` olarak sabit — bir kullanıcı bir esere tek puan verebiliyor,
// tekrar puanladığında üzerine yazılıyor.
export async function eserPuanla(tur, disId, puan, kullanici) {
  const id = `${tur}_${disId}_${kullanici.uid}`
  await setDoc(doc(db, 'eserPuanlari', id), {
    tur,
    disId: tur === 'kitap' ? disId : Number(disId),
    kullaniciId: kullanici.uid,
    puan,
    tarih: serverTimestamp(),
  })
}

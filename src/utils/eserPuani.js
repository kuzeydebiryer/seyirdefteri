import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

// Bir esere (günce yazmadan) doğrudan verilen puan. Doküman ID'si
// `${tur}_${disId}_${uid}` olarak sabit — bir kullanıcı bir esere tek puan verebiliyor,
// tekrar puanladığında üzerine yazılıyor. Başlık/poster de kaydediliyor ki profildeki
// "İzlediklerim/Okuduklarım" bunları ekstra bir TMDB/Google Books isteği yapmadan gösterebilsin.
export async function eserPuanla(tur, disId, puan, kullanici, { baslik, alt, posterUrl, yil, turler } = {}) {
  const id = `${tur}_${disId}_${kullanici.uid}`
  await setDoc(
    doc(db, 'eserPuanlari', id),
    {
      tur,
      disId: tur === 'kitap' ? disId : Number(disId),
      kullaniciId: kullanici.uid,
      puan,
      baslik: baslik || '',
      alt: alt || '',
      yil: yil || '',
      turler: turler || '',
      posterUrl: posterUrl || '',
      tarih: serverTimestamp(),
    },
    { merge: true }
  )
}

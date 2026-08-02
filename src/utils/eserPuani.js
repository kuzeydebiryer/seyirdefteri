import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { eserIstatistikGuncelle } from './eserIstatistik.js'

// Bir esere (günce yazmadan) doğrudan verilen puan. Doküman ID'si
// `${tur}_${disId}_${uid}` olarak sabit — bir kullanıcı bir esere tek puan verebiliyor,
// tekrar puanladığında üzerine yazılıyor. Başlık/poster de kaydediliyor ki profildeki
// "İzlediklerim/Okuduklarım" bunları ekstra bir TMDB/Google Books isteği yapmadan gösterebilsin.
export async function eserPuanla(tur, disId, puan, kullanici, { baslik, alt, posterUrl, yil, turler } = {}) {
  const disIdNormal = tur === 'kitap' ? disId : Number(disId)
  const id = `${tur}_${disIdNormal}_${kullanici.uid}`
  const ref = doc(db, 'eserPuanlari', id)

  // Özet kaydını (eserIstatistikleri) doğru güncelleyebilmek için, aynı kullanıcı
  // bu esere daha önce puan verdiyse eski puanı öğrenmemiz gerekiyor (fark kadar
  // güncellemek için) — aksi hâlde her yeniden puanlamada sayaç yanlışlıkla artardı.
  const oncekiSnap = await getDoc(ref)
  const eskiPuan = oncekiSnap.exists() ? oncekiSnap.data().puan : null

  await setDoc(
    ref,
    {
      tur,
      disId: disIdNormal,
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

  await eserIstatistikGuncelle(tur, disIdNormal, { baslik, alt, posterUrl, yil }, puan, eskiPuan)
}

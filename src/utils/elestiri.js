import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { gorunenAdGetir } from './gorunenAd.js'

// Film inceleme etkinliklerindeki "Eleştirmenler" bölümü: etkinliği izleyen her
// üye filme bir yıldız puanı + tek cümlelik (en fazla 12 kelime) bir "vurucu
// yorum" bırakıyor. Kayıt gelecekEtkinlikler/{etkinlikId}/elestiriler altında,
// belge ID'si = kullanıcının uid'si — böylece bir üyenin bir etkinlikte en
// fazla BİR eleştirisi olur, tekrar kaydedince üzerine yazılır (düzenleme).
export const ELESTIRI_KELIME_SINIRI = 12

export function kelimeSay(metin) {
  return (metin || '').trim().split(/\s+/).filter(Boolean).length
}

export async function elestirileriGetir(etkinlikId) {
  const snap = await getDocs(collection(db, 'gelecekEtkinlikler', etkinlikId, 'elestiriler'))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.tarih?.seconds || 0) - (b.tarih?.seconds || 0))
}

export async function elestiriKaydet(etkinlikId, { kullanici, profil, puan, cumle }) {
  const temizCumle = cumle.trim()
  if (kelimeSay(temizCumle) > ELESTIRI_KELIME_SINIRI) {
    throw new Error(`Cümle en fazla ${ELESTIRI_KELIME_SINIRI} kelime olabilir.`)
  }
  await setDoc(doc(db, 'gelecekEtkinlikler', etkinlikId, 'elestiriler', kullanici.uid), {
    kullaniciId: kullanici.uid,
    kullaniciAdi: gorunenAdGetir(profil, kullanici.displayName),
    kullaniciAdiKisa: profil?.kullaniciAdi || '',
    avatarUrl: profil?.avatarUrl || '',
    puan,
    cumle: temizCumle,
    tarih: serverTimestamp(),
  })
}

export async function elestiriSil(etkinlikId, uid) {
  await deleteDoc(doc(db, 'gelecekEtkinlikler', etkinlikId, 'elestiriler', uid))
}

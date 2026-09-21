// Sohbet — Oscar sezonu ya da Festival sezonu gibi belirli bir "konum"a bağlı,
// hafif bir mesajlaşma alanı. Sayfanın tamamını kaplamaması için bilerek
// daraltılabilir bir panel olarak tasarlandı (bkz. SohbetPaneli.jsx) ve canlı
// dinleme SADECE panel açıkken başlıyor — kapalıyken hiçbir Firestore
// dinleyicisi çalışmıyor, gereksiz okuma maliyeti oluşmuyor.

import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import { gorunenAdGetir } from './gorunenAd.js'

const SON_MESAJ_SAYISI = 50

export async function mesajGonder(konumId, kullanici, profil, mesaj) {
  if (!mesaj.trim()) return
  await addDoc(collection(db, 'sohbetMesajlari'), {
    konumId,
    kullaniciId: kullanici.uid,
    kullaniciAdi: gorunenAdGetir(profil, kullanici.displayName),
    mesaj: mesaj.trim().slice(0, 500),
    tarih: serverTimestamp(),
  })
}

// Sadece panel açıkken çağrılmalı — dönen fonksiyon aboneliği iptal eder,
// panel kapandığında/bileşen kaldırıldığında mutlaka çağrılmalı.
export function mesajlariDinle(konumId, callback) {
  const q = query(collection(db, 'sohbetMesajlari'), where('konumId', '==', konumId), orderBy('tarih', 'desc'), limit(SON_MESAJ_SAYISI))
  return onSnapshot(q, (snap) => {
    const mesajlar = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse()
    callback(mesajlar)
  })
}

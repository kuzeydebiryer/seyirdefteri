import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// Bir kişiye (yönetmen/oyuncu) verilen puan+yorum. Doküman ID'si `${kisiTmdbId}_${uid}`
// olarak sabitlenmiş — bu sayede bir kullanıcının aynı kişiye birden fazla
// değerlendirme bırakması engelleniyor (yeni puan verince eskisinin üzerine yazılıyor).
export async function kisiDegerlendir(kisiTmdbId, { puan, yorum, kullanici }) {
  const id = `${kisiTmdbId}_${kullanici.uid}`
  await setDoc(doc(db, 'kisiDegerlendirmeleri', id), {
    kisiTmdbId: Number(kisiTmdbId),
    kullaniciId: kullanici.uid,
    kullaniciAdi: kullanici.displayName || 'İsimsiz',
    puan,
    yorum: yorum || '',
    tarih: serverTimestamp(),
  })
}

export async function kisiDegerlendirmeleriGetir(kisiTmdbId) {
  const q = query(collection(db, 'kisiDegerlendirmeleri'), where('kisiTmdbId', '==', Number(kisiTmdbId)))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

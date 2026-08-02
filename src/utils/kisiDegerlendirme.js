import { collection, doc, getDoc, getDocs, increment, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// Bir kişiye (yönetmen/oyuncu) verilen puan+yorum. Doküman ID'si `${kisiTmdbId}_${uid}`
// olarak sabitlenmiş — bu sayede bir kullanıcının aynı kişiye birden fazla
// değerlendirme bırakması engelleniyor (yeni puan verince eskisinin üzerine yazılıyor).
export async function kisiDegerlendir(kisiTmdbId, { puan, yorum, kisiAdi, kisiFotoUrl, kullanici }) {
  const id = `${kisiTmdbId}_${kullanici.uid}`
  const ref = doc(db, 'kisiDegerlendirmeleri', id)

  // kisiIstatistikleri özet kaydını doğru güncelleyebilmek için eski puanı öğren.
  const oncekiSnap = await getDoc(ref)
  const eskiPuan = oncekiSnap.exists() ? oncekiSnap.data().puan : null

  await setDoc(ref, {
    kisiTmdbId: Number(kisiTmdbId),
    kisiAdi: kisiAdi || '',
    kisiFotoUrl: kisiFotoUrl || '',
    kullaniciId: kullanici.uid,
    kullaniciAdi: kullanici.displayName || 'İsimsiz',
    puan,
    yorum: yorum || '',
    tarih: serverTimestamp(),
  })

  if (puan != null) {
    const fark = eskiPuan != null ? puan - eskiPuan : puan
    const sayacFarki = eskiPuan != null ? 0 : 1
    await setDoc(
      doc(db, 'kisiIstatistikleri', String(kisiTmdbId)),
      {
        kisiTmdbId: Number(kisiTmdbId),
        kisiAdi: kisiAdi || '',
        kisiFotoUrl: kisiFotoUrl || '',
        puanToplam: increment(fark),
        puanSayisi: increment(sayacFarki),
      },
      { merge: true }
    )
  }
}

export async function kisiDegerlendirmeleriGetir(kisiTmdbId) {
  const q = query(collection(db, 'kisiDegerlendirmeleri'), where('kisiTmdbId', '==', Number(kisiTmdbId)))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

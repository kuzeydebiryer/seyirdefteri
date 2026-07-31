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

// NOT: Liste öğeleri (bir listedeki her film/dizi/kitap) artık üst seviye
// "listeOgeleri" koleksiyonunda tutuluyor, topluluklar/{id}/listeler/{lid}/ogeler
// altında DEĞİL. Sebep: eser sayfasındaki "topluluk ortalaması" bu öğeleri TÜM
// topluluklar/listeler arasında araması gerekiyordu, bu da bir "collectionGroup"
// sorgusu ve elle oluşturulması gereken bir Firestore indeksi gerektiriyordu.
// Üst seviye + topluluklId/listeId alanlarıyla basit where() sorguları yeterli
// oluyor, hiçbir özel indeks gerekmiyor.
export async function ogeEkle(topluluklId, listeId, oge) {
  await addDoc(collection(db, 'listeOgeleri'), {
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
export async function ogePuanla(ogeId, uid, puan) {
  await updateDoc(doc(db, 'listeOgeleri', ogeId), {
    [`puanlar.${uid}`]: puan,
  })
}

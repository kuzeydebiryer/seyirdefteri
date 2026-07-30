import { addDoc, arrayRemove, arrayUnion, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function gelecekEtkinlikOlustur(topluluklId, { baslik, aciklama, tarih, kullanici }) {
  await addDoc(collection(db, 'topluluklar', topluluklId, 'gelecekEtkinlikler'), {
    baslik,
    aciklama,
    tarih,
    olusturanId: kullanici.uid,
    olusturanAdi: kullanici.displayName || 'İsimsiz',
    olusturmaTarihi: serverTimestamp(),
    katilacaklar: [],
  })
}

export async function katilacagimDegistir(topluluklId, etkinlikId, uid, suAnKatiliyorMu) {
  await updateDoc(doc(db, 'topluluklar', topluluklId, 'gelecekEtkinlikler', etkinlikId), {
    katilacaklar: suAnKatiliyorMu ? arrayRemove(uid) : arrayUnion(uid),
  })
}

export async function kaynakEkle(topluluklId, etkinlikId, { tur, baslik, url, kullanici }) {
  await addDoc(collection(db, 'topluluklar', topluluklId, 'gelecekEtkinlikler', etkinlikId, 'kaynaklar'), {
    tur,
    baslik,
    url,
    ekleyenId: kullanici.uid,
    ekleyenAdi: kullanici.displayName || 'İsimsiz',
    eklemeTarihi: serverTimestamp(),
  })
}

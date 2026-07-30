import { addDoc, arrayRemove, arrayUnion, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function gelecekEtkinlikOlustur(topluluklId, { baslik, aciklama, tarih, eser, topluluk, kullanici }) {
  await addDoc(collection(db, 'topluluklar', topluluklId, 'gelecekEtkinlikler'), {
    baslik,
    aciklama,
    tarih,
    ...(eser || {}),
    topluluklId,
    topluluklAd: topluluk?.ad || '',
    topluluklTur: topluluk?.tur || 'Genel',
    olusturanId: kullanici.uid,
    olusturanAdi: kullanici.displayName || 'İsimsiz',
    olusturmaTarihi: serverTimestamp(),
    katilacaklar: [],
  })
}

export async function gelecekEtkinlikGuncelle(topluluklId, etkinlikId, { baslik, aciklama, tarih, eser }) {
  await updateDoc(doc(db, 'topluluklar', topluluklId, 'gelecekEtkinlikler', etkinlikId), {
    baslik,
    aciklama,
    tarih,
    ...(eser || {}),
  })
}

export async function katilacagimDegistir(topluluklId, etkinlikId, uid, suAnKatiliyorMu) {
  await updateDoc(doc(db, 'topluluklar', topluluklId, 'gelecekEtkinlikler', etkinlikId), {
    katilacaklar: suAnKatiliyorMu ? arrayRemove(uid) : arrayUnion(uid),
  })
}

export async function kaynakEkle(topluluklId, etkinlikId, { tur, baslik, url, googleBooksId, yazar, posterUrl, kullanici }) {
  await addDoc(collection(db, 'topluluklar', topluluklId, 'gelecekEtkinlikler', etkinlikId, 'kaynaklar'), {
    tur,
    baslik,
    url: url || '',
    googleBooksId: googleBooksId || null,
    yazar: yazar || '',
    posterUrl: posterUrl || '',
    ekleyenId: kullanici.uid,
    ekleyenAdi: kullanici.displayName || 'İsimsiz',
    eklemeTarihi: serverTimestamp(),
  })
}

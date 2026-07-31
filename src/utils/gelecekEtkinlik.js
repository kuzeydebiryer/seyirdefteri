import { addDoc, arrayRemove, arrayUnion, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

// NOT: Gelecek etkinlikler artık üst seviye (top-level) bir koleksiyonda tutuluyor
// (topluluklar/{id}/gelecekEtkinlikler altında DEĞİL). Sebep: hem topluluk sayfasında
// hem küresel Etkinlikler sayfasında sorgulanması gerekiyordu; ikincisi bir
// "collectionGroup" sorgusu gerektiriyordu ki bu da Firestore'da elle bir
// "collection group index" oluşturulmasını şart koşuyor — Firebase konsolundaki
// bu adım pratikte hataya çok açık. Bunun yerine her etkinlik dokümanına
// topluluklId alanı ekleyip basit bir where() sorgusuyla filtreliyoruz;
// bu, hiçbir özel indeks gerektirmez.

export async function gelecekEtkinlikOlustur(topluluklId, { baslik, aciklama, tarih, eser, topluluk, kullanici }) {
  await addDoc(collection(db, 'gelecekEtkinlikler'), {
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

export async function gelecekEtkinlikGuncelle(etkinlikId, { baslik, aciklama, tarih, eser }) {
  await updateDoc(doc(db, 'gelecekEtkinlikler', etkinlikId), {
    baslik,
    aciklama,
    tarih,
    ...(eser || {}),
  })
}

export async function katilacagimDegistir(etkinlikId, uid, suAnKatiliyorMu) {
  await updateDoc(doc(db, 'gelecekEtkinlikler', etkinlikId), {
    katilacaklar: suAnKatiliyorMu ? arrayRemove(uid) : arrayUnion(uid),
  })
}

export async function kaynakEkle(etkinlikId, { tur, baslik, url, googleBooksId, yazar, posterUrl, kullanici }) {
  await addDoc(collection(db, 'gelecekEtkinlikler', etkinlikId, 'kaynaklar'), {
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

import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { gelecekEtkinlikOlustur } from './gelecekEtkinlik.js'

// Film/Kitap Kulübü etkinlik önerileri: bir üye "sıradaki buluşmada bunu
// konuşalım" diye bir eser önerir, diğer üyeler beğenir. En çok beğenilen
// öneri, yönetici tarafından tek tıkla gerçek bir "Gelecek Etkinlik"e
// çevrilir (bkz. oneriyiEtkinligeCevir) — otomatik bir arka uç zamanlayıcı
// olmadığı için "kazananın gerçekleşmesi" bilinçli bir yönetici onayı
// gerektiriyor, ama sıralama (en çok beğenilen en üstte) kararı kolaylaştırıyor.
export async function oneriEkle(topluluklId, { eser, not: notMetni, topluluk, kullanici }) {
  await addDoc(collection(db, 'etkinlikOnerileri'), {
    ...eser,
    not: notMetni || '',
    topluluklId,
    topluluklAd: topluluk?.ad || '',
    topluluklTur: topluluk?.tur || 'Genel',
    onerenId: kullanici.uid,
    onerenAdi: kullanici.displayName || 'İsimsiz',
    oneriTarihi: serverTimestamp(),
    begenenler: [],
  })
}

export async function oneriSil(oneriId) {
  await deleteDoc(doc(db, 'etkinlikOnerileri', oneriId))
}

export async function oneriBegenDegistir(oneriId, uid, begeniyorMu) {
  await updateDoc(doc(db, 'etkinlikOnerileri', oneriId), {
    begenenler: begeniyorMu ? arrayRemove(uid) : arrayUnion(uid),
  })
}

// Bir öneriyi gerçek bir "Gelecek Etkinlik"e çevirir (tarih seçilerek) ve
// öneriyi kaldırır — içeriği artık etkinlik dokümanında yaşıyor.
export async function oneriyiEtkinligeCevir(oneri, tarih, topluluk, kullanici) {
  const { id, not: _not, topluluklId, topluluklAd, topluluklTur, onerenId, onerenAdi, oneriTarihi, begenenler, ...eser } = oneri
  await gelecekEtkinlikOlustur(topluluklId, {
    baslik: eser.eserBaslik ? `${eser.eserBaslik} — Topluluk Buluşması` : 'Topluluk Buluşması',
    aciklama: `Topluluk önerisiyle belirlendi (${(begenenler || []).length} beğeni) — öneren: ${onerenAdi}`,
    tarih,
    eser,
    topluluk,
    kullanici,
  })
  await oneriSil(id)
}

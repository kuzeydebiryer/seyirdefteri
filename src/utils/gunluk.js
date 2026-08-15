import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// "eserPuanlarim" (bkz. eserPuani.js) bir eserin GÜNCEL/tekil puanını tutuyor
// — "ne zaman puanladım" değil "şu an ne puan veriyorum" sorusuna cevap.
// Bu koleksiyon farklı bir şeyi çözüyor: "gerçekte ne zaman izledim/okudum"
// OLAYINI, kendi (kullanıcının seçtiği, geçmişe dönük olabilen) tarihiyle.
// Aynı esere birden fazla kayıt düşebilir (yeniden izleme/okuma).
//
// Yılın Özeti gibi tarihe dayalı hiçbir hesaplama ASLA "eklenme tarihi"
// (serverTimestamp, içe aktarma/kayıt anı) kullanmamalı — her zaman
// "izlemeTarihi" kullanılmalı, çünkü o kullanıcının kendi belirttiği
// gerçek tarih.
export async function gunlukKaydiEkle(
  kullanici,
  { tur, disId, baslik, alt, posterUrl, yil, izlemeTarihiISO, puan, tekrarMi, not: notMetni }
) {
  await addDoc(collection(db, 'gunlukKayitlari'), {
    kullaniciId: kullanici.uid,
    tur, // 'sinema' | 'dizi' | 'kitap' | 'gezi'
    disId,
    baslik,
    alt: alt || '',
    posterUrl: posterUrl || '',
    yil: yil || null,
    izlemeTarihi: izlemeTarihiISO ? Timestamp.fromDate(new Date(izlemeTarihiISO)) : serverTimestamp(),
    puan: puan ?? null,
    tekrarMi: !!tekrarMi,
    not: notMetni || '',
    eklemeTarihi: serverTimestamp(),
  })
}

export async function gunlukKaydiGuncelle(kayitId, { izlemeTarihiISO, puan, tekrarMi, not: notMetni }) {
  await updateDoc(doc(db, 'gunlukKayitlari', kayitId), {
    ...(izlemeTarihiISO ? { izlemeTarihi: Timestamp.fromDate(new Date(izlemeTarihiISO)) } : {}),
    ...(puan !== undefined ? { puan } : {}),
    ...(tekrarMi !== undefined ? { tekrarMi: !!tekrarMi } : {}),
    ...(notMetni !== undefined ? { not: notMetni } : {}),
  })
}

export async function gunlukKaydiSil(kayitId) {
  await deleteDoc(doc(db, 'gunlukKayitlari', kayitId))
}

// tur verilmezse kullanıcının TÜM günlüğü (film+dizi+kitap+gezi karışık,
// Letterboxd Diary'deki gibi) — Günlük sayfası ve Yılın Özeti bunu kullanıyor.
export async function gunlukKayitlariniGetir(uid, { tur } = {}) {
  const kisitlar = [where('kullaniciId', '==', uid)]
  if (tur) kisitlar.push(where('tur', '==', tur))
  kisitlar.push(orderBy('izlemeTarihi', 'desc'))
  const snap = await getDocs(query(collection(db, 'gunlukKayitlari'), ...kisitlar))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

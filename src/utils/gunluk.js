import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore'
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
  { tur, disId, baslik, alt, posterUrl, yil, izlemeTarihiISO, puan, tekrarMi, not: notMetni, olayTuru }
) {
  await addDoc(collection(db, 'gunlukKayitlari'), {
    kullaniciId: kullanici.uid,
    kullaniciAdi: kullanici.displayName || 'İsimsiz',
    tur, // 'sinema' | 'dizi' | 'kitap' | 'gezi' | 'etkinlik'
    disId,
    baslik,
    alt: alt || '',
    posterUrl: posterUrl || '',
    yil: yil || null,
    izlemeTarihi: izlemeTarihiISO ? Timestamp.fromDate(new Date(izlemeTarihiISO)) : serverTimestamp(),
    puan: puan ?? null,
    tekrarMi: !!tekrarMi,
    not: notMetni || '',
    // 'baslama' | 'bitirme' | undefined (undefined = normal puanlama/günce —
    // geriye dönük uyumluluk için, eski kayıtlarda bu alan hiç yok).
    olayTuru: olayTuru || null,
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

// Tek seferlik temizlik aracı — Letterboxd'u "gunlukVar" bayrağı eklenmeden
// ÖNCE bir kez, sonra bayrak eklendikten SONRA bir kez daha içe aktarmış
// olanlarda (bayrak ilk seferde hiç işaretlenmediği için güvenlik kontrolü
// işe yaramamış, aynı esere aynı tarihle İKİNCİ bir günlük kaydı düşmüş)
// oluşan mükerrer kayıtları temizler. Aynı eser + aynı gün + aynı puana
// sahip birden fazla kayıt varsa, birini bırakıp geri kalanını siler.
export async function mukerrerGunlukKayitlariniTemizle(uid) {
  const q = query(collection(db, 'gunlukKayitlari'), where('kullaniciId', '==', uid))
  const snap = await getDocs(q)
  const hepsi = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

  const gruplar = new Map()
  hepsi.forEach((k) => {
    const tarih = typeof k.izlemeTarihi?.toDate === 'function' ? k.izlemeTarihi.toDate() : new Date(k.izlemeTarihi)
    const gun = isNaN(tarih.getTime()) ? 'bilinmeyen' : tarih.toISOString().slice(0, 10)
    const anahtar = `${k.tur}_${k.disId}_${gun}_${k.puan ?? ''}_${k.olayTuru ?? ''}`
    if (!gruplar.has(anahtar)) gruplar.set(anahtar, [])
    gruplar.get(anahtar).push(k)
  })

  const silinecekler = []
  gruplar.forEach((grup) => {
    if (grup.length > 1) {
      // İlkini bırak, gerisini sil.
      silinecekler.push(...grup.slice(1))
    }
  })

  await Promise.all(silinecekler.map((k) => deleteDoc(doc(db, 'gunlukKayitlari', k.id))))
  return silinecekler.length
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

// Sadece TEK bir yılın kayıtlarını çeker — çok yıllık (özellikle Letterboxd
// içe aktarımı sonrası binlerce kayıt olabilen) bir günlükte her açılışta
// TÜM geçmişi çekmek hem yavaş hem gereksizdi. Profil sayfası artık sadece
// o an seçili olan yılı istiyor, yıl değiştikçe yeni bir istek atıyor.
export async function gunlukYilininKayitlariniGetir(uid, yil, { tur } = {}) {
  const baslangic = Timestamp.fromDate(new Date(`${yil}-01-01T00:00:00`))
  const bitis = Timestamp.fromDate(new Date(`${yil + 1}-01-01T00:00:00`))
  const kisitlar = [
    where('kullaniciId', '==', uid),
    where('izlemeTarihi', '>=', baslangic),
    where('izlemeTarihi', '<', bitis),
  ]
  if (tur) kisitlar.push(where('tur', '==', tur))
  kisitlar.push(orderBy('izlemeTarihi', 'desc'))
  const snap = await getDocs(query(collection(db, 'gunlukKayitlari'), ...kisitlar))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Yıl sekmelerini (2023, 2024, 2025...) göstermek için TÜM kayıtları çekmeye
// gerek yok — sadece en eski kaydın tarihini bulmak yeterli (en yeni zaten
// "bugün"). Aradaki yıllarda hiç kayıt olmasa bile sekme olarak gösterilir,
// tıklanınca "bu yıl boş" der — zararsız, ama binlerce belge okumaktan
// kat kat ucuz.
export async function gunlukIlkYiliGetir(uid) {
  const q = query(collection(db, 'gunlukKayitlari'), where('kullaniciId', '==', uid), orderBy('izlemeTarihi', 'asc'), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const tarih = snap.docs[0].data().izlemeTarihi
  const d = typeof tarih?.toDate === 'function' ? tarih.toDate() : new Date(tarih)
  return isNaN(d.getTime()) ? null : d.getFullYear()
}

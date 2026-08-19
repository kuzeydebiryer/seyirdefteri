import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore'
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
    begenenler: [],
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
// sahip birden fazla kayıt varsa, EN SON eklenmiş olanı (kullanıcının puanını
// değiştire değiştire son karar kıldığı değer) bırakıp geri kalanını siler.
// NOT: Anahtara puan DAHİL EDİLMİYOR — aynı esere aynı gün birden fazla
// FARKLI puanla kayıt düşmesi de (puanGonder'daki "yıldıza her tıklamada
// yeni kayıt" hatasının kalıntısı, artık düzeltildi ama geçmiş veride var
// olabilir) mükerrer sayılmalı, sadece aynı puanlı tam kopyalar değil.
export async function mukerrerGunlukKayitlariniTemizle(uid) {
  const q = query(collection(db, 'gunlukKayitlari'), where('kullaniciId', '==', uid))
  const snap = await getDocs(q)
  const hepsi = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

  const gruplar = new Map()
  hepsi.forEach((k) => {
    const tarih = typeof k.izlemeTarihi?.toDate === 'function' ? k.izlemeTarihi.toDate() : new Date(k.izlemeTarihi)
    const gun = isNaN(tarih.getTime()) ? 'bilinmeyen' : tarih.toISOString().slice(0, 10)
    const anahtar = `${k.tur}_${k.disId}_${gun}_${k.olayTuru ?? ''}`
    if (!gruplar.has(anahtar)) gruplar.set(anahtar, [])
    gruplar.get(anahtar).push(k)
  })

  const silinecekler = []
  gruplar.forEach((grup) => {
    if (grup.length > 1) {
      // En yeni eklenen (eklemeTarihi'ne göre) en sonda kalsın diye sırala,
      // onu tut, gerisini sil.
      grup.sort((a, b) => (a.eklemeTarihi?.toMillis?.() || 0) - (b.eklemeTarihi?.toMillis?.() || 0))
      silinecekler.push(...grup.slice(0, -1))
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

// Aynı esere, aynı güne düşülmüş bir kayıt zaten var mı? — puanGonder'ın her
// yıldız tıklamasında (kullanıcı fikrini değiştirip ★★★→★★★★ gibi puanını
// ayarladığında) yeni bir günlük kaydı EKLEMEK yerine mevcut olanı
// GÜNCELLEMESİ için. Sadece eşitlik filtreleri kullanıyoruz (kullaniciId +
// tur + disId) — bileşik indeks gerektirmesin diye gün eşleşmesini
// istemci tarafında yapıyoruz.
export async function gunlukKaydiAyniGunGetir(uid, tur, disId, izlemeTarihiISO) {
  const q = query(
    collection(db, 'gunlukKayitlari'),
    where('kullaniciId', '==', uid),
    where('tur', '==', tur),
    where('disId', '==', disId)
  )
  const snap = await getDocs(q)
  const hedefGun = izlemeTarihiISO.slice(0, 10)
  for (const d of snap.docs) {
    const veri = d.data()
    const tarih = typeof veri.izlemeTarihi?.toDate === 'function' ? veri.izlemeTarihi.toDate() : new Date(veri.izlemeTarihi)
    if (isNaN(tarih.getTime())) continue
    if (tarih.toISOString().slice(0, 10) === hedefGun) return { id: d.id, ...veri }
  }
  return null
}

// Bir günlük kaydını beğenme/beğeniyi geri alma — mevcut gönderi beğeni
// sistemiyle (bkz. utils/begeni.js) aynı desen, sadece hedef koleksiyon farklı.
export async function gunlukBegenDegistir(kayitId, uid, suAnBegeniyorMu) {
  await updateDoc(doc(db, 'gunlukKayitlari', kayitId), {
    begenenler: suAnBegeniyorMu ? arrayRemove(uid) : arrayUnion(uid),
  })
}

// Bir günlük kaydının hedef sayfasını (tur'a göre) doğru şekilde çözer.
// gunlukKayitlari SADECE eser (film/dizi/kitap) puanlamalarını değil, gezi ve
// etkinlik güncelerini de tutuyor (bkz. GonderiEkle.jsx) — bunların disId'si
// bir TMDB/Google Books ID'si DEĞİL, gönderinin kendi Firestore ID'si, o
// yüzden /film veya /kitap'a değil /gonderi'ye gitmeleri gerekiyor. Bu ayrımı
// atlayan bir bağlantı, TMDB'de "resource not found" hatasına düşüyordu.
export function gunlukKaydiLinki(kayit) {
  if (kayit.tur === 'gezi' || kayit.tur === 'etkinlik') return `/gonderi/${kayit.disId}`
  if (kayit.tur === 'dizi') return `/dizi/${kayit.disId}`
  if (kayit.tur === 'kitap') return `/kitap/${kayit.disId}`
  return `/film/${kayit.disId}`
}

// Aynı ayrım için, günlük kaydının kartlarda/gridlerde kullanılacak eylem
// metni ve poster yoksa gösterilecek yer tutucu ikonu.
export function gunlukKaydiEylemMetni(kayit) {
  if (kayit.tur === 'gezi') return 'bir gezi paylaştı'
  if (kayit.tur === 'etkinlik') return 'bir etkinlik paylaştı'
  if (kayit.olayTuru === 'baslama') return kayit.tur === 'kitap' ? 'okumaya başladı' : 'izlemeye başladı'
  return kayit.tur === 'kitap' ? 'okudu' : 'izledi'
}

export function gunlukKaydiYerTutucuIkon(kayit) {
  if (kayit.tur === 'gezi') return '🧳'
  if (kayit.tur === 'etkinlik') return '🎟️'
  if (kayit.tur === 'kitap') return '📖'
  return '🎬'
}

// Takip ettiklerinin en son günlük kayıtları — Letterboxd'daki "Friends"
// akışı / "New from friends" grid'i için. Firestore'un "in" operatörü en
// fazla 30 değer kabul ettiğinden (bkz. useGonderiler.js'teki aynı desen),
// büyük takip listelerinde sorgu 30'luk gruplara bölünüp birleştiriliyor —
// küçük bir toplulukta pratikte hep tek istek olacak.
// Sıralama İZLEME TARİHİNE değil EKLEME TARİHİNE göre — geçmişe dönük
// (backdated) bir kayıt eklendiğinde akışın en üstüne zıplamaması için;
// "en son ne oldu" sorusu her zaman gerçek ekleme anını göstermeli.
export async function takipEdilenlerinGunlukKayitlariniGetir(uidListesi, limitSayisi = 15) {
  if (!uidListesi || uidListesi.length === 0) return []
  const gruplar = []
  for (let i = 0; i < uidListesi.length; i += 30) {
    gruplar.push(uidListesi.slice(i, i + 30))
  }
  const sonuclar = await Promise.all(
    gruplar.map((grup) =>
      getDocs(
        query(
          collection(db, 'gunlukKayitlari'),
          where('kullaniciId', 'in', grup),
          orderBy('eklemeTarihi', 'desc'),
          limit(limitSayisi)
        )
      )
    )
  )
  const hepsi = sonuclar.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  hepsi.sort((a, b) => (b.eklemeTarihi?.toMillis?.() || 0) - (a.eklemeTarihi?.toMillis?.() || 0))
  return hepsi.slice(0, limitSayisi)
}

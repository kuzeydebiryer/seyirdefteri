// Oscar Yolculuğu — Faz 1: Sezon + Kategori + Aday yönetimi ve izleme ilerlemesi.
// Not: Akademi Ödülleri'nin adayları için resmi bir API yok, bu yüzden
// kategoriler ve adaylar (OKULLAR listesi gibi) elle girilen referans veridir.
// Puanlama/tahmin sistemi (Faz 2) ve sonuç+rozet (Faz 3) sonraya bırakıldı.

import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function sezonOlustur(kullanici, { ad, torenTarihi }) {
  const ref = await addDoc(collection(db, 'oscarSezonlari'), {
    ad,
    torenTarihi,
    olusturanId: kullanici.uid,
    olusturmaTarihi: serverTimestamp(),
  })
  return ref.id
}

// En son oluşturulan sezonu getirir — bu, "aktif" sezon olarak kabul edilir.
// Şimdilik tek bir aktif sezon varsayımıyla en basit hâliyle bırakıldı;
// geçmiş sezonlar Faz 3'te "arşiv" (sadece kazananlar) olarak ayrıca tutulacak.
export async function aktifSezonuGetir() {
  const q = query(collection(db, 'oscarSezonlari'), orderBy('olusturmaTarihi', 'desc'))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

export async function kategoriEkle(sezonId, { ad, sira }) {
  await addDoc(collection(db, 'oscarKategorileri'), { sezonId, ad, sira: sira ?? 0 })
}

export async function kategoriSil(kategoriId) {
  const adaylarSnap = await getDocs(query(collection(db, 'oscarAdaylari'), where('kategoriId', '==', kategoriId)))
  await Promise.all(adaylarSnap.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'oscarKategorileri', kategoriId))
}

export async function kategorilerGetir(sezonId) {
  const q = query(collection(db, 'oscarKategorileri'), where('sezonId', '==', sezonId), orderBy('sira', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function adayEkle(sezonId, kategoriId, { tmdbId, filmBasligi, filmYili, posterUrl, kisiAdi, sira }) {
  await addDoc(collection(db, 'oscarAdaylari'), {
    sezonId,
    kategoriId,
    tmdbId,
    filmBasligi,
    filmYili: filmYili || '',
    posterUrl: posterUrl || '',
    kisiAdi: kisiAdi || '', // oyunculuk/yönetmenlik gibi kategorilerde kişi adı (opsiyonel)
    sira: sira ?? 0,
  })
}

export async function adaySil(adayId) {
  await deleteDoc(doc(db, 'oscarAdaylari', adayId))
}

// Bir sezonun TÜM adaylarını tek seferde getirir (kategoriId'ye göre gruplamayı
// çağıran taraf yapar) — 23 kategori için 23 ayrı sorgu atmamak için.
export async function adaylarGetir(sezonId) {
  const q = query(collection(db, 'oscarAdaylari'), where('sezonId', '==', sezonId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Topluluk genelinde izleme ilerlemesi: bu sezonun adayı olan filmlerden kaçının
// en az bir kişi tarafından puanlandığını (=izlendiğini) sayar. "İzlendi" için ayrı
// bir durum alanı yok — eserPuanlari'na puan girilmiş olması izlenmiş olmanın kanıtı.
export async function izlemeIlerlemesiHesapla(tmdbIdSeti) {
  if (tmdbIdSeti.size === 0) return { izlenen: 0, toplam: 0 }
  const snap = await getDocs(query(collection(db, 'eserPuanlari'), where('tur', '==', 'sinema')))
  const izlenenler = new Set()
  snap.docs.forEach((d) => {
    const disId = d.data().disId
    if (tmdbIdSeti.has(disId)) izlenenler.add(disId)
  })
  return { izlenen: izlenenler.size, toplam: tmdbIdSeti.size }
}

// --- Faz 2: Tahmin / Anket sistemi ---------------------------------------
// Puanlama tamamen elle yapılacağı için (bkz. Faz 3) burada karmaşık bir
// ağırlıklandırma yok — sadece "kim hangi kategoride kimi tahmin etti" kaydı.
// Kilitleme otomatik bir tarihe göre DEĞİL, elle (bir buton ile) yapılıyor —
// tören gecikebilir/öne alınabilir, bunu tarihe bağlamak kırılgan olurdu.

export async function sezonuKilitle(sezonId, kilitli) {
  await updateDoc(doc(db, 'oscarSezonlari', sezonId), { kilitli })
}

// Doküman ID'si kasıtlı olarak `${kategoriId}_${uid}` — bir kullanıcı bir
// kategoride sadece bir tahmine sahip olabilir, değiştirdiğinde üzerine yazılır.
export async function tahminVer(sezonId, kategoriId, kullanici, profil, adayId) {
  await setDoc(
    doc(db, 'oscarTahminleri', `${kategoriId}_${kullanici.uid}`),
    {
      sezonId,
      kategoriId,
      kullaniciId: kullanici.uid,
      kullaniciAdi: profil?.adSoyad || kullanici.displayName || 'İsimsiz',
      adayId,
      tarih: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function tahminleriGetir(sezonId) {
  const q = query(collection(db, 'oscarTahminleri'), where('sezonId', '==', sezonId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

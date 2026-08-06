// Oscar Yolculuğu — Faz 1: Sezon + Kategori + Aday yönetimi ve izleme ilerlemesi.
// Not: Akademi Ödülleri'nin adayları için resmi bir API yok, bu yüzden
// kategoriler ve adaylar (OKULLAR listesi gibi) elle girilen referans veridir.
// Puanlama/tahmin sistemi (Faz 2) ve sonuç+rozet (Faz 3) sonraya bırakıldı.

import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
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

// tmdbId: film bazlı adaylarda (En İyi Film gibi) zorunlu. kisiTmdbId: oyunculuk/
// yönetmenlik kategorilerinde kişinin kendisini birincil aday yapmak için —
// bu durumda tmdbId hâlâ verilir (afiş yerine kişi fotoğrafı öncelikli gösterilir)
// ama esas kimlik kişi olur, filmBasligi ise "hangi film için aday olduğu" bilgisidir.
export async function adayEkle(sezonId, kategoriId, { tmdbId, filmBasligi, filmYili, posterUrl, kisiAdi, kisiTmdbId, kisiFotoUrl, sira }) {
  await addDoc(collection(db, 'oscarAdaylari'), {
    sezonId,
    kategoriId,
    tmdbId: tmdbId ?? null,
    filmBasligi,
    filmYili: filmYili || '',
    posterUrl: posterUrl || '',
    kisiAdi: kisiAdi || '',
    kisiTmdbId: kisiTmdbId ?? null,
    kisiFotoUrl: kisiFotoUrl || '',
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
// Topluluk genelinde izleme ilerlemesi: bu sezonun adayı olan filmlerden kaçının
// en az bir kişi tarafından puanlandığını (=izlendiğini) sayar. "İzlendi" için ayrı
// bir durum alanı yok — eserPuanlari'na puan girilmiş olması izlenmiş olmanın kanıtı.
//
// ÖNEMLİ: eserPuanlari'nın TAMAMINI (tur=='sinema') çekmek yerine sadece bu
// sezonun adayı olan tmdbId'leri sorguluyoruz. Firestore'un `in` operatörü en
// fazla 30 değer aldığı için 30'arlık gruplar hâlinde soruyoruz. Bu, koleksiyon
// büyüdükçe (ör. toplu Letterboxd puan içe aktarımından sonra binlerce kayıt
// olduğunda) her sayfa açılışında TÜM koleksiyonu okumayı — ve Firestore
// kotasını gereksiz yere tüketmeyi — önlüyor.
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

// --- Faz 3: Sonuç girişi + otomatik skor tablosu + rozet -----------------
// Arşiv kasıtlı olarak sade: bir sezon bitince sadece kazanan (Kahin) kalıcı
// olarak tutulur, kategori bazlı ayrıntılar arşive taşınmaz — "sadece rozet".

export async function sonucGir(kategoriId, kazananAdayId) {
  await updateDoc(doc(db, 'oscarKategorileri', kategoriId), { kazananAdayId })
}

export async function sonucuTemizle(kategoriId) {
  await updateDoc(doc(db, 'oscarKategorileri', kategoriId), { kazananAdayId: null })
}

// Saf fonksiyon — Firestore'a gitmez, elde var olan kategoriler+tahminlerden
// hesaplar. Sadece sonuçlanmış (kazananAdayId'si olan) kategoriler sayılır.
export function skorTablosuHesapla(kategoriler, tahminler) {
  const sonuclananKategoriler = kategoriler.filter((k) => k.kazananAdayId)
  const kullanicilar = {} // uid -> { kullaniciAdi, dogru, toplam }

  tahminler.forEach((t) => {
    if (!kullanicilar[t.kullaniciId]) {
      kullanicilar[t.kullaniciId] = { kullaniciId: t.kullaniciId, kullaniciAdi: t.kullaniciAdi, dogru: 0, toplam: 0 }
    }
    const kategori = sonuclananKategoriler.find((k) => k.id === t.kategoriId)
    if (!kategori) return // henüz sonuçlanmamış kategori, sayıma dahil değil
    kullanicilar[t.kullaniciId].toplam += 1
    if (t.adayId === kategori.kazananAdayId) kullanicilar[t.kullaniciId].dogru += 1
  })

  return Object.values(kullanicilar).sort((a, b) => b.dogru - a.dogru || b.toplam - a.toplam)
}

export async function sezonuBitir(sezonId, kahinUid, kahinAdi) {
  await updateDoc(doc(db, 'oscarSezonlari', sezonId), { bittiMi: true, kahinUid, kahinAdi })
}

export async function tumSezonlariGetir() {
  const q = query(collection(db, 'oscarSezonlari'), orderBy('olusturmaTarihi', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Profildeki rozet gösterimi için: bu kullanıcının Kahin ilan edildiği sezonlar.
export async function kahinOlduguSezonlariGetir(uid) {
  const q = query(collection(db, 'oscarSezonlari'), where('kahinUid', '==', uid))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Eser sayfasında "🏆 Oscar Adayı" rozeti için: bu film hangi sezon(lar)ın
// adayı — varsa hangi yıl(lar) gösterilecek.
// Eser sayfasında "🏆 Oscar Adaylıkları" bölümü için: bu film hangi sezon(lar)da
// hangi kategori(ler)de aday — hem doğrudan film adaylıkları (En İyi Film gibi)
// hem de bu filmle bağlantılı KİŞİ adaylıkları (En İyi Yönetmen/Oyuncu gibi,
// artık tmdbId ile filme bağlı) TEK bir listede toplanıyor.
export async function filmOscarBilgisiGetir(tmdbId) {
  const q = query(collection(db, 'oscarAdaylari'), where('tmdbId', '==', tmdbId))
  const adaySnap = await getDocs(q)
  if (adaySnap.empty) return []
  const adaylar = adaySnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  const sezonIdleri = [...new Set(adaylar.map((a) => a.sezonId))]
  const kategoriIdleri = [...new Set(adaylar.map((a) => a.kategoriId))]
  const [sezonSnaplari, kategoriSnaplari] = await Promise.all([
    Promise.all(sezonIdleri.map((id) => getDoc(doc(db, 'oscarSezonlari', id)))),
    Promise.all(kategoriIdleri.map((id) => getDoc(doc(db, 'oscarKategorileri', id)))),
  ])
  const sezonMap = new Map(sezonSnaplari.filter((s) => s.exists()).map((s) => [s.id, s.data()]))
  const kategoriMap = new Map(kategoriSnaplari.filter((k) => k.exists()).map((k) => [k.id, k.data()]))

  const sezonGruplari = new Map()
  adaylar.forEach((a) => {
    const kategori = kategoriMap.get(a.kategoriId)
    const sezon = sezonMap.get(a.sezonId)
    if (!kategori || !sezon) return
    if (!sezonGruplari.has(a.sezonId)) {
      sezonGruplari.set(a.sezonId, { sezonId: a.sezonId, sezonAdi: sezon.ad, yil: sezon.torenTarihi?.slice(0, 4) || '', kategoriler: [] })
    }
    sezonGruplari.get(a.sezonId).kategoriler.push({
      ad: kategori.ad,
      kazandiMi: kategori.kazananAdayId === a.id,
      kisiAdi: a.kisiAdi || '',
    })
  })

  return Array.from(sezonGruplari.values())
}

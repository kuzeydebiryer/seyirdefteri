import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

function izlenecekDokId(uid, tur, disId) {
  return `${uid}_${tur}_${disId}`
}

export async function izlenecekEkle(kullanici, { tur, disId, baslik, alt, posterUrl, toplamSayfa, durum }) {
  const id = izlenecekDokId(kullanici.uid, tur, disId)
  await setDoc(doc(db, 'izlenecekler', id), {
    kullaniciId: kullanici.uid,
    tur, // 'sinema' | 'dizi' | 'kitap'
    disId,
    baslik,
    alt: alt || '',
    posterUrl: posterUrl || '',
    durum: durum || 'planlanan', // 'planlanan' | 'okunuyor'
    toplamSayfa: toplamSayfa || null,
    suankiSayfa: durum === 'okunuyor' ? 0 : null,
    eklemeTarihi: serverTimestamp(),
  })
}

export async function izlenecekKaldir(uid, tur, disId) {
  await deleteDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, tur, disId)))
}

// "Bitirdim" — kaydı SİLMEK yerine tamamlandı olarak işaretliyoruz. Önceden
// silmek, "izleniyor" ile "tamamlandı" arasındaki tek güvenilir ayrımı yok
// ediyordu (kart/profil sayfalarında hangi dizinin bitip hangisinin devam
// ettiğini gösterecek veri kalmıyordu). Artık kayıt duruyor, sadece durumu
// değişiyor — ilerlemesini (mevcutSezon/mevcutBolum) de koruyoruz.
export async function izlemeTamamlandiIsaretle(uid, tur, disId) {
  await updateDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, tur, disId)), {
    durum: 'tamamlandi',
    tamamlanmaTarihi: serverTimestamp(),
  })
}

export function izlenecekDokIdOlustur(uid, tur, disId) {
  return izlenecekDokId(uid, tur, disId)
}

// Bir eser (kitap/film/dizi) "İzleyeceğim/Okuyacaklarım"a eklenirken veya
// okumaya/izlemeye başlanırken kapak görseli anlık olarak kopyalanıyor
// (izlenecekEkle içinde) — eser SONRADAN düzenlenip kapak eklenirse, bu eski
// kopyalar hiç güncellenmiyordu. Bu, "Kitap Dünyası" (Anasayfa) widget'ında
// kapaksız kartlara sebep oluyordu — tavsiyeler için daha önce yaptığımız
// senkronizasyonun (bkz. tavsiye.js) izlenecekler karşılığı. Herkesin
// (tüm kullanıcıların) o esere ait kapaksız kayıtlarını bulup dolduruyor.
export async function izlenecekPosterleriniSenkronizeEt(tur, disId, posterUrl) {
  if (!posterUrl) return
  const q = query(collection(db, 'izlenecekler'), where('tur', '==', tur), where('disId', '==', disId))
  const snap = await getDocs(q)
  await Promise.all(
    snap.docs.filter((d) => !d.data().posterUrl).map((d) => updateDoc(d.ref, { posterUrl }).catch(() => {}))
  )
}

export async function izlenecekMi(uid, tur, disId) {
  if (!uid) return false
  const snap = await getDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, tur, disId)))
  return snap.exists()
}

export async function izlenecekGetir(uid, tur, disId) {
  if (!uid) return null
  const snap = await getDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, tur, disId)))
  return snap.exists() ? snap.data() : null
}

// "İzleyeceklerim"den "Şu An Okuyorum/İzliyorum"a geçiş
export async function okumayaBasla(uid, tur, disId, toplamSayfa) {
  await updateDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, tur, disId)), {
    durum: 'okunuyor',
    toplamSayfa: toplamSayfa || null,
    suankiSayfa: 0,
    // Dizi için "sayfa" kavramı yok — sezon/bölüm bazlı ilerleme kullanılıyor
    // (bkz. dizideIlerlemeGuncelle). Kitap kaydına dokunmaması için sadece
    // tur 'dizi' olduğunda başlangıç değerleri yazılıyor.
    ...(tur === 'dizi' ? { mevcutSezon: 1, mevcutBolum: 0 } : {}),
    baslangicTarihi: serverTimestamp(),
  })
}

export async function ilerlemeGuncelle(uid, tur, disId, suankiSayfa) {
  await updateDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, tur, disId)), { suankiSayfa })
}

// Dizi ilerlemesi kitaptaki "sayfa" yerine "sezon + bölüm" ile tutuluyor —
// tek bir sayı yerine ikisi birlikte, çünkü bir dizinin kaçıncı bölümde
// olduğun sezon bilgisi olmadan anlamsız (her sezonun bölüm sayısı farklı).
export async function dizideIlerlemeGuncelle(uid, disId, mevcutSezon, mevcutBolum) {
  await updateDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, 'dizi', disId)), { mevcutSezon, mevcutBolum })
}

// Başlangıç tarihi ilk kayıtta bilinmiyorsa "şimdi" varsayılıyordu (bkz.
// baslangicTarihiTamamla) — ama bu, "aslında 2 yıldır izliyorum, sadece
// ilerlememi girmedim" durumunda "günde 20 bölüm izliyorsun" gibi anlamsız
// bir tempo hesabına yol açıyor. Kullanıcı gerçek başlangıç tarihini elle
// düzeltebilsin diye ayrı bir fonksiyon.
export async function baslangicTarihiniDuzelt(uid, tur, disId, yeniTarihISO) {
  await updateDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, tur, disId)), {
    baslangicTarihi: Timestamp.fromDate(new Date(yeniTarihISO)),
  })
}

// "Okumaya Başlıyorum" özelliği baslangicTarihi alanı olmadan önce başlanmış
// kayıtlar için geriye dönük onarım: gerçek başlangıç tarihi bilinmediğinden
// en iyi tahmin olarak "şimdi" yazılıyor (günlük ortalama o andan itibaren
// sayılmaya başlar — geçmişe dönük yanlış bir ortalama vermektense budur).
export async function baslangicTarihiTamamla(uid, tur, disId) {
  await updateDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, tur, disId)), { baslangicTarihi: serverTimestamp() })
}

// "Okumaya Başlıyorum" tıklandığı anda kitabın sayfa sayısı katalogda henüz
// yoksa, izlenecek kaydı toplamSayfa:null ile oluşuyor. Kitap sonradan
// (Bilgiyi Düzenle veya Yeniden Dene ile) güncellenirse bu ESKİ kayıt kendiliğinden
// güncellenmiyor — iki ayrı belge. Bu fonksiyon o boşluğu kendiliğinden onarır:
// kayıt hâlâ toplamSayfa'sızsa ve katalogda artık bir değer varsa, geriye dönük doldurur.
export async function toplamSayfaTamamla(uid, tur, disId, toplamSayfa) {
  await updateDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, tur, disId)), { toplamSayfa })
}

// Kitap Kesfet hub sayfasındaki "Şu An Okuduğum Kitap" widget'ı için: kullanıcının
// durum:'okunuyor' olan tek kitabını (varsa) getirir. Birden fazla kitap aynı anda
// "okunuyor" işaretlenmişse en son eklenen döner (pratikte nadir bir durum).
export async function suankiOkunanKitabiGetir(uid) {
  if (!uid) return null
  const q = query(
    collection(db, 'izlenecekler'),
    where('kullaniciId', '==', uid),
    where('tur', '==', 'kitap'),
    where('durum', '==', 'okunuyor'),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

// Anasayfa'daki "Kitap Dünyası" ve Diziler sayfasındaki "Şu An İzlenenler"
// widget'ları için ortak fonksiyon — TÜM topluluğun o an okuduğu/izlediği
// eserleri getirir (herkese görünür, kişisel değil). En son başlayanlar önce.
export async function topluluktaSuankiOkunanlariGetir(tur, limitSayisi = 6) {
  const q = query(
    collection(db, 'izlenecekler'),
    where('tur', '==', tur),
    where('durum', '==', 'okunuyor'),
    orderBy('eklemeTarihi', 'desc'),
    limit(limitSayisi)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

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

// "Dinliyorum" (Storytel gibi sesli kitap kaynakları için) — "okuyorum" ile
// AYNI izlenecekler kaydını paylaşıyor, sadece durum değeri farklı
// ('dinleniyor') ve sayfa yerine DAKİKA bazlı ilerleme tutuluyor
// (toplamDakika/suankiDakika). setDoc+merge kullanılıyor çünkü hem "hiç
// kaydı yok" hem "kaydı var ama farklı durumda" durumlarını TEK bir
// fonksiyonla, iki ayrı yol yazmadan kapsıyor. Storytel'in gerçek çalma
// konumunu senkronize etmemiz mümkün değil (API yok) — bu yüzden ilerleme
// tamamen ELLE güncelleniyor, otomatik değil.
export async function dinlemeyeBasla(kullanici, tur, disId, { baslik, alt, posterUrl, toplamDakika }) {
  const id = izlenecekDokId(kullanici.uid, tur, disId)
  await setDoc(
    doc(db, 'izlenecekler', id),
    {
      kullaniciId: kullanici.uid,
      tur,
      disId,
      baslik,
      alt: alt || '',
      posterUrl: posterUrl || '',
      durum: 'dinleniyor',
      toplamDakika: toplamDakika || null,
      suankiDakika: 0,
      baslangicTarihi: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function dinlemeIlerlemeGuncelle(uid, tur, disId, suankiDakika) {
  await updateDoc(doc(db, 'izlenecekler', izlenecekDokId(uid, tur, disId)), { suankiDakika })
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
// durumlar: varsayılan sadece 'okunuyor', ama Kitap Dünyası gibi "dinleniyor"
// durumunu da göstermek isteyen çağrılar bir dizi geçebilir (ör.
// ['okunuyor', 'dinleniyor']) — aynı bileşik indeks 'in' sorgusunu da
// karşılıyor, yeni bir indekse gerek yok.
export async function topluluktaSuankiOkunanlariGetir(tur, limitSayisi = 6, durumlar = ['okunuyor']) {
  const q = query(
    collection(db, 'izlenecekler'),
    where('tur', '==', tur),
    where('durum', 'in', durumlar),
    orderBy('eklemeTarihi', 'desc'),
    limit(limitSayisi)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// "Yaklaşan Bölümler" widget'ı için — kullanıcının durum:'okunuyor' olan TÜM
// dizilerini getirir (suankiOkunanKitabiGetir'den farkı: tek değil, hepsi —
// biri aynı anda birkaç diziyi takip ediyor olabilir).
// "İzliyorum" (okunuyor) + "İzleyeceklerim" (planlanan) — sadece o an
// izlenen değil, takip edilen her dizi dahil. Sadece "okunuyor" ile
// sınırlıyken liste çoğu zaman boş kalıyordu (widget'ın "hiç görünmüyor"
// sorununun kaynağı buydu) — henüz başlamadığın ama takip ettiğin bir
// dizinin yeni bölümü geldiğinde bilmek de değerli.
export async function kullanicininIzlemekteOlduguDizileriGetir(uid) {
  if (!uid) return []
  const q = query(
    collection(db, 'izlenecekler'),
    where('kullaniciId', '==', uid),
    where('tur', '==', 'dizi'),
    where('durum', 'in', ['okunuyor', 'planlanan'])
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase.js'

// Moderasyon: yönetici olmayan biri haber eklediğinde onayli:false ile
// kaydediliyor — yönetici HaberOnayYonetim.jsx'ten onaylayana kadar hiçbir
// public sorguda (sonHaberleriGetir, haberSayfasiGetir, benzerHaberleriGetir)
// görünmüyor. Yöneticinin eklediği haberler doğrudan onayli:true.
// Eski (bu özellikten önce eklenmiş) haberlerde onayli alanı hiç yok — bunlar
// "onaylanmış" sayılıyor (bkz. gorunurMu), aksi halde siteden aniden kaybolurlardı.
export async function haberEkle({
  kategori,
  baslik,
  icerik,
  gorselUrl,
  ilgiliTur,
  ilgiliDisId,
  ilgiliBaslik,
  ilgiliPosterUrl,
  fragmanId,
  instagramUrl,
  kullanici,
  yoneticiMi = false,
}) {
  await addDoc(collection(db, 'haberler'), {
    kategori, // 'sinema' | 'dizi' | 'kitap' | 'kisi' | 'kultur-sanat'
    baslik,
    icerik,
    gorselUrl: gorselUrl || '',
    ilgiliTur: ilgiliTur || null,
    ilgiliDisId: ilgiliDisId || null,
    ilgiliBaslik: ilgiliBaslik || '',
    ilgiliPosterUrl: ilgiliPosterUrl || '',
    fragmanId: fragmanId || '',
    // Instagram/YouTube/X linki — MedyaGomulusu bileşeni (Seyir Panosu,
    // Etkinlik Habercisi ve diğer yerlerde de kullanılan aynı tek giriş
    // noktası) linke bakıp doğru platformu kendisi tespit ediyor.
    instagramUrl: instagramUrl || '',
    ekleyenId: kullanici.uid,
    ekleyenAdi: kullanici.displayName || 'İsimsiz',
    tarih: serverTimestamp(),
    onayli: yoneticiMi,
    oneCikan: false,
    begenenler: [],
  })
}

export async function haberSil(haberId) {
  await deleteDoc(doc(db, 'haberler', haberId))
}

export async function haberGetir(haberId) {
  const snap = await getDoc(doc(db, 'haberler', haberId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

// Haber detayı açıldığında bir kere çağrılır — Anasayfa'daki haber vitrini
// için sessizce bir görüntülenme sayacı tutuyoruz. Hata olursa (ör. kural
// izin vermiyorsa) sayfanın geri kalanını etkilememesi için yutuluyor.
export async function haberGoruntulendi(haberId) {
  try {
    await updateDoc(doc(db, 'haberler', haberId), { goruntulenmeSayisi: increment(1) })
  } catch {
    // sessizce yut — görüntülenme sayacı kritik değil
  }
}

export async function haberBegenDegistir(haberId, uid, suAnBegeniyorMu) {
  await updateDoc(doc(db, 'haberler', haberId), {
    begenenler: suAnBegeniyorMu ? arrayRemove(uid) : arrayUnion(uid),
  })
}

// Onaysız/eski alan yapılarıyla uyumlu görünürlük kontrolü — sadece açıkça
// onayli:false olarak REDDEDİLMİŞ (ya da henüz onaylanmamış) haberleri gizler.
// Alan hiç yoksa (eski kayıt) ya da true'ysa görünür.
function gorunurMu(haber) {
  return haber.onayli !== false
}

// Anasayfa'daki büyük "haber vitrini" (hero + şerit) için — onaylı
// haberlerin arasından önce yöneticinin "öne çıkan" işaretlediklerini, sonra
// en yenileri karıştırıp sınırlı sayıda getirir. Composite index gerekmesin
// diye tek bir "en yeni N" sorgusu çekilip öncelik client'ta uygulanıyor.
export async function sonHaberleriGetir(limitSayisi = 7) {
  const q = query(collection(db, 'haberler'), orderBy('tarih', 'desc'), limit(limitSayisi * 3))
  const snap = await getDocs(q)
  const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(gorunurMu)
  liste.sort((a, b) => {
    const oneCikanFark = (b.oneCikan ? 1 : 0) - (a.oneCikan ? 1 : 0)
    if (oneCikanFark !== 0) return oneCikanFark
    return (b.tarih?.toMillis?.() || 0) - (a.tarih?.toMillis?.() || 0)
  })
  return liste.slice(0, limitSayisi)
}

export async function haberDuzenle(haberId, { baslik, icerik, gorselUrl, fragmanId, instagramUrl }) {
  await updateDoc(doc(db, 'haberler', haberId), {
    baslik,
    icerik,
    gorselUrl: gorselUrl || '',
    fragmanId: fragmanId || '',
    instagramUrl: instagramUrl || '',
  })
}

// Sadece yönetici — onayla (yayına al) / reddet (kalıcı sil) / öne çıkar.
export async function haberOnayla(haberId) {
  await updateDoc(doc(db, 'haberler', haberId), { onayli: true })
}

export async function haberReddet(haberId) {
  await deleteDoc(doc(db, 'haberler', haberId))
}

export async function haberOneCikarDegistir(haberId, yeniDeger) {
  await updateDoc(doc(db, 'haberler', haberId), { oneCikan: yeniDeger })
}

// Yönetim sayfası için — onay bekleyen (onayli === false) tüm haberler,
// en yeniden eskiye. Bekleyen haber sayısı normalde küçük olduğu için
// sayfalamaya gerek yok.
export async function onayBekleyenHaberleriGetir() {
  const q = query(collection(db, 'haberler'), where('onayli', '==', false), orderBy('tarih', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Haberler hub sayfası (/haberler) ve kategori bölümleri (HaberBolumu) için —
// gerçek Firestore sayfalaması, 20'şer 20'şer, "Daha Fazla Yükle" ile devam
// ediyor. sonBelge: bir önceki sayfanın son dokümanı (startAfter için).
// NOT: onayli filtresi client tarafında uygulanıyor (Firestore'da eksik alanlı
// eski kayıtları dışarıda bırakmamak için) — bu yüzden bir "sayfa" bazen
// HABER_SAYFA_BOYUTU'ndan az onaylı haber döndürebilir; hepsiYuklendiMi ham
// belge sayısına bakıyor, "daha fazla yükle" gerektiğinde hep doğru çalışır.
const HABER_SAYFA_BOYUTU = 20

export async function haberSayfasiGetir(kategori, sonBelge = null) {
  const kisitlar = []
  if (kategori) kisitlar.push(where('kategori', '==', kategori))
  kisitlar.push(orderBy('tarih', 'desc'))
  if (sonBelge) kisitlar.push(startAfter(sonBelge))
  kisitlar.push(limit(HABER_SAYFA_BOYUTU))

  const snap = await getDocs(query(collection(db, 'haberler'), ...kisitlar))
  return {
    liste: snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(gorunurMu),
    sonBelge: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
    hepsiYuklendiMi: snap.docs.length < HABER_SAYFA_BOYUTU,
  }
}

// Haber detay sayfasındaki "İlgili Haberler" şeridi için — aynı kategoriden,
// bu haber hariç, en yeni birkaç haber.
export async function benzerHaberleriGetir(kategori, haricTutulanId, limitSayisi = 5) {
  const q = query(collection(db, 'haberler'), where('kategori', '==', kategori))
  const snap = await getDocs(q)
  const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((h) => h.id !== haricTutulanId && gorunurMu(h))
  liste.sort((a, b) => (b.tarih?.toMillis?.() || 0) - (a.tarih?.toMillis?.() || 0))
  return liste.slice(0, limitSayisi)
}

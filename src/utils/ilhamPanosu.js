import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, startAfter, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export const ILHAM_KATEGORILERI = ['Film', 'Dizi', 'Kitap', 'Oyuncu', 'Gezi', 'Etkinlik', 'Sanat', 'Felsefe', 'Psikoloji']

export async function ilhamEkle(
  kullanici,
  profil,
  {
    url,
    kategori,
    not: notMetni,
    iliskiliTur,
    iliskiliDisId,
    iliskiliBaslik,
    iliskiliPosterUrl,
    iliskiliYil,
    iliskiliAlt,
    geziUlkeKodu,
    geziUlkeAdi,
    geziUlkeIso,
    geziKonum,
    geziEnlem,
    geziBoylem,
    geziKampanya,
  }
) {
  await addDoc(collection(db, 'ilhamPanosu'), {
    url,
    kategori: kategori || 'Film',
    not: notMetni || '',
    iliskiliTur: iliskiliTur || null,
    iliskiliDisId: iliskiliDisId ?? null,
    iliskiliBaslik: iliskiliBaslik || '',
    iliskiliPosterUrl: iliskiliPosterUrl || '',
    iliskiliYil: iliskiliYil || '',
    iliskiliAlt: iliskiliAlt || '',
    geziUlkeKodu: kategori === 'Gezi' ? geziUlkeKodu || '' : '',
    geziUlkeAdi: kategori === 'Gezi' ? geziUlkeAdi || '' : '',
    geziUlkeIso: kategori === 'Gezi' ? geziUlkeIso || '' : '',
    geziKonum: kategori === 'Gezi' ? geziKonum || '' : '',
    geziEnlem: kategori === 'Gezi' ? geziEnlem ?? null : null,
    geziBoylem: kategori === 'Gezi' ? geziBoylem ?? null : null,
    geziKampanya: kategori === 'Gezi' ? geziKampanya || '' : '',
    paylasanId: kullanici.uid,
    paylasanAdi: profil?.adSoyad || kullanici.displayName || 'İsimsiz',
    eklemeTarihi: serverTimestamp(),
  })
}

// Daha önce girilmiş Gezi mekanlarının listesi — formda otomatik tamamlama
// (datalist) için. Aynı yerin "Kapadokya" / "kapadokya" gibi farklı
// yazımlarla çoğalmasını tamamen engellemez ama en azından öneriyor.
export async function geziMekanlariGetir() {
  const q = query(collection(db, 'ilhamPanosu'), where('kategori', '==', 'Gezi'))
  const snap = await getDocs(q)
  const mekanlar = new Set()
  snap.docs.forEach((d) => {
    const konum = d.data().geziKonum
    if (konum) mekanlar.add(konum)
  })
  return [...mekanlar].sort((a, b) => a.localeCompare(b, 'tr-TR'))
}

// Daha önce girilmiş Gezi kampanya/tur adlarının listesi — aynı mantık.
export async function geziKampanyalariGetir() {
  const q = query(collection(db, 'ilhamPanosu'), where('kategori', '==', 'Gezi'))
  const snap = await getDocs(q)
  const kampanyalar = new Set()
  snap.docs.forEach((d) => {
    const kampanya = d.data().geziKampanya
    if (kampanya) kampanyalar.add(kampanya)
  })
  return [...kampanyalar].sort((a, b) => a.localeCompare(b, 'tr-TR'))
}

// iliskiliTur değerine göre eser/kişi sayfasının route'unu üretir — İlham
// Panosu kartlarında "ilgili film/dizi/kitap/oyuncu" rozetini tıklanabilir
// yapmak için tek yerden kullanılıyor.
export function iliskiliLink(iliskiliTur, iliskiliDisId) {
  if (!iliskiliTur || iliskiliDisId == null) return null
  if (iliskiliTur === 'sinema') return `/film/${iliskiliDisId}`
  if (iliskiliTur === 'dizi') return `/dizi/${iliskiliDisId}`
  if (iliskiliTur === 'kitap') return `/kitap/${iliskiliDisId}`
  if (iliskiliTur === 'kisi') return `/kisi/${iliskiliDisId}`
  return null
}

// Belirli bir eser/kişi sayfasına (film/dizi/kitap/oyuncu) BAĞLANMIŞ
// paylaşımlar — genel kategori akışından farklı olarak, "bu spesifik filme
// dair" gösterim için.
export async function ilhamlariEserIcinGetir(tur, disId) {
  const q = query(collection(db, 'ilhamPanosu'), where('iliskiliTur', '==', tur), where('iliskiliDisId', '==', disId))
  const snap = await getDocs(q)
  const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  liste.sort((a, b) => (b.eklemeTarihi?.toMillis?.() || 0) - (a.eklemeTarihi?.toMillis?.() || 0))
  return liste
}

// Seyir Panosu'nda hem Tümünü Gör listesinde hem önizleme widget'larında
// kullanılan sayfalanmış sorgu — kategori filtresi opsiyonel, eklemeTarihi'ne
// göre en yeniden eskiye sıralı. sonrakiBelge verilirse ondan sonrasını
// getirir ("Daha Fazla Yükle" akışı için).
export async function ilhamlariSayfalanmisGetir(kategori, limitSayisi = 20, sonrakiBelge = null) {
  const kosullar = [orderBy('eklemeTarihi', 'desc'), limit(limitSayisi + 1)]
  if (kategori) kosullar.unshift(where('kategori', '==', kategori))
  if (sonrakiBelge) kosullar.push(startAfter(sonrakiBelge))
  const q = query(collection(db, 'ilhamPanosu'), ...kosullar)
  const snap = await getDocs(q)
  const belgeler = snap.docs.slice(0, limitSayisi)
  return {
    liste: belgeler.map((d) => ({ id: d.id, ...d.data() })),
    sonBelge: belgeler[belgeler.length - 1] || null,
    dahaVarMi: snap.docs.length > limitSayisi,
  }
}

export async function ilhamlariGetir(kategori, limitSayisi) {
  const q = kategori
    ? query(collection(db, 'ilhamPanosu'), where('kategori', '==', kategori))
    : query(collection(db, 'ilhamPanosu'))
  const snap = await getDocs(q)
  const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  liste.sort((a, b) => (b.eklemeTarihi?.toMillis?.() || 0) - (a.eklemeTarihi?.toMillis?.() || 0))
  return limitSayisi ? liste.slice(0, limitSayisi) : liste
}

export async function ilhamSil(id) {
  await deleteDoc(doc(db, 'ilhamPanosu', id))
}

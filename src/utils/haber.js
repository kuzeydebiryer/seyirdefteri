import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, startAfter, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

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
  kullanici,
}) {
  await addDoc(collection(db, 'haberler'), {
    kategori, // 'sinema' | 'dizi' | 'kisi'
    baslik,
    icerik,
    gorselUrl: gorselUrl || '',
    ilgiliTur: ilgiliTur || null,
    ilgiliDisId: ilgiliDisId || null,
    ilgiliBaslik: ilgiliBaslik || '',
    ilgiliPosterUrl: ilgiliPosterUrl || '',
    fragmanId: fragmanId || '',
    ekleyenId: kullanici.uid,
    ekleyenAdi: kullanici.displayName || 'İsimsiz',
    tarih: serverTimestamp(),
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

export async function haberDuzenle(haberId, { baslik, icerik, gorselUrl, fragmanId }) {
  await updateDoc(doc(db, 'haberler', haberId), { baslik, icerik, gorselUrl: gorselUrl || '', fragmanId: fragmanId || '' })
}

// Haberler hub sayfası (/haberler) için — önceden tüm koleksiyonu (ya da
// tüm kategoriyi) TEK seferde, hiç sınır olmadan çekiyordu. Haber sayısı
// arttıkça her sayfa ziyaretinin okuma maliyeti de artacaktı. Şimdi gerçek
// Firestore sayfalaması var — 20'şer 20'şer, "Daha Fazla Yükle" ile devam
// ediyor. sonBelge: bir önceki sayfanın son dokümanı (startAfter için).
const HABER_SAYFA_BOYUTU = 20

export async function haberSayfasiGetir(kategori, sonBelge = null) {
  const kisitlar = []
  if (kategori) kisitlar.push(where('kategori', '==', kategori))
  kisitlar.push(orderBy('tarih', 'desc'))
  if (sonBelge) kisitlar.push(startAfter(sonBelge))
  kisitlar.push(limit(HABER_SAYFA_BOYUTU))

  const snap = await getDocs(query(collection(db, 'haberler'), ...kisitlar))
  return {
    liste: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    sonBelge: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
    hepsiYuklendiMi: snap.docs.length < HABER_SAYFA_BOYUTU,
  }
}

// Haber detay sayfasındaki "İlgili Haberler" şeridi için — aynı kategoriden,
// bu haber hariç, en yeni birkaç haber.
export async function benzerHaberleriGetir(kategori, haricTutulanId, limitSayisi = 5) {
  const q = query(collection(db, 'haberler'), where('kategori', '==', kategori))
  const snap = await getDocs(q)
  const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((h) => h.id !== haricTutulanId)
  liste.sort((a, b) => (b.tarih?.toMillis?.() || 0) - (a.tarih?.toMillis?.() || 0))
  return liste.slice(0, limitSayisi)
}

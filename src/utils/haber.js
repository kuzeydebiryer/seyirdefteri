import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
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

// Haberler hub sayfası (/haberler) için — kategori verilmezse hepsini
// getirir, verilirse sadece o kategoriyi. useHaberler hook'undaki mantığın
// aynısı, tek fark opsiyonel kategori filtresi.
export async function tumHaberleriGetir(kategori) {
  const q = kategori ? query(collection(db, 'haberler'), where('kategori', '==', kategori)) : query(collection(db, 'haberler'))
  const snap = await getDocs(q)
  const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  liste.sort((a, b) => (b.tarih?.toMillis?.() || 0) - (a.tarih?.toMillis?.() || 0))
  return liste
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

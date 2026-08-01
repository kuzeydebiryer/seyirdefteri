// Kitap Kataloğu (Faz 1 — Dahili SSOT)
//
// Sorun: Google Books API, Türkçe kitaplarda çoğu zaman sadece başlık + yazar
// döndürüyor (kapak, özet, tür, sayfa sayısı boş kalıyor) çünkü Türk yayınevleri
// Google'ın taradığı feed'lerde neredeyse hiç yok.
//
// Çözüm: Dış API'lere her seferinde canlı bağımlı kalmak yerine, bir kitap ilk
// kez görüldüğünde (arama sonucundan seçildiğinde ya da detay sayfası açıldığında)
// Google Books + Open Library verisi birleştirilip Firestore'daki `kitaplar/{id}`
// koleksiyonuna KALICI olarak yazılır. Bir sonraki ziyarette hiç dış API'ye
// gidilmeden doğrudan Firestore'dan okunur — hem Türkçe veri kalitesi zamanla
// (kullanıcı/AR düzeltmeleriyle, Faz 2) artar hem de Firestore/istek maliyeti düşer.
//
// ID şeması bilerek DEĞİŞTİRİLMEDİ: `id` hâlâ Google Books volume ID'si.
// Böylece favoriler, izlenecekler, eserPuanlari, gonderiler, /kitap/:id rotası
// gibi mevcut hiçbir yer dokunulmadan çalışmaya devam ediyor.

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

function kitapRef(id) {
  return doc(db, 'kitaplar', id)
}

// --- Google Books -----------------------------------------------------

async function googleVolumeGetir(id) {
  const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
  const url = `https://www.googleapis.com/books/v1/volumes/${id}?${anahtarParcasi}`
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`)
  return data
}

function isbnleriCikar(industryIdentifiers) {
  const liste = industryIdentifiers || []
  const isbn13 = liste.find((i) => i.type === 'ISBN_13')?.identifier || ''
  const isbn10 = liste.find((i) => i.type === 'ISBN_10')?.identifier || ''
  return { isbn13, isbn10 }
}

function googleVerisiniNormallestir(data) {
  const v = data.volumeInfo || {}
  const { isbn13, isbn10 } = isbnleriCikar(v.industryIdentifiers)
  return {
    baslik: v.title || '',
    yazar: (v.authors || []).join(', '),
    yil: v.publishedDate ? v.publishedDate.slice(0, 4) : '',
    posterUrl: (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://'),
    ozet: v.description || '',
    turler: (v.categories || []).join(', '),
    sayfaSayisi: v.pageCount || null,
    yayinevi: v.publisher || '',
    dbPuan: v.averageRating ? Number(v.averageRating.toFixed(1)) : null,
    isbn13,
    isbn10,
  }
}

// --- Open Library (Türkçe kapak/özet/tür zenginleştirme) --------------
// API anahtarı gerektirmez, ISBN üzerinden çalışır. Google'da eksik kalan
// kapak/özet/tür/sayfa sayısı alanlarını doldurmak için "boşluk doldurucu"
// olarak kullanılır — Google verisinin üzerine yazmaz, sadece boş alanları tamamlar.
async function openLibraryZenginlestir(isbn13, isbn10) {
  const isbn = isbn13 || isbn10
  if (!isbn) return null
  try {
    const kitapRes = await fetch(`https://openlibrary.org/isbn/${isbn}.json`)
    if (!kitapRes.ok) return null
    const kitapData = await kitapRes.json()

    let ozet = ''
    let turler = []
    const workKey = kitapData.works?.[0]?.key
    if (workKey) {
      try {
        const workRes = await fetch(`https://openlibrary.org${workKey}.json`)
        if (workRes.ok) {
          const workData = await workRes.json()
          ozet = typeof workData.description === 'string' ? workData.description : workData.description?.value || ''
          turler = (workData.subjects || []).slice(0, 6)
        }
      } catch {
        // Work verisi alınamazsa sorun değil, isbn seviyesindeki veriyle devam
      }
    }

    const kapakId = kitapData.covers?.[0]
    return {
      posterUrl: kapakId ? `https://covers.openlibrary.org/b/id/${kapakId}-L.jpg` : '',
      ozet,
      turler: turler.join(', '),
      sayfaSayisi: kitapData.number_of_pages || null,
      yayinevi: (kitapData.publishers || [])[0] || '',
    }
  } catch (err) {
    console.warn('Open Library zenginleştirme başarısız:', err.message)
    return null
  }
}

// Google verisini temel alıp Open Library'den SADECE boş alanları doldurur.
function birlestir(google, openLibrary) {
  if (!openLibrary) return { ...google, kaynaklar: { google: true, openLibrary: false } }
  return {
    ...google,
    posterUrl: google.posterUrl || openLibrary.posterUrl || '',
    ozet: google.ozet || openLibrary.ozet || '',
    turler: google.turler || openLibrary.turler || '',
    sayfaSayisi: google.sayfaSayisi ?? openLibrary.sayfaSayisi ?? null,
    yayinevi: google.yayinevi || openLibrary.yayinevi || '',
    kaynaklar: { google: true, openLibrary: true },
  }
}

// --- Ana giriş noktası --------------------------------------------------

// Bir kitabı getirir. Önce dahili katalogda (Firestore) arar; varsa dış API'ye
// hiç gitmeden döndürür. Yoksa Google Books + Open Library'yi birleştirip
// kalıcı olarak Firestore'a yazar ve döndürür.
export async function kitapGetir(id) {
  const ref = kitapRef(id)
  const mevcut = await getDoc(ref)
  if (mevcut.exists()) {
    return { id, ...mevcut.data() }
  }

  const googleData = await googleVolumeGetir(id)
  const google = googleVerisiniNormallestir(googleData)
  const openLibrary = await openLibraryZenginlestir(google.isbn13, google.isbn10)
  const birlesik = birlestir(google, openLibrary)

  await setDoc(ref, {
    ...birlesik,
    dogrulanmis: false,
    olusturulmaTarihi: serverTimestamp(),
    sonGuncellemeTarihi: serverTimestamp(),
  })

  return { id, ...birlesik }
}

// GonderiEkle'de arama sonucundan bir kitap seçildiğinde çağrılır: elimizde
// zaten Google'ın arama sonucu (item) var, tekrar volume isteği atmadan onu
// normalize edip Open Library ile zenginleştirir ve kalıcı yazar. Böylece
// hem arama hem detay sayfası aynı zengin veriye kavuşur.
export async function kitapAramaSonucundanKaydet(item) {
  const id = item.id
  const ref = kitapRef(id)
  const mevcut = await getDoc(ref)
  if (mevcut.exists()) {
    return { id, ...mevcut.data() }
  }

  const google = googleVerisiniNormallestir(item)
  const openLibrary = await openLibraryZenginlestir(google.isbn13, google.isbn10)
  const birlesik = birlestir(google, openLibrary)

  await setDoc(ref, {
    ...birlesik,
    dogrulanmis: false,
    olusturulmaTarihi: serverTimestamp(),
    sonGuncellemeTarihi: serverTimestamp(),
  })

  return { id, ...birlesik }
}

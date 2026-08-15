// Kitap Kataloğu (Faz 1 — Dahili SSOT, Faz 2 — Kullanıcı Düzenlemesi)
//
// Sorun: Google Books API, Türkçe kitaplarda çoğu zaman sadece başlık + yazar
// döndürüyor (kapak, özet, tür, sayfa sayısı boş kalıyor) çünkü Türk yayınevleri
// Google'ın taradığı feed'lerde neredeyse hiç yok.
//
// Çözüm: Dış API'lere her seferinde canlı bağımlı kalmak yerine, bir kitap ilk
// kez görüldüğünde (arama sonucundan seçildiğinde ya da detay sayfası açıldığında)
// Google Books + Open Library verisi birleştirilip Firestore'daki `kitaplar/{id}`
// koleksiyonuna KALICI olarak yazılır. Bir sonraki ziyarette hiç dış API'ye
// gidilmeden doğrudan Firestore'dan okunur. Faz 2 ile kullanıcılar eksik/yanlış
// kalan alanları elle düzeltebiliyor — düzeltmeler kalıcı katalogda birikiyor.
//
// ID şeması bilerek DEĞİŞTİRİLMEDİ: `id` hâlâ Google Books volume ID'si.
// Böylece favoriler, izlenecekler, eserPuanlari, gonderiler, /kitap/:id rotası
// gibi mevcut hiçbir yer dokunulmadan çalışmaya devam ediyor.

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
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
// API anahtarı gerektirmez. İki katmanlı çalışır:
//   1) ISBN üzerinden TAM baskıyı bulmayı dener (en doğru veri — o Türkçe
//      baskının gerçek sayfa sayısı, kapağı vb.)
//   2) ISBN'de bulunamayan ya da eksik kalan alanlar için başlık+yazar
//      araması yapar ve İSTER Türkçe baskıdan ister başka bir baskıdan olsun,
//      eşleşen ilk kayıttan yaklaşık bir değer alır (örn. sayfa sayısı) —
//      hiç veri olmamasından iyidir, sadece bir tahmindir.
// İkisi de Google verisinin üzerine yazmaz, sadece boş alanları tamamlar.
async function openLibraryIsbnIle(isbn) {
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
    console.warn('Open Library (ISBN) zenginleştirme başarısız:', err.message)
    return null
  }
}

async function openLibraryBaslikIle(baslik, yazar) {
  if (!baslik) return null
  try {
    const parcalar = [`title=${encodeURIComponent(baslik)}`]
    if (yazar) parcalar.push(`author=${encodeURIComponent(yazar.split(',')[0])}`)
    const res = await fetch(`https://openlibrary.org/search.json?${parcalar.join('&')}&limit=5`)
    if (!res.ok) return null
    const data = await res.json()
    const eslesen = (data.docs || []).find((d) => d.number_of_pages_median || d.cover_i) || data.docs?.[0]
    if (!eslesen) return null
    return {
      posterUrl: eslesen.cover_i ? `https://covers.openlibrary.org/b/id/${eslesen.cover_i}-L.jpg` : '',
      ozet: '',
      turler: (eslesen.subject || []).slice(0, 6).join(', '),
      sayfaSayisi: eslesen.number_of_pages_median || null,
      yayinevi: (eslesen.publisher || [])[0] || '',
    }
  } catch (err) {
    console.warn('Open Library (başlık araması) zenginleştirme başarısız:', err.message)
    return null
  }
}

async function openLibraryZenginlestir(google) {
  const isbn = google.isbn13 || google.isbn10
  const isbnSonucu = isbn ? await openLibraryIsbnIle(isbn) : null

  // ISBN sonucu varsa ama hâlâ boş kalan alanlar varsa, başlık araması ile
  // TAMAMLAYICI olarak devam et (isbnSonucu'nun üzerine yazmaz).
  const eksikVarMi = !isbnSonucu || !isbnSonucu.sayfaSayisi || !isbnSonucu.posterUrl || !isbnSonucu.ozet
  const baslikSonucu = eksikVarMi ? await openLibraryBaslikIle(google.baslik, google.yazar) : null

  if (!isbnSonucu && !baslikSonucu) return null
  return {
    posterUrl: isbnSonucu?.posterUrl || baslikSonucu?.posterUrl || '',
    ozet: isbnSonucu?.ozet || baslikSonucu?.ozet || '',
    turler: isbnSonucu?.turler || baslikSonucu?.turler || '',
    sayfaSayisi: isbnSonucu?.sayfaSayisi ?? baslikSonucu?.sayfaSayisi ?? null,
    yayinevi: isbnSonucu?.yayinevi || baslikSonucu?.yayinevi || '',
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

// --- Ana giriş noktası (Faz 1) -------------------------------------------

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
  const openLibrary = await openLibraryZenginlestir(google)
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
  const openLibrary = await openLibraryZenginlestir(google)
  const birlesik = birlestir(google, openLibrary)

  await setDoc(ref, {
    ...birlesik,
    dogrulanmis: false,
    olusturulmaTarihi: serverTimestamp(),
    sonGuncellemeTarihi: serverTimestamp(),
  })

  return { id, ...birlesik }
}

// --- Faz 2: Kullanıcı düzenlemesi ---------------------------------------
// Google/Open Library otomatik doldurmasının eksik/yanlış bıraktığı alanları
// kullanıcıların düzeltebilmesi için. Her değişiklik `duzenlemeGecmisi` alt
// koleksiyonuna loglanır (kim, ne zaman, hangi alan, eski/yeni değer) — bu,
// ileride bir moderasyon paneli (Faz 3) kurulacaksa geriye dönük kanıt sağlar.
// DÜZENLENEBİLİR ALANLAR bilinçli olarak sınırlı tutuldu: dbPuan (Google puanı)
// gibi dışarıdan gelen "objektif" alanlara kullanıcı müdahalesi açılmadı.
const DUZENLENEBILIR_ALANLAR = ['baslik', 'yazar', 'posterUrl', 'ozet', 'turler', 'sayfaSayisi', 'yayinevi']

export async function kitapGuncelle(id, yeniAlanlar, kullanici) {
  const ref = kitapRef(id)
  const mevcut = await getDoc(ref)
  const eskiVeri = mevcut.exists() ? mevcut.data() : {}

  const temizlenmis = {}
  const degisenAlanlar = []
  for (const alan of DUZENLENEBILIR_ALANLAR) {
    if (!(alan in yeniAlanlar)) continue
    const yeniDeger =
      alan === 'sayfaSayisi' ? (yeniAlanlar[alan] ? Number(yeniAlanlar[alan]) : null) : yeniAlanlar[alan] || ''
    const eskiDeger = eskiVeri[alan] ?? (alan === 'sayfaSayisi' ? null : '')
    if (yeniDeger !== eskiDeger) {
      temizlenmis[alan] = yeniDeger
      degisenAlanlar.push({ alan, eskiDeger, yeniDeger })
    }
  }

  if (degisenAlanlar.length === 0) return { id, ...eskiVeri }

  await setDoc(
    ref,
    {
      ...temizlenmis,
      sonDuzenleyenUid: kullanici.uid,
      sonGuncellemeTarihi: serverTimestamp(),
      kaynaklar: { ...(eskiVeri.kaynaklar || {}), kullanici: true },
    },
    { merge: true }
  )

  await addDoc(collection(db, 'kitaplar', id, 'duzenlemeGecmisi'), {
    kullaniciId: kullanici.uid,
    degisiklikler: degisenAlanlar,
    tarih: serverTimestamp(),
  })

  return { id, ...eskiVeri, ...temizlenmis }
}

// --- Faz 3: Hafif katalog bakım kuyruğu ---------------------------------
// Seyirdefteri küçük/davetli bir topluluk olduğu için ayrı bir "admin" rolü
// kurmuyoruz — herkes güvenilir kabul ediliyor (mevcut Firestore Rules deseniyle
// tutarlı). Bu yüzden Faz 3, karmaşık bir yönetici paneli değil, giriş yapmış
// HERKESİN görebildiği basit bir "henüz doğrulanmamış kitaplar" kuyruğu:
// en son dokunulan (muhtemelen en yeni eklenen) kitaplar önce gösterilir.
export async function dogrulanmamisKitaplariGetir(limitSayisi = 30) {
  const q = query(
    collection(db, 'kitaplar'),
    where('dogrulanmis', '==', false),
    orderBy('sonGuncellemeTarihi', 'desc'),
    limit(limitSayisi)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Bir kitabın kaç kez düzenlendiğini (duzenlemeGecmisi kayıt sayısını) döndürür —
// bakım kuyruğunda "bu kayıt hiç dokunulmamış mı, çok mu tartışılmış" göstergesi.
export async function kitapDuzenlemeSayisi(id) {
  const snap = await getDocs(collection(db, 'kitaplar', id, 'duzenlemeGecmisi'))
  return snap.size
}

export async function kitapDogrula(id, kullanici) {
  await setDoc(
    kitapRef(id),
    {
      dogrulanmis: true,
      dogrulayanUid: kullanici.uid,
      dogrulamaTarihi: serverTimestamp(),
    },
    { merge: true }
  )
}

// Zaten katalogda olan ama eksik kalan (özellikle sayfaSayisi/posterUrl/ozet)
// bir kaydı, Open Library'nin ikinci katmanı olan başlık+yazar araması dahil
// olmak üzere YENİDEN dener. Sadece hâlâ boş olan alanları doldurur, kullanıcı
// düzeltmesi yapılmış alanların üzerine yazmaz. Bakım kuyruğunda "🔄 Yeniden
// Dene" butonu için kullanılıyor.
export async function kitapYenidenZenginlestir(id) {
  const ref = kitapRef(id)
  const mevcut = await getDoc(ref)
  const eskiVeri = mevcut.exists() ? mevcut.data() : {}

  let isbn13 = eskiVeri.isbn13
  let isbn10 = eskiVeri.isbn10
  if (!isbn13 && !isbn10) {
    try {
      const googleData = await googleVolumeGetir(id)
      const g = googleVerisiniNormallestir(googleData)
      isbn13 = g.isbn13
      isbn10 = g.isbn10
    } catch {
      // ISBN alınamazsa başlık araması yine de denenir
    }
  }

  const openLibrary = await openLibraryZenginlestir({
    isbn13,
    isbn10,
    baslik: eskiVeri.baslik,
    yazar: eskiVeri.yazar,
  })
  if (!openLibrary) return { id, ...eskiVeri }

  const doldurulacak = {}
  if (!eskiVeri.posterUrl && openLibrary.posterUrl) doldurulacak.posterUrl = openLibrary.posterUrl
  if (!eskiVeri.ozet && openLibrary.ozet) doldurulacak.ozet = openLibrary.ozet
  if (!eskiVeri.turler && openLibrary.turler) doldurulacak.turler = openLibrary.turler
  if (!eskiVeri.sayfaSayisi && openLibrary.sayfaSayisi) doldurulacak.sayfaSayisi = openLibrary.sayfaSayisi
  if (!eskiVeri.yayinevi && openLibrary.yayinevi) doldurulacak.yayinevi = openLibrary.yayinevi
  if (isbn13 && !eskiVeri.isbn13) doldurulacak.isbn13 = isbn13
  if (isbn10 && !eskiVeri.isbn10) doldurulacak.isbn10 = isbn10

  if (Object.keys(doldurulacak).length === 0) return { id, ...eskiVeri }

  await setDoc(ref, { ...doldurulacak, sonGuncellemeTarihi: serverTimestamp() }, { merge: true })
  return { id, ...eskiVeri, ...doldurulacak }
}

// Elle Kitap Ekle — Google Books'ta hiç bulunamayan (ya da bulunsa bile
// yanlış/eksik baskısı görünen) kitaplar için. Türkçe basımlarda özellikle
// yaygın bir sorun: aynı başlıkta çok sayıda sonuç geliyor ama hangisinin
// hangi yayınevi/dile ait olduğu arama listesinde görünmüyor, ya da aranan
// baskı Google'ın taradığı feed'lerde hiç yok. Bu fonksiyon, Google Books
// ID'si olmayan bir "sentetik" ID (el_...) ile doğrudan dahili kataloğa yazar
// — sonrasında bu kitap, sistemin geri kalanında normal bir kitap gibi
// davranır (favorilere eklenebilir, puanlanabilir, listeye eklenebilir vb.).
export async function kitapElleEkle({ baslik, yazar, yayinevi, yil, ozet, turler, sayfaSayisi, posterUrl }, kullanici) {
  const id = `el_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  const veri = {
    baslik,
    yazar: yazar || '',
    yayinevi: yayinevi || '',
    yil: yil || '',
    ozet: ozet || '',
    turler: turler || '',
    sayfaSayisi: sayfaSayisi ? Number(sayfaSayisi) : null,
    posterUrl: posterUrl || '',
    dbPuan: null,
    isbn13: '',
    isbn10: '',
    kaynaklar: { kullanici: true },
    dogrulanmis: true, // elle girildiği için otomatik doğrulanmış sayılır, bakım kuyruğuna düşmesin
    ekleyenUid: kullanici?.uid || null,
    olusturulmaTarihi: serverTimestamp(),
    sonGuncellemeTarihi: serverTimestamp(),
  }
  await setDoc(kitapRef(id), veri)
  return { id, ...veri }
}

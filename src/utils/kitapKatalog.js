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
import { aksansizKucultulmus } from './metinNormallestir.js'
import { turkceKitapAra } from './turkceKitapVeriTabani.js'
import { isbnIleMevcutKitabiBul } from './kitapIsbnEslestir.js'

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
    baslikNormalize: aksansizKucultulmus(birlesik.baslik),
    yazarNormalize: aksansizKucultulmus(birlesik.yazar),
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
//
// KÖPRÜ/TEKİLLEŞTİRME: Aynı fiziksel kitap, statik 67 bin veri setinden
// (kendi ID sistemi) VE Google Books'tan (kendi ID sistemi) AYRI AYRI
// kaydedilebiliyordu — "aynı kitaptan iki farklı sayfa" sorununun kök
// sebebi buydu. Kaydetmeden önce, aynı ISBN'e sahip BAŞKA bir kayıt var mı
// diye bakıp varsa ONU kullanıyoruz — yeni bir kopya oluşturmuyoruz.
export async function kitapAramaSonucundanKaydet(item) {
  const id = item.id
  const ref = kitapRef(id)
  const mevcut = await getDoc(ref)
  if (mevcut.exists()) {
    return { id, ...mevcut.data() }
  }

  const google = googleVerisiniNormallestir(item)
  const isbnAdayi = google.isbn13 || google.isbn10
  if (isbnAdayi) {
    const esdeger = await isbnIleMevcutKitabiBul(isbnAdayi)
    if (esdeger) return esdeger
  }

  const openLibrary = await openLibraryZenginlestir(google)
  const birlesik = birlestir(google, openLibrary)

  await setDoc(ref, {
    ...birlesik,
    baslikNormalize: aksansizKucultulmus(birlesik.baslik),
    yazarNormalize: aksansizKucultulmus(birlesik.yazar),
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

  // "yazar" değiştiyse, aksan-duyarsız eşleştirme alanını da güncel tut
  // (bkz. metinNormallestir.js) — aksi halde canliKataloktaYazarinKitaplariniGetir
  // eski yazarın normalize alanına takılı kalır. Aynısı "baslik" için de geçerli.
  if ('yazar' in temizlenmis) {
    temizlenmis.yazarNormalize = aksansizKucultulmus(temizlenmis.yazar)
  }
  if ('baslik' in temizlenmis) {
    temizlenmis.baslikNormalize = aksansizKucultulmus(temizlenmis.baslik)
  }

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
    baslikNormalize: aksansizKucultulmus(baslik),
    yazar: yazar || '',
    yazarNormalize: aksansizKucultulmus(yazar || ''),
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

// Canlı Firestore kataloğunda (dahili SSOT — elle eklenenler, Google Books
// aramasından kaydedilenler, tekil ziyaretlerde önbelleğe alınan 67 bin
// kayıtlı kitaplar dahil) bu yazara ait kitapları bulur. "Yazarın Kitapları"
// listesi (yazarinKitaplariniGetir, turkceKitapVeriTabani.js) sadece STATİK
// 67 bin kayıtlı veri setini tarıyor — canlı eklenen bir kitaptan hiç haberi
// yok. Bu fonksiyon o boşluğu dolduruyor; ikisi birlikte kullanılıyor.
// NOT: Firestore eşitlik sorgusu büyük/küçük harfe duyarlı — yazar adı yazar
// sayfasındaki adla BİREBİR aynı yazılmışsa bulunur (yazar sayfası zaten
// formu bu adla önceden dolduruyor, bkz. KitapyurdundanKitapEkle.jsx).
export async function canliKataloktaYazarinKitaplariniGetir(yazarAdi) {
  // Hem eski (sadece "yazar" alanı, aksana duyarlı) hem yeni ("yazarNormalize"
  // alanı da yazılan) kayıtları kapsasın diye iki sorgu birden atılıyor —
  // bkz. utils/metinNormallestir.js'teki not (aynı Nobel/Türkçe Kitap Veri
  // Tabanı yazım farkı burada da geçerli).
  const [tamEslesme, normSnap] = await Promise.all([
    getDocs(query(collection(db, 'kitaplar'), where('yazar', '==', yazarAdi))),
    getDocs(query(collection(db, 'kitaplar'), where('yazarNormalize', '==', aksansizKucultulmus(yazarAdi)))),
  ])
  const gorulenler = new Set()
  const sonuclar = []
  ;[...tamEslesme.docs, ...normSnap.docs].forEach((d) => {
    if (gorulenler.has(d.id)) return
    gorulenler.add(d.id)
    sonuclar.push({ id: d.id, ...d.data() })
  })
  return sonuclar
}

// "Kitap Ara" da aynı sebeple sadece statik veri setini tarıyor — canlı
// eklenen kitaplar oraya da hiç düşmüyordu. Firestore serbest metin araması
// desteklemediği için tam bir çözüm değil, ama en azından BAŞLIĞIN
// BAŞLANGICINA göre eşleşen canlı kayıtları (elle eklenenler dahil) buluyor
// — kullanıcı az önce eklediği kitabı adıyla aradığında artık karşısına çıkar.
//
// AKSAN/BÜYÜK-KÜÇÜK HARF DUYARSIZ: "baslikNormalize" alanına göre arıyor
// (yazar aramasındaki "yazarNormalize" ile aynı mantık — bkz.
// metinNormallestir.js). Bu alan sadece BUNDAN SONRA kaydedilen/düzenlenen
// kitaplarda var, o yüzden ESKİ kayıtları KAÇIRMAMAK için eski ham "baslik"
// alanına göre bir sorgu da PARALEL atılıp sonuçlar birleştiriliyor —
// geriye dönük bir "veri taşıma" scripti çalıştırmaya gerek kalmadan.
export async function canliKataloktaBaslikIleAra(metin, limitSayisi = 20) {
  const normalizeMetin = aksansizKucultulmus(metin)
  const [normalizeSonuc, hamSonuc] = await Promise.all([
    getDocs(
      query(
        collection(db, 'kitaplar'),
        orderBy('baslikNormalize'),
        where('baslikNormalize', '>=', normalizeMetin),
        where('baslikNormalize', '<=', normalizeMetin + '\uf8ff'),
        limit(limitSayisi)
      )
    ),
    getDocs(
      query(collection(db, 'kitaplar'), orderBy('baslik'), where('baslik', '>=', metin), where('baslik', '<=', metin + '\uf8ff'), limit(limitSayisi))
    ),
  ])
  const gorulenler = new Set()
  const sonuclar = []
  ;[...normalizeSonuc.docs, ...hamSonuc.docs].forEach((d) => {
    if (gorulenler.has(d.id)) return
    gorulenler.add(d.id)
    sonuclar.push({ id: d.id, ...d.data() })
  })
  return sonuclar.slice(0, limitSayisi)
}

// KÖKTEN ÇÖZÜM: Sitede kitap arayan 6 farklı yer vardı, 3'ü (Kulüp Önerisi,
// Kişisel/Topluluk Liste, Liste Detay) SADECE Google Books'a gidiyordu —
// statik 67 bin kayıtlı Türkçe veri setine NE DE canlı (elle eklenen/
// zenginleştirilen) kataloğa hiç bakmıyordu. "Veritabanımızda olan kitabı
// bulamıyorum" sorununun kök sebebi buydu. Bu TEK fonksiyon ikisini de
// birleştirip tekilleştiriyor — Google Books'u her arayan bileşen kendi
// çağırmaya devam ediyor (limit/öncelik tercihleri farklı olabildiğinden),
// ama artık hepsi AYNI iç veritabanı taramasını paylaşıyor.
export async function kitapIcVeriTabanindaAra(sorgu, limitSayisi = 10) {
  if (!sorgu?.trim()) return []
  const [statik, canli] = await Promise.all([
    turkceKitapAra(sorgu, limitSayisi),
    canliKataloktaBaslikIleAra(sorgu.trim(), limitSayisi).catch(() => []),
  ])
  const isbnGorulenler = new Set(statik.map((k) => k.isbn).filter(Boolean))
  const canliBenzersiz = canli.filter((k) => !k.isbn13 || !isbnGorulenler.has(k.isbn13))
  return [...statik, ...canliBenzersiz]
}

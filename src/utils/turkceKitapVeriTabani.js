import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'

// Türkçe Kitap Veri Tabanı — Google Books'ta Türkçe baskıların sık sık
// bulunamaması sorununu çözmek için, Kitapyurdu'ndan derlenmiş 67.000+ kitaplık
// bir veri setini (Kaggle) kullanıyoruz. Statik bir JSON dosyası (public/veri/
// turkce-kitaplar.json) olarak servis ediliyor, sadece ilk arama yapıldığında
// bir kez indirilip tarayıcı belleğinde tutuluyor (sonraki aramalar anında).
//
// ÖNEMLİ SINIRLAMA: Bu veri setinde kapak görseli YOK (sadece ürün sayfası
// linki var). Bir sonuç seçildiğinde ISBN üzerinden Google Books'tan SADECE
// kapak görseli çekmeyi deniyoruz (bulunamazsa kapaksız kaydediliyor).
//
// Açıklama (özet) metni parçalanmış ayrı dosyalarda tutuluyor — bkz. aşağıdaki
// aciklamaGetir(). Bir kitap seçildiğinde tam açıklaması otomatik çekilip
// kaydediliyor.
//
// Satır formatı (bilerek dizi, obje değil — 67 bin obje yerine 67 bin dizi
// önemli bir dosya boyutu tasarrufu sağlıyor):
// [baslik, yazar, yayinevi, isbn, yil, sayfaSayisi, kategori, url]

// Açıklamalar (Kitap Açıklaması) 80 parçaya bölünmüş halde ayrı dosyalarda
// duruyor (public/veri/aciklamalar/{0-79}.json) — 67.000 kitabın TAMAMININ
// açıklamasını tek dosyada tutmak ~28MB'a (gzip ~11MB) çıkıyordu. Parçalama
// sayesinde bir kitap seçildiğinde SADECE o kitabın bulunduğu tek parça
// (~750KB, gzip ~300KB) indiriliyor — tüm veri hiç indirilmiyor.
const PARCA_SAYISI = 80
const parcaCache = {}

async function aciklamaGetir(indeks) {
  const parcaNo = indeks % PARCA_SAYISI
  if (!parcaCache[parcaNo]) {
    parcaCache[parcaNo] = fetch(`/veri/aciklamalar/${parcaNo}.json`)
      .then((res) => res.json())
      .catch(() => ({}))
  }
  const parca = await parcaCache[parcaNo]
  return parca[String(indeks)] || ''
}

async function veriyiYukle() {
  if (veriCache) return veriCache
  if (!yuklemePromise) {
    yuklemePromise = fetch('/veri/turkce-kitaplar.json')
      .then((res) => res.json())
      .then((veri) => {
        veriCache = veri
        return veri
      })
  }
  return yuklemePromise
}

function satiriNesneyeGevir([baslik, yazar, yayinevi, isbn, yil, sayfaSayisi, kategori, url], indeks) {
  return { id: `tr_${indeks}`, indeks, baslik, yazar, yayinevi, isbn, yil, sayfaSayisi, kategori, url }
}

// Basit bir puanlama: başlıkta TAM eşleşme > başlıkta geçme > yazarda geçme.
// Fuse.js gibi bir kütüphane eklemeden, 67 bin satırlık bu ölçekte yeterince hızlı.
export async function turkceKitapAra(sorgu, enFazla = 15) {
  if (!sorgu?.trim()) return []
  const veri = await veriyiYukle()
  const q = sorgu.trim().toLocaleLowerCase('tr-TR')

  const eslesenler = []
  for (let i = 0; i < veri.length; i++) {
    const [baslik, yazar] = veri[i]
    const baslikKucuk = baslik.toLocaleLowerCase('tr-TR')
    const yazarKucuk = yazar.toLocaleLowerCase('tr-TR')

    let puan = 0
    if (baslikKucuk === q) puan = 100
    else if (baslikKucuk.startsWith(q)) puan = 80
    else if (baslikKucuk.includes(q)) puan = 60
    else if (yazarKucuk.includes(q)) puan = 40

    if (puan > 0) eslesenler.push({ indeks: i, puan })
    if (eslesenler.length > 500) break // çok genel bir sorguda bile makul sürede dursun
  }

  eslesenler.sort((a, b) => b.puan - a.puan)
  return eslesenler.slice(0, enFazla).map(({ indeks }) => satiriNesneyeGevir(veri[indeks], indeks))
}

// Seçilen bir Türkçe veri tabanı kaydını dahili `kitaplar` kataloğuna kaydeder.
// Google Books ID'si olmadığı için `tr_` önekli sentetik bir ID kullanıyoruz
// (Elle Ekle'deki `el_` deseniyle aynı mantık). ISBN varsa, SADECE kapak
// görseli için Google Books'a bir ek istek atılıyor.
export async function turkceKitaptanKaydet(kitap) {
  const id = kitap.isbn ? `tr_${kitap.isbn}` : kitap.id
  const ref = doc(db, 'kitaplar', id)

  const oncekiSnap = await getDoc(ref)
  if (oncekiSnap.exists()) {
    return { id, ...oncekiSnap.data() }
  }

  let posterUrl = ''
  if (kitap.isbn) {
    try {
      const anahtarParcasi = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY ? `&key=${import.meta.env.VITE_GOOGLE_BOOKS_API_KEY}` : ''
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${kitap.isbn}${anahtarParcasi}`)
      const data = await res.json()
      posterUrl = (data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail || '').replace('http://', 'https://')
    } catch {
      // Kapak bulunamazsa sorun değil, kapaksız devam
    }
  }

  const ozet = kitap.indeks != null ? await aciklamaGetir(kitap.indeks) : ''

  const veri = {
    baslik: kitap.baslik,
    yazar: kitap.yazar,
    yayinevi: kitap.yayinevi || '',
    isbn13: kitap.isbn || '',
    isbn10: '',
    yil: kitap.yil || '',
    sayfaSayisi: kitap.sayfaSayisi || null,
    turler: kitap.kategori || '',
    ozet,
    kaynakUrl: kitap.url || '',
    posterUrl,
    dbPuan: null,
    kaynaklar: { kitapyurdu: true },
    dogrulanmis: true, // gerçek bir perakende kaynağından geldiği için doğrulanmış sayılır
    olusturulmaTarihi: serverTimestamp(),
    sonGuncellemeTarihi: serverTimestamp(),
  }
  await setDoc(ref, veri)
  return { id, ...veri }
}

// Yazar Sayfası için: bu veri tabanında TAM olarak bu yazara ait tüm kitaplar.
// Not: Yazar adı serbest metin olarak girildiği için (aynı yazarın farklı
// kayıtlarda farklı yazılmış olma ihtimali var) bu bir TAM eşleşme — bazı
// baskılar farklı yazılmışsa kaçırılabilir, bu bilinen bir sınırlama.
export async function yazarinKitaplariniGetir(yazarAdi) {
  const veri = await veriyiYukle()
  const q = yazarAdi.trim().toLocaleLowerCase('tr-TR')
  const sonuclar = []
  for (let i = 0; i < veri.length; i++) {
    if (veri[i][1].toLocaleLowerCase('tr-TR') === q) {
      sonuclar.push(satiriNesneyeGevir(veri[i], i))
    }
  }
  sonuclar.sort((a, b) => (b.yil || '0').localeCompare(a.yil || '0'))
  return sonuclar
}

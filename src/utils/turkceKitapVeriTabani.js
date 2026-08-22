import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'
import { aksansizKucultulmus } from './metinNormallestir.js'

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
let veriCache = null
let yuklemePromise = null

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
    baslikNormalize: aksansizKucultulmus(kitap.baslik),
    yazar: kitap.yazar,
    yazarNormalize: aksansizKucultulmus(kitap.yazar),
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

// "Günün Kitabı" için rastgele bir kayıt seçer. Veri kalitesi düşük (ISBN'i
// olmayan, çok az sayfalı vb.) kayıtları elemek için basit bir kalite filtresi
// uyguluyoruz — aksi hâlde bazen çok obskür/hatalı kayıtlar çıkabiliyordu.
export async function gununKitabiGetir() {
  const veri = await veriyiYukle()
  for (let deneme = 0; deneme < 10; deneme++) {
    const i = Math.floor(Math.random() * veri.length)
    const [, , , isbn, , sayfaSayisi] = veri[i]
    if (isbn && sayfaSayisi && sayfaSayisi > 30) {
      return satiriNesneyeGevir(veri[i], i)
    }
  }
  return satiriNesneyeGevir(veri[0], 0)
}

// Sayfa Sayısına Göre Meydan Okuma — birkaç hazır meydan okuma türünden
// rastgele biri seçilip ona uyan gerçek bir kitap öneriliyor. Bu bir "takip
// sistemi" değil (kimin tamamladığını kaydetmiyoruz), sadece keşif/ilham
// amaçlı — basit ve düşük riskli tutmak için bilerek böyle.
// Sayfa Sayısına Göre Meydan Okuma — birkaç hazır meydan okuma türünden
// rastgele biri seçilip ona uyan gerçek bir kitap öneriliyor. Bu bir "takip
// sistemi" değil (kimin tamamladığını kaydetmiyoruz), sadece keşif/ilham
// amaçlı — basit ve düşük riskli tutmak için bilerek böyle.
//
// "Bu yıl çıkmış" meydan okuması BİLEREK sistemin gerçek tarihini (ör. 2026)
// değil, veri setindeki EN YENİ yılı (ör. 2025) referans alıyor — veri seti
// belli bir tarihte toplandığı için sistem tarihiyle karşılaştırınca hep boş
// çıkardı (veri setinde daha "bu yıla ait" hiçbir kayıt olmayabilir).
let enYeniYilCache = null

async function enYeniYiliBul() {
  if (enYeniYilCache) return enYeniYilCache
  const veri = await veriyiYukle()
  let enYeni = 0
  for (let i = 0; i < veri.length; i++) {
    const yil = Number(veri[i][4])
    if (yil > enYeni) enYeni = yil
  }
  enYeniYilCache = enYeni
  return enYeni
}

async function meydanOkumalariGetir() {
  const enYeniYil = await enYeniYiliBul()
  return [
    { etiket: '250 Sayfadan Kısa Bir Kitap Oku', filtre: { sayfaMaks: 250 } },
    { etiket: '500 Sayfadan Uzun Bir Klasik Oku', filtre: { sayfaMin: 500 } },
    { etiket: `${enYeniYil} veya Sonrasından Yeni Çıkmış Bir Kitap Oku`, filtre: { yilBaslangic: enYeniYil } },
    { etiket: '100 Sayfadan Kısa Bir Kitap Oku (Hızlı Okuma)', filtre: { sayfaMaks: 100 } },
  ]
}

export async function meydanOkumaOner() {
  const meydanOkumalar = await meydanOkumalariGetir()
  const meydanOkuma = meydanOkumalar[Math.floor(Math.random() * meydanOkumalar.length)]
  const veri = await veriyiYukle()

  // Filtreye uyan rastgele bir kitap bulmak için veriden rastgele noktalardan
  // başlayıp ilk uyanı alıyoruz (tüm veriyi taramak yerine) — hızlı.
  for (let deneme = 0; deneme < 30; deneme++) {
    const i = Math.floor(Math.random() * veri.length)
    const [, , , isbn, yil, sayfaSayisi] = veri[i]
    if (!isbn) continue
    const { sayfaMaks, sayfaMin, yilBaslangic } = meydanOkuma.filtre
    if (sayfaMaks && (!sayfaSayisi || sayfaSayisi > sayfaMaks)) continue
    if (sayfaMin && (!sayfaSayisi || sayfaSayisi < sayfaMin)) continue
    if (yilBaslangic && (!yil || Number(yil) < yilBaslangic)) continue
    return { meydanOkuma: meydanOkuma.etiket, kitap: satiriNesneyeGevir(veri[i], i) }
  }
  return { meydanOkuma: meydanOkuma.etiket, kitap: null }
}
export async function yayineviKitaplariniGetir(yayineviAdi) {
  const veri = await veriyiYukle()
  const q = yayineviAdi.trim().toLocaleLowerCase('tr-TR')
  const sonuclar = []
  for (let i = 0; i < veri.length; i++) {
    if (veri[i][2].toLocaleLowerCase('tr-TR') === q) {
      sonuclar.push(satiriNesneyeGevir(veri[i], i))
    }
  }
  sonuclar.sort((a, b) => (b.yil || '0').localeCompare(a.yil || '0'))
  return sonuclar
}

// Kategori Keşfi için: bu kategorideki tüm kitaplar. Kategoriler bazen
// binlerce kitap içerebildiği için (ör. "Roman (Yerli)") tamamını değil,
// çağıran taraf sayfalama yapabilsin diye ilk N'i döndürüyoruz.
export async function kategorideKitaplariGetir(kategoriAdi, enFazla = 60) {
  const veri = await veriyiYukle()
  const q = kategoriAdi.trim().toLocaleLowerCase('tr-TR')
  const sonuclar = []
  for (let i = 0; i < veri.length; i++) {
    if (veri[i][6].toLocaleLowerCase('tr-TR') === q) {
      sonuclar.push(satiriNesneyeGevir(veri[i], i))
      if (sonuclar.length >= enFazla) break
    }
  }
  return sonuclar
}

// Tüm benzersiz kategori adlarını (ve her birinde kaç kitap olduğunu) getirir
// — Kategori Keşfi'nin ana listeleme sayfası için.
export async function tumKategorileriGetir() {
  const veri = await veriyiYukle()
  const sayaclar = new Map()
  for (let i = 0; i < veri.length; i++) {
    const kategori = veri[i][6]
    if (!kategori) continue
    sayaclar.set(kategori, (sayaclar.get(kategori) || 0) + 1)
  }
  return Array.from(sayaclar.entries())
    .map(([kategori, sayi]) => ({ kategori, sayi }))
    .sort((a, b) => b.sayi - a.sayi)
}

// Gelişmiş Kitap Arama/Filtreleme için: metin + kategori + yayınevi + yıl
// aralığı + sayfa sayısı aralığına göre filtreler. Tüm filtreler opsiyonel.
export async function kitapFiltrele({ metin, kategori, yayinevi, yilBaslangic, yilBitis, sayfaMin, sayfaMaks } = {}, enFazla = 60) {
  const veri = await veriyiYukle()
  const metinQ = metin?.trim().toLocaleLowerCase('tr-TR') || ''
  const sonuclar = []

  for (let i = 0; i < veri.length; i++) {
    const [baslik, yazar, yayineviAdi, , yil, sayfaSayisi, kategoriAdi] = veri[i]

    if (metinQ) {
      const eslesiyor = baslik.toLocaleLowerCase('tr-TR').includes(metinQ) || yazar.toLocaleLowerCase('tr-TR').includes(metinQ)
      if (!eslesiyor) continue
    }
    if (kategori && kategoriAdi !== kategori) continue
    if (yayinevi && yayineviAdi !== yayinevi) continue
    if (yilBaslangic && (!yil || Number(yil) < Number(yilBaslangic))) continue
    if (yilBitis && (!yil || Number(yil) > Number(yilBitis))) continue
    if (sayfaMin && (!sayfaSayisi || sayfaSayisi < Number(sayfaMin))) continue
    if (sayfaMaks && (!sayfaSayisi || sayfaSayisi > Number(sayfaMaks))) continue

    sonuclar.push(satiriNesneyeGevir(veri[i], i))
    if (sonuclar.length >= enFazla) break
  }
  return sonuclar
}
// Not: Yazar adı serbest metin olarak girildiği için (aynı yazarın farklı
// kayıtlarda farklı yazılmış olma ihtimali var) bu bir TAM eşleşme — bazı
// baskılar farklı yazılmışsa kaçırılabilir, bu bilinen bir sınırlama.
export async function yazarinKitaplariniGetir(yazarAdi) {
  const veri = await veriyiYukle()
  const q = aksansizKucultulmus(yazarAdi)
  const sonuclar = []
  for (let i = 0; i < veri.length; i++) {
    if (aksansizKucultulmus(veri[i][1]) === q) {
      sonuclar.push(satiriNesneyeGevir(veri[i], i))
    }
  }
  sonuclar.sort((a, b) => (b.yil || '0').localeCompare(a.yil || '0'))

  // 67 bin kitaplık statik veri setinde (bkz. dosya başındaki not) kapak
  // görseli hiç yok. Ama bir kitap daha önce ziyaret edilip (turkceKitaptanKaydet)
  // veya elle düzenlenip kapak eklendiyse, bu artık "kitaplar/tr_{isbn}"
  // altında CANLI bir kayıt olarak duruyor — statik listeden habersiz.
  // Yazar sayfasında kapaksız görünmemesi için, ISBN'i olan her sonuç için bu
  // canlı kaydı kontrol edip varsa kapağı (ve varsa güncel başlığı) devralıyoruz.
  await Promise.all(
    sonuclar.map(async (s) => {
      if (!s.isbn) return
      try {
        const canliSnap = await getDoc(doc(db, 'kitaplar', `tr_${s.isbn}`))
        if (canliSnap.exists()) {
          const canli = canliSnap.data()
          if (canli.posterUrl) s.posterUrl = canli.posterUrl
        }
      } catch {
        // sessizce geç — kapaksız göstermeye devam
      }
    })
  )

  return sonuclar
}

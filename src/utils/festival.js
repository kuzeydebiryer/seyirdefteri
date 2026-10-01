// Festival Bölümü — Oscar Yolculuğu'nun genelleştirilmiş hâli. Cannes, Venedik,
// Sundance, Berlin, Filmekimi, İstanbul Film Festivali gibi festivallerin her
// yılı bir "sezon"; o sezonun filmleri TEK TEK aranarak değil, kullanıcının
// Letterboxd'da hazırladığı bir "resmi seçki" listesini dışa aktarıp TOPLU
// içe aktarmasıyla doldurulur (bkz. FestivalFilmIceAktar.jsx) — çünkü festival
// seçkileri için ücretsiz/açık bir API yok, ama Letterboxd'da sinefillerin
// tuttuğu listeler zaten var.

import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function festivalSezonOlustur(kullanici, { festivalId, festivalAdi, yil }) {
  const ref = await addDoc(collection(db, 'festivalSezonlari'), {
    festivalId,
    festivalAdi,
    yil,
    olusturanId: kullanici.uid,
    olusturmaTarihi: serverTimestamp(),
  })
  return ref.id
}

export async function festivalSezonlariniGetir(festivalId) {
  const q = query(collection(db, 'festivalSezonlari'), where('festivalId', '==', festivalId), orderBy('yil', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function festivalSezonSil(sezonId) {
  const filmlerSnap = await getDocs(query(collection(db, 'festivalFilmleri'), where('sezonId', '==', sezonId)))
  await Promise.all(filmlerSnap.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'festivalSezonlari', sezonId))
}

// ÖNEMLİ: içe aktarma sırasında TEK bir satır hata verirse (ağ kesintisi,
// vb.) eski kod bütün döngüyü durduruyordu — kalan filmler hiç denenmeden
// içe aktarma "takılı" kalıyordu, kullanıcıya hiçbir hata gösterilmeden
// (bkz. FestivalFilmIceAktar.jsx'teki düzeltme). Bu yüzden aynı CSV'yi
// GÜVENLE tekrar içe aktarabilmek (sadece eksik kalanları tamamlamak,
// zaten eklenenleri tekrar eklemeden) için, eklemeden önce aynı sezonda
// aynı tmdbId'ye sahip bir kayıt var mı diye bakılıyor.
export async function festivalFilmEkle(sezonId, { tmdbId, filmBasligi, filmYili, posterUrl, sira }) {
  const mevcutSorgu = query(collection(db, 'festivalFilmleri'), where('sezonId', '==', sezonId), where('tmdbId', '==', tmdbId))
  const mevcutSnap = await getDocs(mevcutSorgu)
  if (!mevcutSnap.empty) return 'atlandi'

  await addDoc(collection(db, 'festivalFilmleri'), {
    sezonId,
    tmdbId,
    filmBasligi,
    filmYili: filmYili || '',
    posterUrl: posterUrl || '',
    odul: '', // "Altın Palmiye" gibi — sonuçlar açıklanınca elle girilir
    sira: sira ?? 0,
  })
  return 'eklendi'
}

export async function festivalFilmleriGetir(sezonId) {
  const q = query(collection(db, 'festivalFilmleri'), where('sezonId', '==', sezonId), orderBy('sira', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function festivalFilmSil(filmId) {
  await deleteDoc(doc(db, 'festivalFilmleri', filmId))
}

export async function festivalOduluGuncelle(filmId, odul) {
  await updateDoc(doc(db, 'festivalFilmleri', filmId), { odul })
}

// Festival Banner'ı — her festival için (sezon bazlı değil, festivalin
// kendisi için) tek bir görsel. Kullanıcı bir URL girip kaydediyor, ayrı bir
// yükleme sistemi kurmaya gerek yok.
export async function festivalBanneriGetir(festivalId) {
  const ref = doc(db, 'festivalBannerlari', festivalId)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data().gorselUrl : ''
}

export async function festivalBanneriGuncelle(festivalId, gorselUrl, kullanici) {
  await setDoc(doc(db, 'festivalBannerlari', festivalId), {
    gorselUrl,
    guncelleyenId: kullanici.uid,
    guncellemeTarihi: serverTimestamp(),
  })
}

// --- Seanslar (festivalplanner.co'dan esinlenen özellik) -------------------
//
// festival.js'in geri kalanı festivalin SEÇKİSİYLE (hangi filmler
// gösterildi) ilgiliydi — bu bölüm filmlerin NE ZAMAN/NEREDE gösterildiğiyle
// (seans: tarih+saat+salon+şehir) ilgili. Seçki için Letterboxd listesi
// kullanabiliyorduk ama seans bilgisi hiçbir yerde hazır bir liste olarak
// bulunmuyor — festivalin kendi yayınladığı programı (genelde zaten
// tablo/liste hâlinde) kopyala-yapıştır ile TOPLU girmek, tek tek form
// doldurmaktan çok daha pratik (bkz. kullanıcı geri bildirimi).
//
// Satır biçimi: Film Adı <ayraç> Tarih <ayraç> Saat <ayraç> Salon <ayraç> Şehir
// Ayraç sekme (Excel/Sheets'ten yapıştırmada otomatik oluşur), "|" ya da ";"
// olabilir — virgül KULLANILMIYOR çünkü film adlarında geçebiliyor.
export function parseSeansMetni(metin) {
  return metin
    .split('\n')
    .map((satir) => satir.trim())
    .filter(Boolean)
    .map((satirHam) => {
      let parcalar = satirHam.split('\t')
      if (parcalar.length < 5) parcalar = satirHam.split('|')
      if (parcalar.length < 5) parcalar = satirHam.split(';')
      parcalar = parcalar.map((p) => p.trim())

      if (parcalar.length < 5) {
        return { satirHam, hata: 'Satırda 5 alan bulunamadı (Film · Tarih · Saat · Salon · Şehir)' }
      }

      const [filmAdiHam, tarihHam, saatHam, salon, sehir] = parcalar
      const tarih = tarihNormallestir(tarihHam)
      if (!tarih) return { satirHam, hata: `Tarih anlaşılamadı: "${tarihHam}" (ör. 08.10.2026 ya da 2026-10-08 olmalı)` }
      if (!/^\d{1,2}:\d{2}$/.test(saatHam)) return { satirHam, hata: `Saat anlaşılamadı: "${saatHam}" (ör. 18:00 olmalı)` }

      return { satirHam, filmAdiHam, tarih, saat: saatHam.padStart(5, '0'), salon, sehir }
    })
}

// "08.10.2026", "8/10/2026" ya da zaten "2026-10-08" olabilir — hepsi
// YYYY-MM-DD'ye çevriliyor (metin olarak da tarih/saate göre sıralanabilsin
// diye).
function tarihNormallestir(ham) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(ham)) return ham
  const esleme = ham.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
  if (!esleme) return null
  const [, gun, ay, yil] = esleme
  return `${yil}-${ay.padStart(2, '0')}-${gun.padStart(2, '0')}`
}

// Türkçe büyük/küçük harf, boşluk ve noktalama farklarını yok sayarak
// karşılaştırmak için — festival programındaki yazım, sitedeki TMDB
// başlığıyla (ör. noktalama, "The" gibi takılar) birebir aynı olmayabilir.
//
// "ı" harfini de "i"ye eşitliyoruz: festival programları genelde TAMAMI
// BÜYÜK HARF basılıyor, ve Türkçe küçük harfe çevirmede "I" harfi "ı"ya
// dönüşüyor — ama "VIOLETTE", "PRIMETIME", "BUCKING FASTARD" gibi
// yabancı dildeki başlıklarda bu harf aslında noktalı "i" olmalı. Büyük
// harfli kaynak metinden hangisi olduğunu güvenilir şekilde anlamanın
// yolu yok, bu yüzden eşleştirmede ikisi aynı sayılıyor.
function adiSadelestir(s) {
  return (s || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/[^a-zçğöşü0-9]/g, '')
}

// parseSeansMetni'nin çıktısını, o sezonun seçkisindeki filmlerle
// (festivalFilmleri) eşleştirir — eşleşmeyenler içe aktarılmadan önce
// yönetici tarafından görülüp düzeltilebilsin diye ayrı işaretleniyor.
// `filmler` öğeleri isteğe bağlı bir `trBaslik` alanı taşıyabilir —
// FestivalSeansIceAktar.jsx, "🌐 TMDB'den Türkçe Başlıkları Çek" ile bunu
// doldurduğunda, seçkinin kendi başlığı (genelde İngilizce/orijinal, TMDB'den
// geldiği için) eşleşmese bile TMDB'nin TÜRKÇE başlığıyla (festival
// programının kullandığı dille) karşılaştırma yapılabiliyor. Bu, elle
// bakım gerektiren bir çeviri sözlüğü yerine TMDB'nin KENDİ doğrulanmış
// verisini kullanıyor — hem daha az iş hem de yanlış eşleşme riski yok
// (çünkü trBaslik zaten doğruluğu bilinen bir tmdbId'den geliyor, serbest
// metin aramasından değil).
export function seansSatirlariniEslestir(parsed, filmler) {
  return parsed.map((satir) => {
    if (satir.hata) return { ...satir, eslesti: false }
    const sade = adiSadelestir(satir.filmAdiHam)
    const film = filmler.find((f) => adiSadelestir(f.filmBasligi) === sade || (f.trBaslik && adiSadelestir(f.trBaslik) === sade))
    if (!film) return { ...satir, eslesti: false, hata: `Seçkide eşleşen film yok: "${satir.filmAdiHam}"` }
    return { ...satir, eslesti: true, filmId: film.id, filmBasligi: film.filmBasligi, posterUrl: film.posterUrl || '' }
  })
}

// ÖNCEDEN bu, writeBatch ile ATOMİK yazıyordu — batch içindeki TEK bir
// satırda sorun olunca (ör. undefined bir alan) TÜM parça (400'e kadar
// satır) hiç kaydedilmeden reddediliyordu, kullanıcı da elle eşleştirdiği
// onlarca satırı bir anda kaybediyordu. Artık her seans TEK TEK,
// birbirinden bağımsız kaydediliyor — biri başarısız olsa bile diğerleri
// kaydedilmeye devam ediyor (bkz. festivalFilmEkle'deki aynı düzeltme).
// Ayrıca aynı (film+tarih+saat+salon) zaten varsa atlıyor — bu sayede bir
// "İçe Aktar" denemesi kısmen başarısız olursa, TEKRAR denemek zaten
// kaydedilmiş olanları çoğaltmıyor.
export async function seansToplueKaydet(sezonId, eslesenSatirlar) {
  let eklenen = 0
  let atlanan = 0
  const hatalilar = []

  for (const satir of eslesenSatirlar) {
    const filmBasligi = satir.filmBasligi || satir.filmAdiHam || ''
    try {
      const mevcutSorgu = query(
        collection(db, 'festivalSeanslari'),
        where('filmId', '==', satir.filmId || ''),
        where('tarih', '==', satir.tarih || ''),
        where('saat', '==', satir.saat || ''),
        where('salon', '==', satir.salon || '')
      )
      const mevcutSnap = await getDocs(mevcutSorgu)
      if (!mevcutSnap.empty) {
        atlanan += 1
        continue
      }

      await addDoc(collection(db, 'festivalSeanslari'), {
        sezonId,
        filmId: satir.filmId || '',
        filmBasligi,
        tarih: satir.tarih || '',
        saat: satir.saat || '',
        salon: satir.salon || '',
        sehir: satir.sehir || '',
      })
      eklenen += 1
    } catch (err) {
      hatalilar.push(`${filmBasligi || satir.satirHam}: ${err.message}`)
    }
  }

  return { eklenen, atlanan, hatalilar }
}

export async function festivalSeanslariniGetir(sezonId) {
  const q = query(collection(db, 'festivalSeanslari'), where('sezonId', '==', sezonId), orderBy('tarih', 'asc'), orderBy('saat', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function seansSil(seansId) {
  await deleteDoc(doc(db, 'festivalSeanslari', seansId))
}

// "İçe Aktar" düğmesine çift tıklanınca (ya da herhangi bir yarış durumunda
// — bkz. FestivalSeansIceAktar.jsx'teki düzeltme) aynı seansın birden fazla
// kopyası oluşabiliyordu. Bu, VAR OLAN çift kayıtları (aynı film+tarih+saat+
// salon) tarayıp her grup için sadece BİRİNİ bırakıp diğerlerini siliyor —
// yarış durumu ayrıca düzeltildiği için bunun bir kerelik bir temizlik
// olması bekleniyor.
export async function ciftSeanslariTemizle(sezonId) {
  const snap = await getDocs(query(collection(db, 'festivalSeanslari'), where('sezonId', '==', sezonId)))
  const tumSeanslar = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

  const gruplar = new Map()
  tumSeanslar.forEach((s) => {
    const anahtar = `${s.filmId}|${s.tarih}|${s.saat}|${s.salon}`
    if (!gruplar.has(anahtar)) gruplar.set(anahtar, [])
    gruplar.get(anahtar).push(s)
  })

  let silinen = 0
  for (const grup of gruplar.values()) {
    if (grup.length <= 1) continue
    for (const fazlalik of grup.slice(1)) {
      await deleteDoc(doc(db, 'festivalSeanslari', fazlalik.id))
      silinen += 1
    }
  }
  return silinen
}

// --- Kişisel Plan ------------------------------------------------------------
//
// Bir festival boyunca bir film normalde tek sefer izlenir, bu yüzden bir
// filme en fazla BİR seans seçilebiliyor — doküman ID'si filmId olduğundan
// yeni bir seçim otomatik olarak eskisinin yerine geçiyor (ayrıca silme
// gerektirmiyor).
export async function festivalSeansiSec(kullanici, sezonId, seans) {
  await setDoc(doc(db, 'kullanicilar', kullanici.uid, 'festivalSecimlerim', seans.filmId), {
    sezonId,
    filmId: seans.filmId,
    seansId: seans.id,
    filmBasligi: seans.filmBasligi,
    posterUrl: seans.posterUrl || '',
    tarih: seans.tarih,
    saat: seans.saat,
    salon: seans.salon,
    sehir: seans.sehir,
    secimTarihi: serverTimestamp(),
  })
}

export async function festivalSecimimiKaldir(kullanici, filmId) {
  await deleteDoc(doc(db, 'kullanicilar', kullanici.uid, 'festivalSecimlerim', filmId))
}

export async function festivalSecimlerimiGetir(kullanici, sezonId) {
  if (!kullanici) return []
  const q = query(collection(db, 'kullanicilar', kullanici.uid, 'festivalSecimlerim'), where('sezonId', '==', sezonId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// İki seçim aynı GÜNDE ve başlangıç saatleri 150 dakikadan (2.5 saat) daha
// yakınsa çakışma sayılır — her filmin gerçek süresini (jenerik, soru-cevap
// seansı dahil) ayrıca elle girdirmek yerine, festival seanslarının
// pratikte bıraktığı makul bir ortalama boşluk varsayılıyor. Basit ama
// kullanışlı bir yaklaşım — süre bilgisi eklenirse hassaslaştırılabilir.
export function secimCakismalariniBul(secimler) {
  const cakisanIdler = new Set()
  for (let i = 0; i < secimler.length; i++) {
    for (let j = i + 1; j < secimler.length; j++) {
      const a = secimler[i]
      const b = secimler[j]
      if (a.tarih !== b.tarih) continue
      if (Math.abs(saatDakikayaCevir(a.saat) - saatDakikayaCevir(b.saat)) < 150) {
        cakisanIdler.add(a.id)
        cakisanIdler.add(b.id)
      }
    }
  }
  return cakisanIdler
}

function saatDakikayaCevir(saat) {
  const [s, d] = saat.split(':').map(Number)
  return s * 60 + d
}

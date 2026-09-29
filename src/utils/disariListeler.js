import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'
import { uzunSureliOnbellektenOku, uzunSureliOnbellegeYaz, uzunSureliOnbellegiTemizle } from './uzunSureliOnbellek.js'

// Önceden "Letterboxd 500" tek başına, sabit kodlanmış bir koleksiyondu
// (letterboxd500.js). "IMDb 250'yi de aynı şekilde eklemek istiyorum"
// denince, ikinci bir kopya kurmak yerine (Sinemasal Alt Türler'de
// yaptığımız hatayı tekrarlamamak için) genelleştirildi — artık kaç tane
// dış liste olursa olsun (Letterboxd 500, IMDb 250, Sight & Sound...) aynı
// yapıyı paylaşıyor. Sonrasında "NYT'nin En İyi 100 Dizisi" gibi dizi
// listeleri de istenince, aynı yapı `tur` alanıyla ('sinema' | 'dizi')
// ikinci kez genelleştirildi — liste tanımı hangi TMDB ad alanını/uç
// noktasını kullanacağını, üye eserlerin hangi sayfaya (/film veya /dizi)
// bağlanacağını bu alandan biliyor. Eski listelerde `tur` alanı hiç yok —
// bunlar hep 'sinema' sayılıyor (bkz. turuGetir).
//
// Veri modeli:
//   disariListeler/{listeId}                     — liste TANIMI (ad, stil, tur)
//   disariListeler/{listeId}/filmler/{tmdbId}     — o listedeki her eser (film ya da dizi)

// Eski (tur alanı hiç yazılmamış) listelerle geriye dönük uyumluluk için —
// alan yoksa 'sinema' sayılıyor, aksi halde siteden aniden kaybolurlardı.
export function turuGetir(liste) {
  return liste?.tur === 'dizi' ? 'dizi' : 'sinema'
}

export async function listeleriGetir() {
  const snap = await getDocs(query(collection(db, 'disariListeler'), orderBy('sira', 'asc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function listeGetir(listeId) {
  const snap = await getDoc(doc(db, 'disariListeler', listeId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// stil: 'letterboxd' | 'imdb' | 'genel' — film sayfasındaki rozetin görsel
// dilini belirliyor (bkz. DisListeRozetleri.jsx). 'imdb' seçilirse sitede
// zaten kullanılan sarı-siyah IMDb rozetiyle BİREBİR aynı görünür.
// siraliMi: bazı listeler (Letterboxd 500, IMDb 250) gerçekten SIRALI, ama
// bazıları (ör. "Ölmeden Önce Görmeniz Gereken 1001 Film") sadece bir
// ÜYELİK listesi — sıra numarası anlamsız/yanıltıcı olur ("1001 Film ·
// #567" gibi). false ise rozette/poster üzerinde sıra numarası hiç
// gösterilmiyor.
export async function listeEkle(kullanici, { ad, kisaAd, stil, siraliMi = true, tur = 'sinema' }) {
  const mevcutSayisi = (await listeleriGetir()).length
  const belge = await addDoc(collection(db, 'disariListeler'), {
    ad,
    kisaAd,
    stil,
    siraliMi,
    tur, // 'sinema' | 'dizi'
    sira: mevcutSayisi,
    ekleyenId: kullanici.uid,
    tarih: serverTimestamp(),
  })
  uzunSureliOnbellegiTemizle('disListe')
  return belge.id
}

// Mevcut bir listenin tanımını (ad/kısaAd/stil/siraliMi) düzenlemek için —
// filmleri etkilemiyor, sadece liste TANIMINI günceller.
export async function listeGuncelle(listeId, degisiklikler) {
  await updateDoc(doc(db, 'disariListeler', listeId), degisiklikler)
  uzunSureliOnbellegiTemizle('disListe')
}

export async function listeSil(listeId) {
  const filmler = await listeFilmleriGetir(listeId)
  for (let i = 0; i < filmler.length; i += 400) {
    const parca = filmler.slice(i, i + 400)
    const batch = writeBatch(db)
    parca.forEach((f) => batch.delete(doc(db, 'disariListeler', listeId, 'filmler', f.id)))
    await batch.commit()
  }
  await deleteDoc(doc(db, 'disariListeler', listeId))
  uzunSureliOnbellegiTemizle('disListe')
}

// Daha agresif otomatik eşleştirme (bkz. DisListeIceAktar.jsx — TMDB'nin
// ilk/en alakalı sonucuna güveniliyor) nadiren yanlış bir filmi listeye
// sokabilir. Bu, tek bir filmi (tüm listeyi silmeden) çıkarmak için.
export async function listedenFilmSil(listeId, tmdbId) {
  await deleteDoc(doc(db, 'disariListeler', listeId, 'filmler', String(tmdbId)))
  uzunSureliOnbellegiTemizle('disListe')
}

export async function listeFilmleriGetir(listeId) {
  const snap = await getDocs(query(collection(db, 'disariListeler', listeId, 'filmler'), orderBy('siraNo', 'asc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// kayitlar: [{ tmdbId, siraNo, baslik, yil, posterUrl }]
export async function listeyeTopluKaydet(kullanici, listeId, kayitlar) {
  for (let i = 0; i < kayitlar.length; i += 400) {
    const parca = kayitlar.slice(i, i + 400)
    const batch = writeBatch(db)
    parca.forEach((k) => {
      batch.set(doc(db, 'disariListeler', listeId, 'filmler', String(k.tmdbId)), {
        siraNo: k.siraNo,
        baslik: k.baslik,
        yil: k.yil,
        posterUrl: k.posterUrl || '',
        ekleyenId: kullanici.uid,
        tarih: serverTimestamp(),
      })
    })
    await batch.commit()
  }
  uzunSureliOnbellegiTemizle('disListe')
}

// "O mu Bu mu" oyunu (bkz. oyunlar/OMuBuMu.jsx) gibi TÜM listelerin
// filmlerini tek bir havuzda karıştırmak isteyen özellikler için — her
// listenin filmlerini çekip, aynı film birden fazla listede olabileceği
// için (ör. hem Letterboxd 500 hem IMDb 250'de) tmdbId'ye göre tekilleştirip
// döndürüyor. Oyun sadece FİLM üzerine kurulu olduğundan, dizi listeleri
// (tur: 'dizi') bilerek dışarıda bırakılıyor — aksi halde bir dizinin TMDB
// id'si tesadüfen bir filminkiyle çakışıp oyuna yanlış giriyordu.
export async function tumListeFilmleriGetir() {
  const listeler = (await listeleriGetir()).filter((l) => turuGetir(l) === 'sinema')
  const hepsi = await Promise.all(listeler.map((liste) => listeFilmleriGetir(liste.id)))
  const havuz = new Map()
  hepsi.flat().forEach((film) => {
    if (!havuz.has(film.id)) havuz.set(film.id, film)
  })
  return [...havuz.values()]
}

// "O mu Bu mu" oyunu gibi SADECE belirli stildeki (ör. sadece sıralı,
// tanınmış listeler — Letterboxd 500, IMDb 250) listelerin filmlerini
// isteyen özellikler için — tumListeFilmleriGetir'in filtreli hali. "1001
// Film" ve "Criterion" gibi daha az bilinen filmler içerebilen listeler
// bilerek dışarıda tutulabiliyor. Önceden oyun HER açılışta yüzlerce
// belgeyi (Letterboxd 500 + IMDb 250 = ~750) yeniden çekiyordu — bu havuz
// da liste üyeliği gibi neredeyse hiç değişmediği için 30 günlük önbellekte
// tutuluyor.
export async function stildeListeFilmleriGetir(izinVerilenStiller) {
  const onbellekAnahtari = `stil_${izinVerilenStiller.slice().sort().join('_')}`
  const onbellekteki = uzunSureliOnbellektenOku('disListe', onbellekAnahtari)
  if (onbellekteki !== undefined) return onbellekteki

  const listeler = (await listeleriGetir()).filter((l) => turuGetir(l) === 'sinema' && izinVerilenStiller.includes(l.stil))
  const hepsi = await Promise.all(listeler.map((liste) => listeFilmleriGetir(liste.id)))
  const havuz = new Map()
  hepsi.flat().forEach((film) => {
    if (!havuz.has(film.id)) havuz.set(film.id, film)
  })
  const sonuc = [...havuz.values()]
  uzunSureliOnbellegeYaz('disListe', onbellekAnahtari, sonuc)
  return sonuc
}

// Eser sayfasındaki rozetler için — bu film/dizi HANGİ dış listelerde,
// kaçıncı sırada? Önceden HER sayfa ziyaretinde 1 (liste tanımları) + N
// (her liste için 1 getDoc) okuma yapıyordu — liste sayısı arttıkça bu
// maliyet de artıyordu. Liste üyeliği neredeyse hiç değişmediği için
// (sadece yönetici elle içe aktarma/düzeltme yaptığında), sonuç 30 günlük
// bir önbellekte tutuluyor — bkz. utils/uzunSureliOnbellek.js.
// tur zorunlu: film ve dizi TMDB id uzayları AYRI ve aynı sayıya sahip
// olabilirler — tur filtresi olmadan bir dizi sayfasında tesadüfen bir
// filmin rozeti (ya da tam tersi) görünebilirdi.
export async function eserinListeSiralariGetir(tmdbId, tur = 'sinema') {
  const onbellekAnahtari = `${tur}_${tmdbId}`
  const onbellekteki = uzunSureliOnbellektenOku('disListe', onbellekAnahtari)
  if (onbellekteki !== undefined) return onbellekteki

  const listeler = (await listeleriGetir()).filter((l) => turuGetir(l) === tur)
  const sonuclar = await Promise.all(
    listeler.map(async (liste) => {
      const snap = await getDoc(doc(db, 'disariListeler', liste.id, 'filmler', String(tmdbId)))
      if (!snap.exists()) return null
      return { listeId: liste.id, ad: liste.ad, kisaAd: liste.kisaAd, stil: liste.stil, siraliMi: liste.siraliMi !== false, siraNo: snap.data().siraNo }
    })
  )
  const temiz = sonuclar.filter(Boolean)
  uzunSureliOnbellegeYaz('disListe', onbellekAnahtari, temiz)
  return temiz
}

// Eski ad — geriye dönük uyumluluk için (sadece film/sinema listeleri).
export async function filminListeSiralariGetir(tmdbId) {
  return eserinListeSiralariGetir(tmdbId, 'sinema')
}

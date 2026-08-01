// Kişisel Listeler — Letterboxd/Goodreads tarzı, kişiye ait, sıralı, kapak
// gridli listeler. Topluluklardaki "ortak izleme/etkinlik" listelerinden
// KASITLI olarak ayrı tutuldu (o listelerde etkinlik tarihi + üye puanlaması
// var, bu ise sade bir küratörlük/koleksiyon aracı).
//
// Şema:
//   kisiselListeler/{listeId}    — { kullaniciId, baslik, aciklama, herkeseAcik, kapakUrl, ogeSayisi,
//                                    turSayaclari: {sinema,dizi,kitap}, baskinTur, olusturmaTarihi }
//   kisiselListeOgeleri/{ogeId}  — { listeId, tur, disId, baslik, alt, posterUrl, sira, eklemeTarihi }
//
// baskinTur: listede en çok hangi türden eser varsa o — Film/Dizi/Kitap sayfalarında
// "Listeler" bölümünde hangi listenin gösterileceğine karar vermek için.

import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function listeOlustur(kullanici, { baslik, aciklama, herkeseAcik }) {
  const ref = await addDoc(collection(db, 'kisiselListeler'), {
    kullaniciId: kullanici.uid,
    baslik,
    aciklama: aciklama || '',
    herkeseAcik: herkeseAcik !== false,
    kapakUrl: '',
    ogeSayisi: 0,
    turSayaclari: { sinema: 0, dizi: 0, kitap: 0 },
    baskinTur: '',
    olusturmaTarihi: serverTimestamp(),
  })
  return ref.id
}

export async function listeSil(listeId) {
  const ogelerSnap = await getDocs(query(collection(db, 'kisiselListeOgeleri'), where('listeId', '==', listeId)))
  await Promise.all(ogelerSnap.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'kisiselListeler', listeId))
}

export async function listeGetir(listeId) {
  const snap = await getDoc(doc(db, 'kisiselListeler', listeId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function kullaniciListeleriGetir(uid) {
  const q = query(collection(db, 'kisiselListeler'), where('kullaniciId', '==', uid), orderBy('olusturmaTarihi', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function listeOgeleriGetir(listeId) {
  const q = query(collection(db, 'kisiselListeOgeleri'), where('listeId', '==', listeId), orderBy('sira', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Tek bir eser ekler; sıra numarasını otomatik olarak (mevcut öğe sayısı) atar.
// Kapak görseli boşsa (listenin ilk öğesiyse) listenin kapağı olarak da kaydedilir.
// Ayrıca turSayaclari'nı güncelleyip baskinTur'u yeniden hesaplar (Film/Dizi/Kitap
// sayfalarındaki "Listeler" bölümü bu alana göre filtreleniyor).
export async function ogeEkle(liste, oge) {
  await addDoc(collection(db, 'kisiselListeOgeleri'), {
    listeId: liste.id,
    tur: oge.tur,
    disId: oge.disId,
    baslik: oge.baslik,
    alt: oge.alt || '',
    posterUrl: oge.posterUrl || '',
    sira: liste.ogeSayisi || 0,
    eklemeTarihi: serverTimestamp(),
  })

  const oncekiSayaclar = liste.turSayaclari || { sinema: 0, dizi: 0, kitap: 0 }
  const yeniSayaclar = { ...oncekiSayaclar, [oge.tur]: (oncekiSayaclar[oge.tur] || 0) + 1 }
  const baskinTur = Object.entries(yeniSayaclar).sort((a, b) => b[1] - a[1])[0][0]

  await updateDoc(doc(db, 'kisiselListeler', liste.id), {
    ogeSayisi: increment(1),
    turSayaclari: yeniSayaclar,
    baskinTur,
    ...(liste.ogeSayisi === 0 && oge.posterUrl ? { kapakUrl: oge.posterUrl } : {}),
  })
}

// Letterboxd CSV içe aktarımı gibi TOPLU eklemeler için: her satırı sırayla
// yazar (Firestore'da tek seferde binlerce satır atmak yerine, ilerleme
// göstermek isteyen çağıran taraf için bir dizi olarak veriliyor, bkz.
// LetterboxdIceAktar.jsx — orada satır satır ilerleme çubuğuyla birlikte
// bu ogeEkle fonksiyonu tek tek çağrılıyor).
export async function ogeSil(ogeId) {
  await deleteDoc(doc(db, 'kisiselListeOgeleri', ogeId))
}

export async function listeGuncelle(listeId, alanlar) {
  await updateDoc(doc(db, 'kisiselListeler', listeId), alanlar)
}

// Film/Dizi/Kitap sayfalarındaki "Listeler" bölümü için: baskın türü eşleşen,
// herkese açık listeler.
export async function turdekiListeleriGetir(tur, limitSayisi = 6) {
  const q = query(collection(db, 'kisiselListeler'), where('herkeseAcik', '==', true), where('baskinTur', '==', tur))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.ogeSayisi || 0) - (a.ogeSayisi || 0))
    .slice(0, limitSayisi)
}

// Bir eserin (film/dizi/kitap) hangi listelerde yer aldığını bulur — eser
// sayfasında "Bu eser şu listelerde" bölümü için. `goruntuleyenUid` verilirse
// gizli listeler sadece sahibiyse gösterilir.
export async function esereAitListeleriGetir(tur, disId, goruntuleyenUid) {
  const q = query(collection(db, 'kisiselListeOgeleri'), where('tur', '==', tur), where('disId', '==', disId))
  const ogelerSnap = await getDocs(q)
  const listeIdleri = [...new Set(ogelerSnap.docs.map((d) => d.data().listeId))]

  // Promise.allSettled kullanıyoruz: bu eser başkasının GİZLİ bir listesindeyse,
  // o listeyi okuma iznimiz olmaz (Firestore Rules reddeder) — tek bir reddedilen
  // istek Promise.all ile tüm sorguyu bozar, allSettled ile sadece o liste atlanır.
  const sonuclar = await Promise.allSettled(listeIdleri.map((id) => getDoc(doc(db, 'kisiselListeler', id))))
  return sonuclar
    .filter((s) => s.status === 'fulfilled' && s.value.exists())
    .map((s) => ({ id: s.value.id, ...s.value.data() }))
    .filter((l) => l.herkeseAcik || l.kullaniciId === goruntuleyenUid)
}

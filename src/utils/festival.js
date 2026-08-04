// Festival Bölümü — Oscar Yolculuğu'nun genelleştirilmiş hâli. Cannes, Venedik,
// Sundance, Berlin, Filmekimi, İstanbul Film Festivali gibi festivallerin her
// yılı bir "sezon"; o sezonun filmleri TEK TEK aranarak değil, kullanıcının
// Letterboxd'da hazırladığı bir "resmi seçki" listesini dışa aktarıp TOPLU
// içe aktarmasıyla doldurulur (bkz. FestivalFilmIceAktar.jsx) — çünkü festival
// seçkileri için ücretsiz/açık bir API yok, ama Letterboxd'da sinefillerin
// tuttuğu listeler zaten var.

import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
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

export async function festivalFilmEkle(sezonId, { tmdbId, filmBasligi, filmYili, posterUrl, sira }) {
  await addDoc(collection(db, 'festivalFilmleri'), {
    sezonId,
    tmdbId,
    filmBasligi,
    filmYili: filmYili || '',
    posterUrl: posterUrl || '',
    odul: '', // "Altın Palmiye" gibi — sonuçlar açıklanınca elle girilir
    sira: sira ?? 0,
  })
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

// Topluluk genelinde izleme ilerlemesi — Oscar'daki AYNI desen: TÜM
// eserPuanlari koleksiyonunu taramak yerine sadece bu sezonun filmlerini
// (30'arlık gruplar halinde `in` sorgusuyla) sorguluyoruz.
export async function festivalIzlemeIlerlemesiHesapla(tmdbIdSeti) {
  const tmdbIdler = [...tmdbIdSeti]
  if (tmdbIdler.length === 0) return { izlenen: 0, toplam: 0 }
  const izlenenler = new Set()
  for (let i = 0; i < tmdbIdler.length; i += 30) {
    const parca = tmdbIdler.slice(i, i + 30)
    const sorgu = query(collection(db, 'eserPuanlari'), where('tur', '==', 'sinema'), where('disId', 'in', parca))
    const snap = await getDocs(sorgu)
    snap.docs.forEach((d) => izlenenler.add(d.data().disId))
  }
  return { izlenen: izlenenler.size, toplam: tmdbIdler.length }
}

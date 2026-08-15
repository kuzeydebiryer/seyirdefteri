import { arrayRemove, arrayUnion, addDoc, collection, deleteDoc, doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function listeOlustur(topluluklId, { baslik, aciklama, kapakUrl, kullanici }) {
  const ref = await addDoc(collection(db, 'topluluklar', topluluklId, 'listeler'), {
    baslik,
    aciklama,
    kapakUrl: kapakUrl || '',
    olusturanId: kullanici.uid,
    olusturanAdi: kullanici.displayName || 'İsimsiz',
    olusturmaTarihi: serverTimestamp(),
    ogeSayisi: 0,
  })
  return ref.id
}

export async function listeGuncelle(topluluklId, listeId, { baslik, aciklama, kapakUrl }) {
  await updateDoc(doc(db, 'topluluklar', topluluklId, 'listeler', listeId), { baslik, aciklama, kapakUrl: kapakUrl || '' })
}

export async function listeSil(topluluklId, listeId) {
  await deleteDoc(doc(db, 'topluluklar', topluluklId, 'listeler', listeId))
  // NOT: öğeler (listeOgeleri) kasıtlı olarak silinmiyor — kural sadece listeyi
  // açanın/yöneticinin silmesine izin veriyor, öğeleri toplu silmek istemci
  // tarafında N ayrı silme isteği demek. Küçük ölçekte öksüz kalan öğeler
  // (topluluklId+listeId'si artık var olmayan bir listeye işaret eden) zararsız,
  // hiçbir sorguda görünmezler çünkü hep listeId ile filtreleniyor.
}

// NOT: Liste öğeleri (bir listedeki her film/dizi/kitap) artık üst seviye
// "listeOgeleri" koleksiyonunda tutuluyor, topluluklar/{id}/listeler/{lid}/ogeler
// altında DEĞİL. Sebep: eser sayfasındaki "topluluk ortalaması" bu öğeleri TÜM
// topluluklar/listeler arasında araması gerekiyordu, bu da bir "collectionGroup"
// sorgusu ve elle oluşturulması gereken bir Firestore indeksi gerektiriyordu.
// Üst seviye + topluluklId/listeId alanlarıyla basit where() sorguları yeterli
// oluyor, hiçbir özel indeks gerekmiyor.
export async function ogeEkle(topluluklId, listeId, oge, kullanici, mevcutOgeSayisi) {
  await addDoc(collection(db, 'listeOgeleri'), {
    ...oge,
    topluluklId,
    listeId,
    ekleyenAdi: kullanici.displayName || 'İsimsiz',
    eklemeTarihi: serverTimestamp(),
    sira: mevcutOgeSayisi || 0,
    puanlar: {},
    tamamlayanlar: [],
  })
  await updateDoc(doc(db, 'topluluklar', topluluklId, 'listeler', listeId), { ogeSayisi: increment(1) })
}

export async function ogeSil(ogeId, topluluklId, listeId) {
  await deleteDoc(doc(db, 'listeOgeleri', ogeId))
  await updateDoc(doc(db, 'topluluklar', topluluklId, 'listeler', listeId), { ogeSayisi: increment(-1) })
}

// puanlar bir map olarak tutuluyor ({uid: puan}) — bu sayede bir üye puanını
// güncellediğinde eskisini aramaya/silmeye gerek kalmadan doğrudan üzerine yazılıyor.
export async function ogePuanla(ogeId, uid, puan) {
  await updateDoc(doc(db, 'listeOgeleri', ogeId), {
    [`puanlar.${uid}`]: puan,
  })
}

// "Tamamladım" işareti — her üye kendi ilerlemesini işaretler (ör. "200 Film
// Serüveni"nde 47/200 izledim gibi bir özet hesaplamak için).
export async function ogeTamamlaDegistir(ogeId, uid, tamamlandiMi) {
  await updateDoc(doc(db, 'listeOgeleri', ogeId), {
    tamamlayanlar: tamamlandiMi ? arrayRemove(uid) : arrayUnion(uid),
  })
}

// İki öğenin "sira" değerini takas eder (basit ↑/↓ ile yeniden sıralama —
// sürükle-bırak yerine, mobilde de sorunsuz çalışsın diye).
export async function ogeSiralariniTakasEt(ogeA, ogeB) {
  await Promise.all([
    updateDoc(doc(db, 'listeOgeleri', ogeA.id), { sira: ogeB.sira }),
    updateDoc(doc(db, 'listeOgeleri', ogeB.id), { sira: ogeA.sira }),
  ])
}

// Kişisel bir listeyi bir topluluk listesine KOPYALAR (taşımaz — kişisel liste
// olduğu gibi kalır). Şema farkı burada eşleniyor: kişisel öğelerde tek bir
// "disId" var (sinema/dizi için TMDB id, kitap için Google Books id), topluluk
// öğelerinde ayrı ayrı "tmdbId"/"googleBooksId" alanları var.
export async function kisiselListedenTopluluğaKopyala(kisiselListe, kisiselOgeler, hedefTopluluklId, kullanici) {
  const yeniListeId = await listeOlustur(hedefTopluluklId, {
    baslik: kisiselListe.baslik,
    aciklama: kisiselListe.aciklama || '',
    kapakUrl: kisiselListe.kapakUrl || '',
    kullanici,
  })
  let sira = 0
  for (const oge of kisiselOgeler) {
    const eslenenOge =
      oge.tur === 'kitap'
        ? { tur: 'kitap', googleBooksId: oge.disId, baslik: oge.baslik, yazar: oge.alt || '', posterUrl: oge.posterUrl || '', etkinlikTarihi: null }
        : { tur: oge.tur, tmdbId: oge.disId, baslik: oge.baslik, yil: oge.alt || '', posterUrl: oge.posterUrl || '', etkinlikTarihi: null }
    await ogeEkle(hedefTopluluklId, yeniListeId, { ...eslenenOge, ekleyenId: kullanici.uid }, kullanici, sira)
    sira++
  }
  return yeniListeId
}

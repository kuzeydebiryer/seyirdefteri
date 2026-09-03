import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// "yorumlar" koleksiyonu iki farklı bağlama hizmet ediyor: ya gonderiId
// DOLU (günce/gönderi yorumu) ya da (eserTur + eserDisId) DOLU (film/dizi/
// kitap sayfası yorumu) — ikisi birden olmuyor. eserBaslik/eserPosterUrl,
// Profil > Yorumlarım sekmesinde doğru başlık ve linki gösterebilmek için
// yazılıyor (bu alanlar olmadan yazılmış eski yorumlarda geriye dönük
// olarak boş kalır, sadece tür bazlı bir etiketle gösterilir).
//
// ustYorumId varsa bu bir YANIT'tır — üst yorumun altında gösterilir.
// Yanıtlara yanıt YOK (tek seviye iç içe geçme, çoğu platformun yaptığı
// gibi), karmaşıklığı sınırlı tutmak için.
//
// orderBy KULLANMIYORUZ (istemci tarafında sıralıyoruz) — eşitlik
// filtreleri tek başına bileşik indeks GEREKTİRMEZ, orderBy eklersek gerekir.
export async function eserYorumlariGetir(tur, disId) {
  const q = query(collection(db, 'yorumlar'), where('eserTur', '==', tur), where('eserDisId', '==', disId))
  const snap = await getDocs(q)
  const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  liste.sort((a, b) => (a.tarih?.toMillis?.() || 0) - (b.tarih?.toMillis?.() || 0))
  return liste
}

export async function eserYorumEkle(tur, disId, kullanici, yazarAdi, metin, { eserBaslik, eserPosterUrl, ustYorumId } = {}) {
  const ref = await addDoc(collection(db, 'yorumlar'), {
    eserTur: tur,
    eserDisId: disId,
    eserBaslik: eserBaslik || '',
    eserPosterUrl: eserPosterUrl || '',
    yazarId: kullanici.uid,
    yazarAdi: yazarAdi || kullanici.displayName || 'İsimsiz',
    metin: metin.trim(),
    ustYorumId: ustYorumId || null,
    begenenler: [],
    tarih: serverTimestamp(),
  })
  return ref.id
}

export async function yorumSil(yorumId) {
  await deleteDoc(doc(db, 'yorumlar', yorumId))
}

// Yazım hatası ya da fikir değişikliği için — sadece yorumun SAHİBİ
// çağırabilir (bkz. firestore.rules). duzenlendiMi/duzenlemeTarihi,
// arayüzde "(düzenlendi)" etiketi göstermek için — bir yorumun sessizce
// değişmiş gibi durmaması, okuyanın bunu bilmesi önemli.
export async function yorumDuzenle(yorumId, yeniMetin) {
  await updateDoc(doc(db, 'yorumlar', yorumId), {
    metin: yeniMetin,
    duzenlendiMi: true,
    duzenlemeTarihi: serverTimestamp(),
  })
}

export async function yorumBegenDegistir(yorumId, uid, suAnBegeniyorMu) {
  await updateDoc(doc(db, 'yorumlar', yorumId), {
    begenenler: suAnBegeniyorMu ? arrayRemove(uid) : arrayUnion(uid),
  })
}

// Anasayfadaki "Son Yorumlar" widget'ı + /son-yorumlar sayfası için — sadece
// eser (film/dizi/kitap) yorumları, "haber" ya da "kitap-istek" gibi diğer
// eserYorumEkle kullanıcıları HARİÇ. Burada (eserYorumlariGetir'in aksine)
// orderBy KULLANIYORUZ çünkü tek bir esere değil, TÜM eserlere ait yorumları
// tarihe göre sıralı çekiyoruz — bileşik indeks gerekiyor (bkz.
// firestore.indexes.json: eserTur + tarih).
export async function sonYorumlariGetir(turler, limitSayisi = 10) {
  const q = query(collection(db, 'yorumlar'), where('eserTur', 'in', turler), orderBy('tarih', 'desc'), limit(limitSayisi))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
// (puanlama) kayıtlarıyla AYNI KART tasarımıyla karışsın diye, doğrudan bir
// günlük-kaydı-benzeri objeye dönüştürülerek dönüyor. "tur"/"disId" bilerek
// yorumun kendi ID'si değil, yorumun YAPILDIĞI eserin tür/ID'si — bu sayede
// mevcut gunlukKaydiLinki() fonksiyonu hiç değişmeden doğru sayfaya
// (film/dizi/kitap) yönlendiriyor. "not" alanına yorum metni konuyor, aynı
// kartın "günce metni" gösterme alanı yeniden kullanılmış oluyor.
export async function takipEdilenlerinYorumlariniGetir(uidListesi, limitSayisi = 15) {
  if (!uidListesi || uidListesi.length === 0) return []
  const gruplar = []
  for (let i = 0; i < uidListesi.length; i += 30) {
    gruplar.push(uidListesi.slice(i, i + 30))
  }
  const sonuclar = await Promise.all(
    gruplar.map((grup) => getDocs(query(collection(db, 'yorumlar'), where('yazarId', 'in', grup))))
  )
  const hepsi = sonuclar
    .flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    .filter((y) => y.eserTur && y.eserDisId) // sadece eser (film/dizi/kitap) yorumları — günce yorumları bu akışa ait değil
    .map((y) => ({
      id: y.id,
      tur: y.eserTur,
      disId: y.eserDisId,
      baslik: y.eserBaslik,
      posterUrl: y.eserPosterUrl,
      kullaniciId: y.yazarId,
      kullaniciAdi: y.yazarAdi,
      izlemeTarihi: y.tarih,
      eklemeTarihi: y.tarih,
      begenenler: y.begenenler || [],
      not: y.metin,
      puan: null,
      _aktiviteTuru: y.ustYorumId ? 'yanit' : 'yorum',
    }))
  hepsi.sort((a, b) => (b.eklemeTarihi?.toMillis?.() || 0) - (a.eklemeTarihi?.toMillis?.() || 0))
  return hepsi.slice(0, limitSayisi)
}

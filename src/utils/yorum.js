import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
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

export async function yorumBegenDegistir(yorumId, uid, suAnBegeniyorMu) {
  await updateDoc(doc(db, 'yorumlar', yorumId), {
    begenenler: suAnBegeniyorMu ? arrayRemove(uid) : arrayUnion(uid),
  })
}

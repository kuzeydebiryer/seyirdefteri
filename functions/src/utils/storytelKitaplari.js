import { deleteDoc, doc, getDoc, getDocs, collection, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../firebase.js'

// Storytel'in resmi bir API'si yok (bu oturumda araştırdık — sadece
// gayrı resmi, tersine mühendislikle erişilen kaynaklar var, onlara
// bağlanmıyoruz). Bu yüzden "bu kitap Storytel'de mevcut" bilgisi tamamen
// ELLE işaretleniyor — Yeni Gelen Filmler'deki gibi, sadece yönetici değil,
// giriş yapmış herkes ekleyebiliyor/kaldırabiliyor.
export async function storytelKitaplariGetir() {
  const snap = await getDocs(query(collection(db, 'storytelKitaplari'), orderBy('tarih', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function storytelKitabiMi(kitapId) {
  const snap = await getDoc(doc(db, 'storytelKitaplari', String(kitapId)))
  return snap.exists()
}

// storytelKitabiMi'nin aksine, varsa kaydın TAMAMINI (süre/puan/seslendiren
// dahil) döndürüyor — kitap sayfasında zaten işaretlenmiş bir kitabın
// çekilen bilgilerini göstermek için.
export async function storytelKitabiDetayGetir(kitapId) {
  const snap = await getDoc(doc(db, 'storytelKitaplari', String(kitapId)))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// Kullanıcının işaretlerken elle yapıştırdığı bir Storytel kitap linkinden
// (ör. storytel.com/tr/books/oblomov-1070054) süre/puan/seslendiren/kategori
// bilgisini çekiyor — bkz. functions/index.js'teki storytelKitapBilgisiGetir.
// Bu bir API entegrasyonu DEĞİL: tek bir herkese açık sayfayı, kullanıcı
// verdiğinde, tek seferlik okuyor. Sonuç sadece bir ÖN DOLDURMA — kaydetmeden
// önce EserSayfasi.jsx'te gösterilip elle düzeltilebiliyor.
const storytelKitapBilgisiGetirCallable = httpsCallable(functions, 'storytelKitapBilgisiGetir')
export async function storytelKitapBilgisiGetir(url) {
  const sonuc = await storytelKitapBilgisiGetirCallable({ url })
  return sonuc.data
}

export async function storytelKitabiIsaretle(kullanici, { disId, baslik, alt, posterUrl, kategori, populerMi = false, storytelUrl, storytelSure, storytelPuan, storytelPuanlamaSayisi, storytelSeslendiren, storytelKategori }) {
  await setDoc(doc(db, 'storytelKitaplari', String(disId)), {
    baslik,
    alt: alt || '',
    posterUrl: posterUrl || '',
    kategori: kategori || null,
    populerMi,
    // storytelKitapBilgisiGetir Cloud Function'ından (bkz. functions/index.js)
    // linkten çekilen bilgiler — hepsi opsiyonel, sadece kullanıcı bir link
    // yapıştırıp "Bilgileri Çek"e bastıysa doluyor.
    storytelUrl: storytelUrl || '',
    storytelSure: storytelSure || '',
    storytelPuan: storytelPuan ?? null,
    storytelPuanlamaSayisi: storytelPuanlamaSayisi ?? null,
    storytelSeslendiren: storytelSeslendiren || '',
    storytelKategori: storytelKategori || '',
    ekleyenId: kullanici.uid,
    tarih: serverTimestamp(),
  })
}

// Anasayfa/Kitap sayfasındaki önizleme şeritleri ve "Storytel'de Popüler"
// bölümü için — populerMi:true olanları getiriyor. Serkan bunu her hafta
// elle güncelliyor (bkz. storytelPopulerligiDegistir), otomatik bir
// "trend" hesaplaması yok.
export async function storytelPopulerleriGetir() {
  const snap = await getDocs(query(collection(db, 'storytelKitaplari'), where('populerMi', '==', true), orderBy('tarih', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function storytelPopulerligiDegistir(kitapId, yeniDeger) {
  await updateDoc(doc(db, 'storytelKitaplari', String(kitapId)), { populerMi: yeniDeger })
}

export async function storytelKitabiKaldir(kitapId) {
  await deleteDoc(doc(db, 'storytelKitaplari', String(kitapId)))
}

// tavsiyePosterleriniSenkronizeEt / izlenecekPosterleriniSenkronizeEt ile
// aynı desen: kitap Storytel'de kapaksız işaretlenmiş olabilir (o an
// kitabın kendi kaydında henüz kapak yoktu), sonradan "Bilgiyi Düzenle"
// ile kapak eklenince buraya da geriye dönük yansısın diye (bkz.
// EserSayfasi.jsx duzenlemeyiKaydet). Zaten kapağı varsa dokunmuyoruz.
export async function storytelPosterSenkronizeEt(disId, posterUrl) {
  if (!posterUrl) return
  const ref = doc(db, 'storytelKitaplari', String(disId))
  const snap = await getDoc(ref)
  if (snap.exists() && !snap.data().posterUrl) {
    await updateDoc(ref, { posterUrl }).catch(() => {})
  }
}

// Seslendiren sayfası için — bir seslendirenin işaretlediğimiz TÜM
// Storytel kitaplarını getiriyor. "storytelSeslendiren" alanı birden
// fazla seslendireni virgülle ayırarak tutabildiği için (bkz.
// functions/index.js) tam eşleşme yerine virgülle ayrılmış listede
// geçiyor mu diye bakıyoruz.
export async function storytelKitaplariSeslendireneGoreGetir(isim) {
  const tumKitaplar = await storytelKitaplariGetir()
  const q = isim.trim().toLocaleLowerCase('tr-TR')
  return tumKitaplar.filter((k) =>
    (k.storytelSeslendiren || '')
      .split(',')
      .map((s) => s.trim().toLocaleLowerCase('tr-TR'))
      .includes(q)
  )
}

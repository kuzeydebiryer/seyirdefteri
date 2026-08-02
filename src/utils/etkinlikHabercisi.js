// Etkinlik Habercisi — "geçmişte yaşadım" güncelerinden farklı olarak, İLERİYE
// dönük bir duyuru panosu: henüz olmamış ama biletleri satışa çıkacak/çıkmış
// etkinlikleri topluluğa haber vermek ve "katılacağım" diyerek ilgi göstermek için.
// Otomatik bir bilet sitesi entegrasyonu (Biletix vb.) CORS/ToS engelleri
// yüzünden mümkün değildi (bkz. Oscar Yolculuğu analizi) — bu yüzden elle,
// topluluk kaynaklı bir duyuru panosu olarak kuruldu.
//
// Çoklu tarih: bir oyun/etkinlik aynı mekanda birden fazla kez sahnelenebiliyor.
// `tarihler` dizisi TÜM gösterim tarihlerini tutar; sorgulama/sıralama için
// bundan türetilen `ilkTarih` (en yakın gösterim) ve `sonTarih` (en son gösterim)
// ayrı alanlar olarak saklanır — bir etkinlik, SON gösterimi geçene kadar
// listede kalır.

import { arrayRemove, arrayUnion, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function habercEkle(kullanici, profil, { baslik, sehir, mekan, gorselUrl, tur, tarihler, biletSatisTarihi, satisLinki, bilgi }) {
  const siraliTarihler = [...tarihler].filter(Boolean).sort()
  const ref = doc(collection(db, 'etkinlikHabercileri'))
  await setDoc(ref, {
    baslik,
    sehir: sehir || '',
    mekan: mekan || '',
    gorselUrl: gorselUrl || '',
    tur: tur || 'Diğer',
    tarihler: siraliTarihler,
    ilkTarih: siraliTarihler[0],
    sonTarih: siraliTarihler[siraliTarihler.length - 1],
    biletSatisTarihi: biletSatisTarihi || null,
    satisLinki: satisLinki || '',
    bilgi: bilgi || '',
    ekleyenId: kullanici.uid,
    ekleyenAdi: profil?.adSoyad || kullanici.displayName || 'İsimsiz',
    katilacaklar: [],
    eklemeTarihi: serverTimestamp(),
  })
  return ref.id
}

// Son gösterim tarihi geçmemiş TÜM etkinlikler, en yakın gösterime göre sıralı.
// Geçmiş etkinlikler (tüm tarihleri geçmiş olanlar) otomatik olarak düşer.
export async function habercileriGetir() {
  const bugun = new Date().toISOString().slice(0, 10)
  const q = query(collection(db, 'etkinlikHabercileri'), where('sonTarih', '>=', bugun), orderBy('sonTarih', 'asc'), orderBy('ilkTarih', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function katilimDegistir(habercId, uid, katiliyorMu) {
  await updateDoc(doc(db, 'etkinlikHabercileri', habercId), {
    katilacaklar: katiliyorMu ? arrayRemove(uid) : arrayUnion(uid),
  })
}

export async function habercSil(habercId) {
  await deleteDoc(doc(db, 'etkinlikHabercileri', habercId))
}

// Anasayfa akışında güncelerle karışık gösterilecek son duyurular — burada
// "yaklaşan etkinlik" filtresi yok, sadece EN SON PAYLAŞILAN duyurular (akışın
// mantığı zaten "en yeni ne oldu" olduğu için, eklenme tarihine göre sıralanır).
export async function sonHabercileriGetir(limitSayisi = 10) {
  const q = query(collection(db, 'etkinlikHabercileri'), orderBy('eklemeTarihi', 'desc'), limit(limitSayisi))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data(), _tur: 'haberci' }))
}

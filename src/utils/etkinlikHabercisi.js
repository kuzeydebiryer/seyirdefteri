// Etkinlik Habercisi — "geçmişte yaşadım" güncelerinden farklı olarak, İLERİYE
// dönük bir duyuru panosu: henüz olmamış ama biletleri satışa çıkacak/çıkmış
// etkinlikleri topluluğa haber vermek ve "katılacağım" diyerek ilgi göstermek için.
// Otomatik bir bilet sitesi entegrasyonu (Biletix vb.) CORS/ToS engelleri
// yüzünden mümkün değildi (bkz. Oscar Yolculuğu analizi) — bu yüzden elle,
// topluluk kaynaklı bir duyuru panosu olarak kuruldu.

import { arrayRemove, arrayUnion, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function habercEkle(kullanici, profil, { baslik, sehir, tur, etkinlikTarihi, biletSatisTarihi, satisLinki, bilgi }) {
  const ref = doc(collection(db, 'etkinlikHabercileri'))
  await setDoc(ref, {
    baslik,
    sehir: sehir || '',
    tur: tur || 'Diğer',
    etkinlikTarihi,
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

// Sadece bugünden itibaren olan etkinlikler, tarihe göre yakından uzağa sıralı.
// Geçmiş etkinlikler otomatik olarak listeden düşer (elle silmeye gerek yok).
export async function habercileriGetir() {
  const bugun = new Date().toISOString().slice(0, 10)
  const q = query(collection(db, 'etkinlikHabercileri'), where('etkinlikTarihi', '>=', bugun), orderBy('etkinlikTarihi', 'asc'))
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

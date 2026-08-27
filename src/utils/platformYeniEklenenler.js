import { addDoc, collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// Cloud Function (platformYeniEklenenleriTespitEt) tarafından günlük
// dolduruluyor — burası sadece okuyor. İlk kurulumdan sonraki gün itibarıyla
// veri gelmeye başlar (bkz. functions/index.js'teki not — ilk çalıştırmada
// karşılaştıracak "dün" olmadığı için hiçbir şey "yeni" sayılmaz).
//
// "Son 30 gün" filtresi SUNUCU TARAFINDA (Firestore sorgusunun kendisinde)
// uygulanıyor — önceden tüm geçmişi çekip tarayıcıda kırpıyorduk, bu da
// koleksiyon zamanla büyüdükçe her ziyarette giderek daha fazla boşa okuma
// demekti. Mevcut bileşik indeks (platformId + tur + tespitTarihi) bu
// aralık sorgusunu zaten destekliyor, ek bir indeks gerekmiyor.
export async function platformdaYeniEklenenleriGetir(platformId, tur, limitGun = 30) {
  const sinirTarihi = new Date()
  sinirTarihi.setDate(sinirTarihi.getDate() - limitGun)

  const q = query(
    collection(db, 'platformYeniEklenenler'),
    where('platformId', '==', String(platformId)),
    where('tur', '==', tur),
    where('tespitTarihi', '>=', sinirTarihi),
    orderBy('tespitTarihi', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Otomatik tespitin kaçırdığı ya da henüz sıraya girmemiş bir eklemeyi elle
// girmek için — Cloud Function'ın yazdığı doküman şeklinin AYNISI, sadece
// tespitTarihi sunucu saati yerine kullanıcının seçtiği tarih (Timestamp'e
// çevrilerek). Böylece bu kayıt, otomatik tespit edilenlerle aynı şekilde
// hem platform sayfasındaki "Son 30 Gün" şeridinde hem anasayfadaki
// "Platformlarda Yeni" widget'ında görünüyor — ayrı bir gösterim yolu
// gerekmiyor.
export async function platformYeniEklentiEkle({ platformId, platformAdi, tur, disId, baslik, posterUrl, tarih }) {
  await addDoc(collection(db, 'platformYeniEklenenler'), {
    platformId: String(platformId),
    platformAdi,
    tur,
    disId: Number(disId),
    baslik,
    posterUrl: posterUrl || '',
    tespitTarihi: Timestamp.fromDate(new Date(tarih)),
  })
}

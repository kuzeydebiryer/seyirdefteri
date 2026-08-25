import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
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

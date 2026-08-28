import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, Timestamp, where } from 'firebase/firestore'
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

// Aynı film/dizi aynı platforma birden fazla eklenebiliyordu (form arka
// arkaya tıklanınca ya da "kaydedildi ama görünmüyor" sanılıp tekrar
// denenince) — şimdi eklemeden önce aynı platformId+tur+disId ile mevcut
// bir kayıt var mı diye bakılıyor, varsa YENİ kayıt açmak yerine hata
// fırlatılıyor.
//
// elleEklendiMi: true — otomatik tespitlerden ayırt etmek için (bu alan
// Cloud Function'ın yazdığı kayıtlarda hiç yok, oradaki eksiklik "false"
// gibi davranıyor). Anasayfa widget'ı bunu, elle eklenenleri öne çıkarmak
// için kullanıyor.
//
// tur film ise (sinema), AYNI ANDA "Dijitalde Yeni Çıkanlar"a da yazılıyor
// — bir filmin belirli bir platforma yeni geldiğini biliyorsak, bu zaten
// "dijitalde yeni çıktı" anlamına da geliyor, ayrıca ikinci bir form
// doldurmaya gerek yok. Dizi için bu yapılmıyor çünkü "Dijitalde Yeni
// Çıkanlar" şu an sadece film gösteriyor (bkz. Platformlar.jsx).
export async function platformYeniEklentiEkle({ platformId, platformAdi, tur, disId, baslik, posterUrl, tarih, kullanici }) {
  const mevcutSorgu = query(
    collection(db, 'platformYeniEklenenler'),
    where('platformId', '==', String(platformId)),
    where('tur', '==', tur),
    where('disId', '==', Number(disId))
  )
  const mevcutSnap = await getDocs(mevcutSorgu)
  if (!mevcutSnap.empty) {
    throw new Error(`"${baslik}" zaten ${platformAdi} listesinde var — mükerrer eklenmedi.`)
  }
  await addDoc(collection(db, 'platformYeniEklenenler'), {
    platformId: String(platformId),
    platformAdi,
    tur,
    disId: Number(disId),
    baslik,
    posterUrl: posterUrl || '',
    tespitTarihi: Timestamp.fromDate(new Date(tarih)),
    elleEklendiMi: true,
    ekleyenId: kullanici?.uid || null,
  })

  if (tur === 'sinema' && kullanici) {
    await addDoc(collection(db, 'dijitalYeniCikanlar'), {
      tur: 'sinema',
      disId: Number(disId),
      baslik,
      alt: '',
      posterUrl: posterUrl || '',
      not: '',
      // Genel "💻 Dijital" etiketi DEĞİL — bu kayıt belirli bir platforma
      // (MUBI, HBO Max, Netflix...) eklendiği için, "Dijitalde Yeni
      // Çıkanlar"daki kartı da o platformun adını taşıyor. "💻 Dijital"
      // etiketi sadece hiçbir platforma bağlı olmayan, doğrudan bu listeye
      // eklenen kayıtlar için kullanılıyor (bkz. TavsiyeBolumu.jsx).
      platformEtiketi: platformAdi,
      ekleyenId: kullanici.uid,
      ekleyenAdi: kullanici.displayName || 'İsimsiz',
      tarih: serverTimestamp(),
    })
  }
}

export async function platformYeniEklentiSil(id) {
  await deleteDoc(doc(db, 'platformYeniEklenenler', id))
}

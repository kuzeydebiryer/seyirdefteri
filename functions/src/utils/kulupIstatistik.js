import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

function gruplaHalde(dizi, boyut) {
  const gruplar = []
  for (let i = 0; i < dizi.length; i += boyut) gruplar.push(dizi.slice(i, i + boyut))
  return gruplar
}

// Bir kulüp etkinliğinin eseri (tur+disId) için, SADECE o topluluğun üyeleri
// arasında: kaç kişi izlemeye/okumaya başlamış ve kulüp içi ortalama puan
// nedir. Site geneli istatistiklerden (eserIstatistikleri) bilerek ayrı —
// "bizim kulübün" ortalaması, herkesin ortalamasından farklı bir bilgi.
export async function kulupIlerlemeGetir(uyeUidleri, tur, disId) {
  if (!uyeUidleri || uyeUidleri.length === 0 || !disId) {
    return { baslayanSayisi: 0, ortalamaPuan: null, puanlayanSayisi: 0 }
  }
  const gruplar = gruplaHalde(uyeUidleri, 30)

  const [izlenecekSonuclari, gunlukSonuclari] = await Promise.all([
    Promise.all(
      gruplar.map((g) =>
        getDocs(query(collection(db, 'izlenecekler'), where('tur', '==', tur), where('disId', '==', disId), where('kullaniciId', 'in', g)))
      )
    ),
    Promise.all(
      gruplar.map((g) =>
        getDocs(query(collection(db, 'gunlukKayitlari'), where('tur', '==', tur), where('disId', '==', disId), where('kullaniciId', 'in', g)))
      )
    ),
  ])

  const izlenecekler = izlenecekSonuclari.flatMap((s) => s.docs.map((d) => d.data()))
  const baslayanSayisi = izlenecekler.filter((i) => i.durum === 'okunuyor').length

  const puanlar = gunlukSonuclari
    .flatMap((s) => s.docs.map((d) => d.data()))
    .filter((g) => g.puan != null)
    .map((g) => g.puan)
  const ortalamaPuan = puanlar.length > 0 ? puanlar.reduce((t, p) => t + p, 0) / puanlar.length : null

  return { baslayanSayisi, ortalamaPuan, puanlayanSayisi: puanlar.length }
}

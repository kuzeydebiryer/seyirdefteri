// İlgili Eserler — bir film/dizi ile bir kitap arasında (ya da herhangi iki
// eser arasında) çift yönlü bir bağlantı kurar. "Uyarlandığı kitap" gibi
// ilişkileri temsil etmek için: bir tarafa eklendiğinde diğer taraf da
// otomatik güncellenir, kullanıcı ilişkiyi iki kere kurmak zorunda kalmaz.
//
// Doküman ID'si kasıtlı olarak deterministik: `${benTur}_${benDisId}__${digerTur}_${digerDisId}`
// — hem tekrar eklemeyi (aynı çift) otomatik olarak üzerine yazmaya çevirir,
// hem de silme işleminde iki dokümanı da kolayca hedefleyebilmemizi sağlar.

import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

function ilgiliId(tur, disId, digerTur, digerDisId) {
  return `${tur}_${disId}__${digerTur}_${digerDisId}`
}

export async function ilgiliEserEkle(kaynak, hedef, kullanici) {
  await setDoc(doc(db, 'ilgiliEserler', ilgiliId(kaynak.tur, kaynak.disId, hedef.tur, hedef.disId)), {
    benTur: kaynak.tur,
    benDisId: kaynak.disId,
    digerTur: hedef.tur,
    digerDisId: hedef.disId,
    digerBaslik: hedef.baslik,
    digerPosterUrl: hedef.posterUrl || '',
    digerAlt: hedef.alt || '',
    ekleyenId: kullanici.uid,
    eklemeTarihi: serverTimestamp(),
  })
  await setDoc(doc(db, 'ilgiliEserler', ilgiliId(hedef.tur, hedef.disId, kaynak.tur, kaynak.disId)), {
    benTur: hedef.tur,
    benDisId: hedef.disId,
    digerTur: kaynak.tur,
    digerDisId: kaynak.disId,
    digerBaslik: kaynak.baslik,
    digerPosterUrl: kaynak.posterUrl || '',
    digerAlt: kaynak.alt || '',
    ekleyenId: kullanici.uid,
    eklemeTarihi: serverTimestamp(),
  })
}

export async function ilgiliEserleriGetir(tur, disId) {
  const q = query(collection(db, 'ilgiliEserler'), where('benTur', '==', tur), where('benDisId', '==', disId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function ilgiliEserSil(kaynak, hedef) {
  await deleteDoc(doc(db, 'ilgiliEserler', ilgiliId(kaynak.tur, kaynak.disId, hedef.tur, hedef.disId)))
  await deleteDoc(doc(db, 'ilgiliEserler', ilgiliId(hedef.tur, hedef.disId, kaynak.tur, kaynak.disId)))
}

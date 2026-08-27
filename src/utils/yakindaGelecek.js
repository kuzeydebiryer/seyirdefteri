import { addDoc, collection, deleteDoc, doc, getDocs, query } from 'firebase/firestore'
import { db } from '../firebase.js'

export async function yakindaGelenEkle(kullanici, { tur, disId, baslik, posterUrl, hedefTuru, platformId, platformAdi, cikisTarihi }) {
  await addDoc(collection(db, 'yakindaGelecekler'), {
    tur,
    disId: Number(disId),
    baslik,
    posterUrl: posterUrl || '',
    hedefTuru, // 'platform' | 'dijital'
    platformId: hedefTuru === 'platform' ? String(platformId) : '',
    platformAdi: hedefTuru === 'platform' ? platformAdi : '',
    cikisTarihi,
    ekleyenId: kullanici.uid,
    ekleyenAdi: kullanici.displayName || 'İsimsiz',
  })
}

// Geçmiş tarihli olanlar da (henüz Cloud Function o günün taramasını
// yapmadıysa, birkaç saatlik bir gecikme penceresinde) client-side
// filtreleniyor — listede hiç görünmesinler diye. Sıralama en yakın
// tarihten en uzağa.
export async function yakindaGelecekleriGetir() {
  const snap = await getDocs(query(collection(db, 'yakindaGelecekler')))
  const bugun = new Date().toISOString().slice(0, 10)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((k) => k.cikisTarihi >= bugun)
    .sort((a, b) => a.cikisTarihi.localeCompare(b.cikisTarihi))
}

export async function yakindaGelenSil(id) {
  await deleteDoc(doc(db, 'yakindaGelecekler', id))
}

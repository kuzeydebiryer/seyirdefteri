import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import { gorunenAdGetir } from './gorunenAd.js'
import { eserPuaniGetir } from './eserPuani.js'
import { elestirileriGetir } from './elestiri.js'
import { gelecekEtkinlikOlustur } from './gelecekEtkinlik.js'

// Bir kulüp etkinliğindeki eserin puanlarını, üyelerin ZATEN verdiği puanlardan
// (eserPuanlari — film sayfasındaki yıldızlar) kendiliğinden çeker; ayrıca
// girilmiş Eleştirmen cümlesi (elestiriler) varsa onu da ekler. Böylece kimsenin
// puanı ikinci kez girmesi gerekmez, üye puanını sonradan değiştirirse vitrin de
// güncellenir. Elestiri belgesinde ayrı bir puan varsa o önceliklidir.

// Üye listesi + profiller sayfa ömrü boyunca önbellekte: üyeler nadiren
// değişir, ama her anasayfa gösteriminde yeniden okumak gereksiz maliyet.
const uyeOnbellegi = new Map()

export async function kulupUyeleriniGetir(topluluklId) {
  if (uyeOnbellegi.has(topluluklId)) return uyeOnbellegi.get(topluluklId)
  const vaat = (async () => {
    const snap = await getDocs(collection(db, 'topluluklar', topluluklId, 'uyeler'))
    const profiller = await Promise.all(
      snap.docs.map(async (d) => {
        const p = await getDoc(doc(db, 'kullanicilar', d.id))
        return { uid: d.id, ...(p.exists() ? p.data() : { adSoyad: 'Bilinmeyen' }) }
      })
    )
    return profiller
  })()
  uyeOnbellegi.set(topluluklId, vaat)
  vaat.catch(() => uyeOnbellegi.delete(topluluklId))
  return vaat
}

export async function kulupPuanlariniGetir(etkinlik) {
  const disId = etkinlik.eserTmdbId
  if (!etkinlik.topluluklId || !disId || !etkinlik.eserTur) return []
  const [uyeler, elestiriler] = await Promise.all([
    kulupUyeleriniGetir(etkinlik.topluluklId),
    elestirileriGetir(etkinlik.id).catch(() => []),
  ])
  const puanlar = await Promise.all(uyeler.map((u) => eserPuaniGetir(etkinlik.eserTur, disId, u.uid).catch(() => null)))

  const liste = []
  uyeler.forEach((u, i) => {
    const el = elestiriler.find((e) => e.kullaniciId === u.uid)
    const puan = el?.puan ?? puanlar[i]?.puan ?? null
    if (puan == null && !el?.cumle) return
    liste.push({
      kullaniciId: u.uid,
      kullaniciAdi: gorunenAdGetir(u),
      kullaniciAdiKisa: u.kullaniciAdi || '',
      avatarUrl: u.avatarUrl || '',
      puan,
      cumle: el?.cumle || '',
      elestiriVar: !!el,
    })
  })
  return liste
}

// Film sayfasındaki "Kulüp Eleştirmenleri" panelinden: o film için topluluğun
// etkinliği zaten varsa tarihini günceller, yoksa yeni "Gelecek Etkinlik"
// oluşturur (aynı filme iki etkinlik açılmasın). Dönen değer { id, yeniMi }.
export async function filmEtkinligiKaydet({ topluluk, eser, tarih, kullanici }) {
  const mevcutSnap = await getDocs(
    query(collection(db, 'gelecekEtkinlikler'), where('topluluklId', '==', topluluk.id), where('eserTmdbId', '==', eser.eserTmdbId))
  )
  if (!mevcutSnap.empty) {
    const ref = mevcutSnap.docs[0].ref
    await updateDoc(ref, { tarih })
    return { id: ref.id, yeniMi: false }
  }
  await gelecekEtkinlikOlustur(topluluk.id, {
    baslik: `${eser.eserBaslik} — Film İnceleme`,
    aciklama: '',
    tarih,
    eser,
    topluluk,
    kullanici,
  })
  return { yeniMi: true }
}

export async function filmEtkinligiGetir(topluluklId, tmdbId) {
  const snap = await getDocs(
    query(collection(db, 'gelecekEtkinlikler'), where('topluluklId', '==', topluluklId), where('eserTmdbId', '==', Number(tmdbId)))
  )
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }
}

const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { setGlobalOptions } = require('firebase-functions/v2')

initializeApp()
const db = getFirestore()

// Küçük bir topluluk için gereksiz maliyetten kaçınmak adına bölge/eşzamanlılık
// sınırlarını düşük tutuyoruz — 2M ücretsiz çağrı/ay kotasının fersah fersah
// altında kalınıyor zaten, ama "yanlışlıkla ölçeklenme" riskine karşı bilinçli.
setGlobalOptions({ region: 'europe-west1', maxInstances: 5 })

// Bir topluluğun (belirtilen kişi hariç) tüm üye UID'lerini toplar.
async function topluluklarUyeUidleriGetir(topluluklId, haricUid) {
  const uyelerSnap = await db.collection('topluluklar').doc(topluluklId).collection('uyeler').get()
  return uyelerSnap.docs.map((d) => d.id).filter((uid) => uid !== haricUid)
}

// Bir kullanıcının takipçilerinin UID'lerini toplar — "takip aktivitesi"
// bildirimleri (biri bir kitaba başladı/bitirdi, günce paylaştı) için.
async function takipciUidleriGetir(uid) {
  const snap = await db.collection('kullanicilar').doc(uid).collection('takipciler').get()
  return snap.docs.map((d) => d.id)
}

// Hem UYGULAMA İÇİ bildirim kaydı (bildirimler koleksiyonu — bir bildirim
// merkezinde geri dönüp görülebilsin diye) hem de PUSH bildirimi (token'ı
// varsa) gönderir. İkisi ayrı kavramlar: uygulama içi kayıt HERKESE (push
// izni olsun olmasın) yazılır, push sadece token'ı olanlara gider.
async function bildirimleriYazVeGonder(aliciUidler, { tur, baslik, govde, url }) {
  if (aliciUidler.length === 0) return

  // 1) Uygulama içi bildirim merkezi kaydı — toplu yazım (batch).
  const batch = db.batch()
  aliciUidler.forEach((uid) => {
    const ref = db.collection('bildirimler').doc()
    batch.set(ref, {
      kullaniciId: uid,
      tur,
      baslik,
      govde,
      url,
      okunduMu: false,
      olusturmaTarihi: FieldValue.serverTimestamp(),
    })
  })
  await batch.commit()

  // 2) Push bildirimi — sadece cihaz token'ı olan alıcılara.
  const ciftler = []
  await Promise.all(
    aliciUidler.map(async (uid) => {
      const tokenSnap = await db.collection('kullanicilar').doc(uid).collection('bildirimTokenlari').get()
      tokenSnap.docs.forEach((d) => ciftler.push({ uid, token: d.id }))
    })
  )
  if (ciftler.length === 0) return

  const yanit = await getMessaging().sendEachForMulticast({
    tokens: ciftler.map((c) => c.token),
    notification: { title: baslik, body: govde },
    data: { url },
    webpush: { fcmOptions: { link: url } },
  })

  // Artık geçersiz (uygulama kaldırılmış, izin geri alınmış vb.) token'ları
  // temizle — aksi halde zamanla ölü token'lar birikip her seferinde boşuna
  // gönderim denemesi yapılır.
  const silinecekler = []
  yanit.responses.forEach((r, i) => {
    if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
      silinecekler.push(ciftler[i])
    }
  })
  await Promise.all(
    silinecekler.map((c) => db.collection('kullanicilar').doc(c.uid).collection('bildirimTokenlari').doc(c.token).delete())
  )
}

// Bir topluluğa yeni etkinlik eklendiğinde, o topluluğun (ekleyen hariç)
// tüm üyelerine bildirim gönderir.
exports.yeniEtkinlikBildirimi = onDocumentCreated('gelecekEtkinlikler/{etkinlikId}', async (event) => {
  const veri = event.data.data()
  if (!veri?.topluluklId) return
  const aliciUidler = await topluluklarUyeUidleriGetir(veri.topluluklId, veri.olusturanId)
  await bildirimleriYazVeGonder(aliciUidler, {
    tur: 'topluluk_etkinlik',
    baslik: `🏛 ${veri.topluluklAd || 'Topluluk'}`,
    govde: `Yeni etkinlik: ${veri.baslik}`,
    url: `/topluluk/${veri.topluluklId}`,
  })
})

// Bir topluluk sohbetine yeni mesaj gelince (Oscar/Festival gibi genel
// sohbetler hariç — sadece "topluluk_" önekli konumId'ler), o topluluğun
// (gönderen hariç) üyelerine bildirim gönderir.
exports.yeniSohbetMesajiBildirimi = onDocumentCreated('sohbetMesajlari/{mesajId}', async (event) => {
  const veri = event.data.data()
  if (!veri?.konumId?.startsWith('topluluk_')) return
  const topluluklId = veri.konumId.replace('topluluk_', '')
  const aliciUidler = await topluluklarUyeUidleriGetir(topluluklId, veri.kullaniciId)
  await bildirimleriYazVeGonder(aliciUidler, {
    tur: 'topluluk_sohbet',
    baslik: `💬 ${veri.kullaniciAdi || 'Biri'}`,
    govde: (veri.mesaj || '').slice(0, 120),
    url: `/topluluk/${topluluklId}`,
  })
})

// Takip aktivitesi #1: biri bir esere BAŞLADIĞINDA/BİTİRDİĞİNDE, takipçilerine
// haber verir. Sadece 'baslama'/'bitirme' olayları — normal puanlama (olayTuru
// boş) VEYA Letterboxd toplu içe aktarımı (o da olayTuru yazmıyor) TETİKLEMEZ,
// aksi halde birisi 3000 filmlik geçmişini içe aktardığında takipçilerine 3000
// bildirim gönderilirdi.
exports.yeniGunlukAktivitesiBildirimi = onDocumentCreated('gunlukKayitlari/{kayitId}', async (event) => {
  const veri = event.data.data()
  if (!['baslama', 'bitirme'].includes(veri?.olayTuru)) return
  const aliciUidler = await takipciUidleriGetir(veri.kullaniciId)
  const eylemMetni = veri.olayTuru === 'baslama' ? 'başladı' : 'bitirdi'
  const url = veri.tur === 'kitap' ? `/kitap/${veri.disId}` : veri.tur === 'dizi' ? `/dizi/${veri.disId}` : `/film/${veri.disId}`
  await bildirimleriYazVeGonder(aliciUidler, {
    tur: 'takip_aktivite',
    baslik: `👤 ${veri.kullaniciAdi || 'Takip ettiğin biri'}`,
    govde: `${veri.baslik} — ${eylemMetni}`,
    url,
  })
})

// Takip aktivitesi #2: biri günce (film/dizi/kitap/yazı/gezi/etkinlik) paylaştığında.
exports.yeniGonderiBildirimi = onDocumentCreated('gonderiler/{gonderiId}', async (event) => {
  const veri = event.data.data()
  if (!veri?.yazarId) return
  const aliciUidler = await takipciUidleriGetir(veri.yazarId)
  await bildirimleriYazVeGonder(aliciUidler, {
    tur: 'takip_aktivite',
    baslik: `✍️ ${veri.yazarAdi || 'Biri'}`,
    govde: `Yeni günce: ${veri.baslik}`,
    url: `/gonderi/${event.params.gonderiId}`,
  })
})


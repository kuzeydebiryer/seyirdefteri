const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { setGlobalOptions } = require('firebase-functions/v2')

initializeApp()
const db = getFirestore()

// Küçük bir topluluk için gereksiz maliyetten kaçınmak adına bölge/eşzamanlılık
// sınırlarını düşük tutuyoruz — 2M ücretsiz çağrı/ay kotasının fersah fersah
// altında kalınıyor zaten, ama "yanlışlıkla ölçeklenme" riskine karşı bilinçli.
setGlobalOptions({ region: 'europe-west1', maxInstances: 5 })

// Bir topluluğun (belirtilen kişi hariç) tüm üyelerinin bildirim token'larını
// {uid, token} çiftleri olarak toplar — geçersiz token'ları temizlerken hangi
// kullanıcıya ait olduğunu bilmemiz gerekiyor, bu yüzden erken düzleştirmiyoruz.
async function uyeTokenCiftleriGetir(topluluklId, haricUid) {
  const uyelerSnap = await db.collection('topluluklar').doc(topluluklId).collection('uyeler').get()
  const uidler = uyelerSnap.docs.map((d) => d.id).filter((uid) => uid !== haricUid)
  if (uidler.length === 0) return []

  const ciftler = []
  await Promise.all(
    uidler.map(async (uid) => {
      const tokenSnap = await db.collection('kullanicilar').doc(uid).collection('bildirimTokenlari').get()
      tokenSnap.docs.forEach((d) => ciftler.push({ uid, token: d.id }))
    })
  )
  return ciftler
}

// Bildirimi gönderir ve artık geçersiz (uygulama kaldırılmış, izin geri
// alınmış vb.) token'ları Firestore'dan siler — aksi halde zamanla ölü
// token'lar birikip her seferinde boşuna gönderim denemesi yapılır.
async function bildirimGonder(ciftler, baslik, govde, url) {
  if (ciftler.length === 0) return
  const yanit = await getMessaging().sendEachForMulticast({
    tokens: ciftler.map((c) => c.token),
    notification: { title: baslik, body: govde },
    data: { url },
    webpush: { fcmOptions: { link: url } },
  })

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
  const ciftler = await uyeTokenCiftleriGetir(veri.topluluklId, veri.olusturanId)
  await bildirimGonder(ciftler, `🏛 ${veri.topluluklAd || 'Topluluk'}`, `Yeni etkinlik: ${veri.baslik}`, `/topluluk/${veri.topluluklId}`)
})

// Bir topluluk sohbetine yeni mesaj gelince (Oscar/Festival gibi genel
// sohbetler hariç — sadece "topluluk_" önekli konumId'ler), o topluluğun
// (gönderen hariç) üyelerine bildirim gönderir.
exports.yeniSohbetMesajiBildirimi = onDocumentCreated('sohbetMesajlari/{mesajId}', async (event) => {
  const veri = event.data.data()
  if (!veri?.konumId?.startsWith('topluluk_')) return
  const topluluklId = veri.konumId.replace('topluluk_', '')
  const ciftler = await uyeTokenCiftleriGetir(topluluklId, veri.kullaniciId)
  await bildirimGonder(ciftler, `💬 ${veri.kullaniciAdi || 'Biri'}`, (veri.mesaj || '').slice(0, 120), `/topluluk/${topluluklId}`)
})

const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { onRequest } = require('firebase-functions/v2/https')
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

// Bir Kitapyurdu ürün linkinden kitap bilgilerini otomatik çeker. Tarayıcıdan
// doğrudan Kitapyurdu'na istek atmak CORS yüzünden engellenir — bu fonksiyon
// sunucu tarafında (CORS kısıtlaması olmadan) o sayfayı çekip veriyi ayıklıyor,
// istemciye sadece sonucu döndürüyor. Kötüye kullanımı (rastgele siteleri
// kazımak için "açık bir proxy" haline gelmesini) önlemek için sadece
// kitapyurdu.com linklerine izin veriyoruz.
//
// İki kaynaktan okuyoruz, öncelik sırasıyla:
// 1) schema.org/Book JSON-LD (<script type="application/ld+json">) — VARSA
//    en güvenilir kaynak, çoğu alanı (yazar/yayınevi/ISBN/sayfa sayısı dahil)
//    tek seferde, yapılandırılmış şekilde verir.
// 2) OpenGraph meta etiketleri (og:title/og:description/og:image) — JSON-LD
//    yoksa ya da eksikse yedek. Sadece başlık/özet/kapak verebiliyor,
//    yazar/ISBN/sayfa sayısı OpenGraph'ta genelde yok.
// Bulunamayan bir alan sessizce boş dönüyor — olmayan veriyi uydurmuyoruz.
exports.kitapBilgisiCek = onRequest({ cors: true }, async (req, res) => {
  const url = req.query.url
  if (typeof url !== 'string' || !url.startsWith('https://www.kitapyurdu.com/')) {
    res.status(400).json({ hata: 'Sadece kitapyurdu.com ürün linkleri desteklenir.' })
    return
  }
  try {
    // "SeyirdefteriBot" gibi açık bir bot kimliği birçok sitenin WAF'ı
    // tarafından otomatik reddediliyor (403) — gerçek bir tarayıcıya
    // benzeyen bir istek göndermek gerekiyor.
    const yanit = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        Referer: 'https://www.google.com/',
      },
    })
    if (!yanit.ok) {
      const ekAciklama = yanit.status === 403 ? ' Kitapyurdu bu isteği bot koruması yüzünden reddetmiş olabilir.' : ''
      res.status(502).json({ hata: `Sayfa açılamadı (${yanit.status}).${ekAciklama}` })
      return
    }
    const html = await yanit.text()

    const metaOku = (ozellik) => {
      const m = html.match(new RegExp(`<meta[^>]+property=["']${ozellik}["'][^>]+content=["']([^"']+)["']`, 'i'))
      return m ? m[1].trim() : ''
    }

    // schema.org/Book JSON-LD bloklarını tara — birden fazla <script> etiketi
    // olabilir (menü/breadcrumb için ayrı JSON-LD'ler de olabilir), Book/Product
    // tipinde olanı arıyoruz.
    let kitapJsonLd = null
    const scriptEslesmeleri = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
    for (const m of scriptEslesmeleri) {
      try {
        const veri = JSON.parse(m[1])
        const adaylar = Array.isArray(veri) ? veri : [veri]
        const bulunan = adaylar.find((v) => v['@type'] === 'Book' || v['@type'] === 'Product')
        if (bulunan) {
          kitapJsonLd = bulunan
          break
        }
      } catch {
        // bu blok geçerli JSON değil, bir sonrakine geç
      }
    }

    const yazarAdiCikar = (author) => {
      if (!author) return ''
      if (Array.isArray(author)) return author.map((a) => a.name || a).join(', ')
      return author.name || author || ''
    }

    const sonuc = {
      baslik: kitapJsonLd?.name || metaOku('og:title') || '',
      yazar: yazarAdiCikar(kitapJsonLd?.author) || '',
      yayinevi: kitapJsonLd?.publisher?.name || kitapJsonLd?.publisher || '',
      isbn: kitapJsonLd?.isbn || '',
      sayfaSayisi: kitapJsonLd?.numberOfPages || '',
      ozet: kitapJsonLd?.description || metaOku('og:description') || '',
      kapakUrl: kitapJsonLd?.image?.url || kitapJsonLd?.image || metaOku('og:image') || '',
    }

    if (!sonuc.baslik && !sonuc.kapakUrl) {
      res.status(404).json({ hata: 'Sayfadan hiçbir bilgi ayıklanamadı.' })
      return
    }
    res.json(sonuc)
  } catch (e) {
    res.status(500).json({ hata: e.message })
  }
})

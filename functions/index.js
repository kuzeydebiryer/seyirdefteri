const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { defineSecret } = require('firebase-functions/params')
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

// --- Film Müziği (Spotify) ---------------------------------------------
// Spotify'ın Client Credentials akışı bir "client secret" gerektiriyor —
// bu SADECE sunucu tarafında (burada) tutulmalı, tarayıcı koduna asla
// gömülmemeli (Spotify'ın geliştirici şartları da bunu yasaklıyor). Bu
// yüzden istemci doğrudan Spotify'a değil, bu fonksiyona istek atıyor.
//
// Sonuç Firestore'a önbelleklenir (filmMuzikleri/{tmdbId}) — aynı film için
// ikinci bir ziyaret Spotify'a hiç gitmez, sadece Firestore'dan okur (ve bu
// da zaten fonksiyonun İÇİNDE olduğu için istemci tarafında ekstra bir
// okuma maliyeti oluşturmaz).
const SPOTIFY_CLIENT_ID = defineSecret('SPOTIFY_CLIENT_ID')
const SPOTIFY_CLIENT_SECRET = defineSecret('SPOTIFY_CLIENT_SECRET')
const TMDB_API_KEY = defineSecret('TMDB_API_KEY')

let spotifyTokenOnbellek = { token: null, sonaErmeMs: 0 }

async function spotifyTokenGetir(clientId, clientSecret) {
  if (spotifyTokenOnbellek.token && Date.now() < spotifyTokenOnbellek.sonaErmeMs) {
    return spotifyTokenOnbellek.token
  }
  const yetki = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${yetki}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new HttpsError('unavailable', 'Spotify token alınamadı')
  const veri = await res.json()
  // Süresi dolmadan biraz önce (60sn pay) yenilenmiş sayalım.
  spotifyTokenOnbellek = { token: veri.access_token, sonaErmeMs: Date.now() + (veri.expires_in - 60) * 1000 }
  return veri.access_token
}

// Türkçe karakterleri sadeleştirip küçük harfe çeviren gevşek karşılaştırma
// — "Éric Serra" ile "eric serra" gibi ufak yazım farklarını tolere etsin.
// utils/metinNormallestir.js'teki aksansizKucultulmus ile AYNI mantık
// (Nobel yazar eşleştirmede de bu sıra önemliydi): önce NFD ile aksanları
// ayır ve sil, SONRA Türkçe yerel kurallarına göre küçült — sıra tersse
// "İ"/"I" gibi harfler yanlış eşleşir (Node.js'in de Türkçe locale desteği
// var, aynı fonksiyon burada sunucu tarafında yeniden yazıldı çünkü
// frontend'deki ES module dosyasını CommonJS fonksiyonlara import edemiyoruz).
function sadelestir(metin) {
  return (metin || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('tr-TR')
    .trim()
}

exports.filmMuzigiGetir = onCall({ secrets: [SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET] }, async (request) => {
  const { tmdbId, filmAdi, yil, bestekarAdi, zorlaYenile } = request.data || {}
  if (!tmdbId || !filmAdi) throw new HttpsError('invalid-argument', 'tmdbId ve filmAdi gerekli')

  const cacheRef = db.collection('filmMuzikleri').doc(String(tmdbId))
  if (!zorlaYenile) {
    const cacheSnap = await cacheRef.get()
    if (cacheSnap.exists) return cacheSnap.data()
  }

  try {
    const token = await spotifyTokenGetir(SPOTIFY_CLIENT_ID.value(), SPOTIFY_CLIENT_SECRET.value())
    const sorgu = yil ? `album:"${filmAdi}" year:${yil}` : `album:"${filmAdi}"`
    // Tek sonuç yerine birkaçını çekip, varsa bestekar adıyla eşleşeni
    // seçiyoruz — "Sil Baştan" sorununu (alakasız bir Türkçe şarkının
    // yanlışlıkla eşleşmesi) bu doğrulama önlüyor.
    const ararUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(sorgu)}&type=album&limit=5`
    const ararRes = await fetch(ararUrl, { headers: { Authorization: `Bearer ${token}` } })
    if (!ararRes.ok) throw new HttpsError('unavailable', 'Spotify araması başarısız')
    const ararVeri = await ararRes.json()
    const sonuclar = ararVeri.albums?.items || []

    let secilenAlbum = null
    let guvenSeviyesi = 'yuksek' // 'yuksek' (bestekar eşleşti) | 'orta' (yıl yakınlığı) | 'dusuk' (bestekarsız ilk sonuç)
    if (bestekarAdi) {
      const bestekarSade = sadelestir(bestekarAdi)
      secilenAlbum = sonuclar.find((a) => (a.artists || []).some((s) => sadelestir(s.name).includes(bestekarSade) || bestekarSade.includes(sadelestir(s.name))))

      // Bestekar hiçbir sonuçla eşleşmedi — bu genelde "various artists"
      // tarzı derleme soundtrack'lerde olur (tek bir bestekara bağlı değil).
      // İkinci bir sinyal olarak, filmin çıkış yılına EN YAKIN albümü kabul
      // ediyoruz (±1 yıl içindeyse) — kör kabul etmekten daha güvenli, ama
      // bestekar eşleşmesi kadar kesin değil, o yüzden ayrı bir güven
      // seviyesiyle işaretliyoruz.
      if (!secilenAlbum && yil) {
        let enYakin = null
        let enKucukFark = Infinity
        for (const a of sonuclar) {
          const albumYili = parseInt((a.release_date || '').slice(0, 4), 10)
          if (!albumYili) continue
          const fark = Math.abs(albumYili - Number(yil))
          if (fark <= 1 && fark < enKucukFark) {
            enKucukFark = fark
            enYakin = a
          }
        }
        if (enYakin) {
          secilenAlbum = enYakin
          guvenSeviyesi = 'orta'
        }
      }
    } else {
      secilenAlbum = sonuclar[0] || null
      guvenSeviyesi = 'dusuk'
    }

    const albumId = secilenAlbum?.id || null
    const sonuc = {
      spotifyAlbumId: albumId,
      guvenSeviyesi: albumId ? guvenSeviyesi : null,
      eslesenSanatci: secilenAlbum?.artists?.[0]?.name || null,
      guncellemeTarihi: FieldValue.serverTimestamp(),
    }
    await cacheRef.set(sonuc)
    return sonuc
  } catch (err) {
    // Spotify'da bu film için soundtrack bulunamaması NORMAL bir durum
    // (özellikle küçük/bağımsız yapımlarda) — hatayı da "bulunamadı" olarak
    // önbellekliyoruz ki her ziyarette tekrar tekrar aranmasın.
    const sonuc = { spotifyAlbumId: null, guncellemeTarihi: FieldValue.serverTimestamp() }
    await cacheRef.set(sonuc)
    return sonuc
  }
})

// --- Dizi Müziği (Spotify) ----------------------------------------------
// filmMuzigiGetir ile birebir aynı mantık — sadece arama sorgusu ve önbellek
// koleksiyonu diziye özel. Not: dizilerin çoğunda (filmlerin aksine) resmi
// bir "soundtrack albümü" Spotify'da yok — bu normal, isabet oranı filme
// göre daha düşük olacak, bulunamayan sessizce gizleniyor (widget kendi
// tarafında null'ı zaten görmezden geliyor).
exports.diziMuzigiGetir = onCall({ secrets: [SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET] }, async (request) => {
  const { tmdbId, diziAdi, yil, bestekarAdi, zorlaYenile } = request.data || {}
  if (!tmdbId || !diziAdi) throw new HttpsError('invalid-argument', 'tmdbId ve diziAdi gerekli')

  const cacheRef = db.collection('diziMuzikleri').doc(String(tmdbId))
  if (!zorlaYenile) {
    const cacheSnap = await cacheRef.get()
    if (cacheSnap.exists) return cacheSnap.data()
  }

  try {
    const token = await spotifyTokenGetir(SPOTIFY_CLIENT_ID.value(), SPOTIFY_CLIENT_SECRET.value())
    const sorgu = yil ? `album:"${diziAdi}" year:${yil}` : `album:"${diziAdi}"`
    const ararUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(sorgu)}&type=album&limit=5`
    const ararRes = await fetch(ararUrl, { headers: { Authorization: `Bearer ${token}` } })
    if (!ararRes.ok) throw new HttpsError('unavailable', 'Spotify araması başarısız')
    const ararVeri = await ararRes.json()
    const sonuclar = ararVeri.albums?.items || []

    let secilenAlbum = null
    let guvenSeviyesi = 'yuksek'
    if (bestekarAdi) {
      const bestekarSade = sadelestir(bestekarAdi)
      secilenAlbum = sonuclar.find((a) => (a.artists || []).some((s) => sadelestir(s.name).includes(bestekarSade) || bestekarSade.includes(sadelestir(s.name))))

      if (!secilenAlbum && yil) {
        let enYakin = null
        let enKucukFark = Infinity
        for (const a of sonuclar) {
          const albumYili = parseInt((a.release_date || '').slice(0, 4), 10)
          if (!albumYili) continue
          const fark = Math.abs(albumYili - Number(yil))
          if (fark <= 1 && fark < enKucukFark) {
            enKucukFark = fark
            enYakin = a
          }
        }
        if (enYakin) {
          secilenAlbum = enYakin
          guvenSeviyesi = 'orta'
        }
      }
    } else {
      secilenAlbum = sonuclar[0] || null
      guvenSeviyesi = 'dusuk'
    }

    const albumId = secilenAlbum?.id || null
    const sonuc = {
      spotifyAlbumId: albumId,
      guvenSeviyesi: albumId ? guvenSeviyesi : null,
      eslesenSanatci: secilenAlbum?.artists?.[0]?.name || null,
      guncellemeTarihi: FieldValue.serverTimestamp(),
    }
    await cacheRef.set(sonuc)
    return sonuc
  } catch (err) {
    const sonuc = { spotifyAlbumId: null, guncellemeTarihi: FieldValue.serverTimestamp() }
    await cacheRef.set(sonuc)
    return sonuc
  }
})

// --- Kulüp Etkinlik Hatırlatması ---------------------------------------
// Her gün Türkiye saatiyle 09:00'da çalışır, YARIN gerçekleşecek
// (gelecekEtkinlikler'deki) tüm etkinlikleri bulup katılımcı olarak
// işaretlenmiş kişilere bir hatırlatma bildirimi yollar. Etkinlik sayısı
// küçük bir topluluk için zaten çok az olduğundan (günde birkaç doküman
// okuması), tüm koleksiyonu çekip JS tarafında filtrelemek — özel bir
// composite index gerektiren bir sorgu kurmaktan daha basit ve güvenilir.
exports.etkinlikHatirlatmasi = onSchedule({ schedule: '0 9 * * *', timeZone: 'Europe/Istanbul' }, async () => {
  const yarinBaslangic = new Date()
  yarinBaslangic.setDate(yarinBaslangic.getDate() + 1)
  yarinBaslangic.setHours(0, 0, 0, 0)
  const yarinBitis = new Date(yarinBaslangic)
  yarinBitis.setHours(23, 59, 59, 999)

  const snap = await db.collection('gelecekEtkinlikler').get()
  const yarinkiEtkinlikler = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((e) => {
      if (!e.tarih) return false
      const t = new Date(e.tarih)
      return t >= yarinBaslangic && t <= yarinBitis
    })

  for (const etkinlik of yarinkiEtkinlikler) {
    const aliciUidler = etkinlik.katilacaklar || []
    if (aliciUidler.length === 0) continue
    await bildirimleriYazVeGonder(aliciUidler, {
      tur: 'etkinlik_hatirlatma',
      baslik: `⏰ Yarın: ${etkinlik.baslik}`,
      govde: etkinlik.topluluklAd ? `${etkinlik.topluluklAd} buluşması yarın` : 'Katılacağın bir etkinlik yarın',
      url: etkinlik.topluluklId ? `/topluluk/${etkinlik.topluluklId}` : '/etkinlikler',
    })
  }
})

// --- Gezi Planı Uçuş Check-in Hatırlatması ------------------------------
// Her gün 09:00'da (İstanbul saati), gidiş tarihi TAM 7 gün sonrası olan
// uçuşları bulup planın herkesine (sahip + ortak düzenleyenler) bildirim
// gönderiyor. Aynı uçuşa iki kez bildirim gitmesin diye uçuş nesnesine
// checkInBildirimGonderildi bayrağı yazılıyor — bu yüzden bulunan planlar
// TEK TEK updateDoc ile güncelleniyor (etkinlikHatirlatmasi'nden farklı
// olarak, o akış tekrarlanan bildirim riskini zaten "yarın" penceresiyle
// doğal olarak önlüyordu, burada 7 günlük sabit pencere olduğu için ayrı
// bir koruma gerekiyor).
// --- Platformlarda Yeni Eklenenler --------------------------------------
// TMDB'nin JustWatch verisinde "ne zaman eklendi" diye bir alan YOK — sadece
// "şu an mevcut mu" bilgisi var. Bu yüzden kendimiz takip ediyoruz: her gün,
// her platformun (popülerliğe göre ilk birkaç sayfasının) mevcut kataloğunu
// çekip bir önceki günün kaydıyla karşılıyoruz — dünde olmayıp bugün beliren
// ID'ler "yeni eklendi" sayılıyor. İLK ÇALIŞTIRMADA (önceki kayıt yoksa)
// hiçbir şey "yeni" sayılmıyor, sadece o günün kataloğu kaydediliyor —
// kıyaslayacak bir "dün" olmadan her şeyi "yeni" saymak yanlış olurdu.
//
// Platform listesi Platformlar.jsx'teki TANIDIK_PLATFORMLAR ile senkron
// tutulmalı — biri değişirse diğeri de güncellenmeli (iki ayrı kod tabanı
// -Vite/ESM frontend, Node/CJS functions- olduğu için paylaşılan tek bir
// dosyaları yok, elle senkron tutuyoruz).
const TAKIP_EDILEN_PLATFORM_ADLARI = ['Netflix', 'Amazon Prime Video', 'Disney Plus', 'Max', 'HBO Max', 'BluTV', 'Gain', 'MUBI', 'TOD', 'Apple TV', 'Apple TV+']
const TARANACAK_SAYFA_SAYISI = 10 // sayfa başı 20 sonuç → platform başına ~200 en popüler başlık

async function platformListesiGetir(apiKey) {
  const [filmRes, diziRes] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/watch/providers/movie?api_key=${apiKey}&watch_region=TR`).then((r) => r.json()),
    fetch(`https://api.themoviedb.org/3/watch/providers/tv?api_key=${apiKey}&watch_region=TR`).then((r) => r.json()),
  ])
  const hepsi = [...(filmRes.results || []), ...(diziRes.results || [])]
  const benzersiz = new Map()
  hepsi.forEach((p) => {
    if (TAKIP_EDILEN_PLATFORM_ADLARI.some((ad) => p.provider_name.toLowerCase().includes(ad.toLowerCase()))) {
      if (!benzersiz.has(p.provider_id)) benzersiz.set(p.provider_id, p)
    }
  })
  return [...benzersiz.values()]
}

async function platformKataloguGetir(apiKey, providerId, tmdbTuru) {
  const sonuclar = []
  for (let sayfa = 1; sayfa <= TARANACAK_SAYFA_SAYISI; sayfa++) {
    const url = `https://api.themoviedb.org/3/discover/${tmdbTuru}?api_key=${apiKey}&language=tr-TR&sort_by=popularity.desc&page=${sayfa}&with_watch_providers=${providerId}&watch_region=TR&with_watch_monetization_types=flatrate`
    const res = await fetch(url)
    const data = await res.json()
    if (!data.results?.length) break
    sonuclar.push(...data.results)
    if (sayfa >= (data.total_pages || 1)) break
  }
  return sonuclar
}

exports.platformYeniEklenenleriTespitEt = onSchedule({ schedule: '0 6 * * *', timeZone: 'Europe/Istanbul', secrets: [TMDB_API_KEY] }, async () => {
  const apiKey = TMDB_API_KEY.value()
  const platformlar = await platformListesiGetir(apiKey)

  for (const platform of platformlar) {
    for (const [tur, tmdbTuru] of [
      ['sinema', 'movie'],
      ['dizi', 'tv'],
    ]) {
      const katalog = await platformKataloguGetir(apiKey, platform.provider_id, tmdbTuru)
      const guncelIdler = katalog.map((k) => String(k.id))

      const snapshotRef = db.collection('platformKatalogSnapshot').doc(`${platform.provider_id}_${tur}`)
      const snapshotSnap = await snapshotRef.get()
      const oncekiIdler = snapshotSnap.exists ? snapshotSnap.data().idler || [] : null

      if (oncekiIdler) {
        const oncekiSet = new Set(oncekiIdler)
        const yeniIdler = guncelIdler.filter((id) => !oncekiSet.has(id))
        for (const yeniId of yeniIdler) {
          const eser = katalog.find((k) => String(k.id) === yeniId)
          await db.collection('platformYeniEklenenler').add({
            platformId: String(platform.provider_id),
            platformAdi: platform.provider_name,
            tur,
            disId: Number(yeniId),
            baslik: eser.title || eser.name || '',
            posterUrl: eser.poster_path ? `https://image.tmdb.org/t/p/w342${eser.poster_path}` : '',
            tespitTarihi: FieldValue.serverTimestamp(),
          })
        }
      }

      await snapshotRef.set({ idler: guncelIdler, guncellemeTarihi: FieldValue.serverTimestamp() })
    }
  }

  // Temizlik — "Son 30 Gün" gösterimi zaten sadece yakın tarihlileri
  // istiyor, 90 günden eski kayıtların kalıcı olarak durmasının hiçbir
  // faydası yok, sadece koleksiyonu sonsuza büyütüyor. Firestore toplu silme
  // işlemi başına en fazla 500 belge kabul ediyor, bu yüzden 400'lük
  // parçalar halinde siliniyor.
  const doksanGunOnce = new Date()
  doksanGunOnce.setDate(doksanGunOnce.getDate() - 90)
  const eskiKayitlarSnap = await db.collection('platformYeniEklenenler').where('tespitTarihi', '<', doksanGunOnce).get()
  const silinecekler = eskiKayitlarSnap.docs
  for (let i = 0; i < silinecekler.length; i += 400) {
    const parca = silinecekler.slice(i, i + 400)
    const batch = db.batch()
    parca.forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
})

// Yakında Gelecekler → otomatik geçiş. Her gün 06:00'da (platform tespitiyle
// aynı saatte), çıkış tarihi bugüne gelmiş ya da geçmiş duyuruları bulup,
// hedefTuru'ye göre doğru listeye (platformYeniEklenenler ya da
// dijitalYeniCikanlar) TAŞIYOR — aynı verileri yeni bir dokümana yazıp
// eskisini siliyor. Kullanıcı elle silmek zorunda kalmıyor, "Yakında
// Geliyor" listesi kendiliğinden temizleniyor ve içerik doğru yerde
// (platform sayfası / Dijitalde Yeni Çıkanlar) belirmeye devam ediyor.
exports.yakindaGelenleriGecisYap = onSchedule({ schedule: '10 6 * * *', timeZone: 'Europe/Istanbul' }, async () => {
  const bugunISO = new Date().toISOString().slice(0, 10)
  const snap = await db.collection('yakindaGelecekler').where('cikisTarihi', '<=', bugunISO).get()

  for (const belge of snap.docs) {
    const k = belge.data()
    if (k.hedefTuru === 'platform') {
      await db.collection('platformYeniEklenenler').add({
        platformId: k.platformId,
        platformAdi: k.platformAdi,
        tur: k.tur,
        disId: k.disId,
        baslik: k.baslik,
        posterUrl: k.posterUrl,
        tespitTarihi: FieldValue.serverTimestamp(),
      })
    } else {
      await db.collection('dijitalYeniCikanlar').add({
        tur: k.tur,
        disId: k.disId,
        baslik: k.baslik,
        alt: '',
        posterUrl: k.posterUrl,
        not: '',
        ekleyenId: k.ekleyenId,
        ekleyenAdi: k.ekleyenAdi,
        tarih: FieldValue.serverTimestamp(),
      })
    }
    await belge.ref.delete()
  }
})

exports.geziUcusCheckInHatirlatmasi = onSchedule({ schedule: '0 9 * * *', timeZone: 'Europe/Istanbul' }, async () => {
  const hedefGunBaslangic = new Date()
  hedefGunBaslangic.setDate(hedefGunBaslangic.getDate() + 7)
  hedefGunBaslangic.setHours(0, 0, 0, 0)
  const hedefGunBitis = new Date(hedefGunBaslangic)
  hedefGunBitis.setHours(23, 59, 59, 999)

  const snap = await db.collection('geziPlanlari').get()

  for (const belge of snap.docs) {
    const plan = belge.data()
    const ucuslar = plan.ucuslar || []
    let degisiklikVarMi = false

    for (const ucus of ucuslar) {
      if (ucus.checkInBildirimGonderildi || !ucus.gidisTarihSaat) continue
      const gidis = new Date(ucus.gidisTarihSaat)
      if (gidis < hedefGunBaslangic || gidis > hedefGunBitis) continue

      const aliciUidler = [plan.sahipId, ...(plan.ortakDuzenleyenler || [])].filter(Boolean)
      await bildirimleriYazVeGonder(aliciUidler, {
        tur: 'gezi_ucus_checkin',
        baslik: `✈️ Check-in zamanı yaklaşıyor`,
        govde: `${plan.baslik} — ${ucus.havayolu} uçuşuna bir hafta kaldı, check-in'i unutma`,
        url: `/gezi-plani/${belge.id}`,
      })
      ucus.checkInBildirimGonderildi = true
      degisiklikVarMi = true
    }

    if (degisiklikVarMi) {
      await belge.ref.update({ ucuslar })
    }
  }
})

// ortakDuzenleyenler dizisine YENİ eklenen kişi(ler) — genelde tek seferde
// bir kişi — plana davet edildiğine dair bildirim alır. Diziyi öncesi/
// sonrasıyla karşılaştırıp sadece FARKI (yeni eklenenleri) bildiriyoruz ki
// var olan ortak düzenleyicilere her güncellemede tekrar bildirim gitmesin.
exports.geziPlaniPaylasimBildirimi = onDocumentUpdated('geziPlanlari/{planId}', async (event) => {
  const onceki = event.data.before.data()
  const sonraki = event.data.after.data()
  const oncekiListe = new Set(onceki.ortakDuzenleyenler || [])
  const yeniEklenenler = (sonraki.ortakDuzenleyenler || []).filter((uid) => !oncekiListe.has(uid))
  if (yeniEklenenler.length === 0) return

  await bildirimleriYazVeGonder(yeniEklenenler, {
    tur: 'gezi_plani_paylasim',
    baslik: '🗺️ Bir gezi planına eklendin',
    govde: `${sonraki.sahipAdi || 'Biri'}, "${sonraki.baslik}" planına seni ekledi`,
    url: `/gezi-plani/${event.params.planId}`,
  })
})

// --- Kitap İstek Bildirimi -----------------------------------------------
// Biri "Şu kitabı arıyorum" isteği oluşturunca, o kitabı "Kitaplığımda"
// işaretlemiş herkese anında bildirim gidiyor — ayrı bir "bende var" akışına
// gerek kalmadan, zaten var olan Kitaplığım verisi üzerinden otomatik
// eşleştirme. rafOgeleri'nde ozelTur denormalize edildiği için (bkz.
// src/utils/raf.js) tek sorguda, ekstra bir join olmadan çalışıyor.
exports.kitapIstegiBildirimi = onDocumentCreated('kitapIstekleri/{istekId}', async (event) => {
  const istek = event.data.data()
  const sahiplerSnap = await db
    .collection('rafOgeleri')
    .where('disId', '==', istek.disId)
    .where('ozelTur', '==', 'kitapligim')
    .get()

  const sahipUidler = [...new Set(sahiplerSnap.docs.map((d) => d.data().kullaniciId))].filter((uid) => uid !== istek.isteyenId)
  if (sahipUidler.length === 0) return

  await bildirimleriYazVeGonder(sahipUidler, {
    tur: 'kitap_istegi',
    baslik: '📖 Kitaplığındaki bir kitap aranıyor',
    govde: `${istek.isteyenAdi}, sahip olduğun "${istek.baslik}" kitabını arıyor`,
    url: `/kitap-istekleri`,
  })
})

// v2 — İade tarihi hatırlatması. Her gün 09:00'da, iade tarihine TAM 1 gün
// kalan (yarına düşen) ödünç kayıtlarını bulup ödünç alan kişiye hatırlatma
// gönderiyor. Gezi Planı'ndaki uçuş check-in hatırlatmasıyla aynı kalıp —
// aynı gün tekrar bildirim gitmesin diye iadeHatirlatmaGonderildi bayrağı
// kullanılıyor.
exports.kitapIadeHatirlatmasi = onSchedule({ schedule: '0 9 * * *', timeZone: 'Europe/Istanbul' }, async () => {
  const yarin = new Date()
  yarin.setDate(yarin.getDate() + 1)
  const yarinISO = yarin.toISOString().slice(0, 10)

  const snap = await db
    .collection('kitapIstekleri')
    .where('durum', '==', 'oduncte')
    .where('iadeTarihi', '==', yarinISO)
    .get()

  for (const belge of snap.docs) {
    const istek = belge.data()
    if (istek.iadeHatirlatmaGonderildi) continue

    await bildirimleriYazVeGonder([istek.isteyenId], {
      tur: 'kitap_iade_hatirlatma',
      baslik: '📖 İade zamanı yaklaşıyor',
      govde: `"${istek.baslik}" kitabını yarın ${istek.oduncVerenAdi}'e iade etmeyi unutma`,
      url: `/kitap-istekleri`,
    })
    await belge.ref.update({ iadeHatirlatmaGonderildi: true })
  }
})

// --- Ödül Tahmin Kilidi Hatırlatması -------------------------------------
// Her gün 09:00'da, tören tarihine TAM 3 gün kalan ve henüz kilitlenmemiş
// (kilitli:false) sezonları bulup, o sezona en az bir tahmin girmiş
// herkese "tahminlerini tamamla, kilit yaklaşıyor" hatırlatması gönderiyor.
// Aynı sezon için iki kez bildirim gitmesin diye tahminHatirlatmaGonderildi
// bayrağı kullanılıyor — Gezi Planı uçuş hatırlatmasıyla aynı kalıp.
exports.odulTahminHatirlatmasi = onSchedule({ schedule: '0 9 * * *', timeZone: 'Europe/Istanbul' }, async () => {
  const ucGunSonra = new Date()
  ucGunSonra.setDate(ucGunSonra.getDate() + 3)
  const ucGunSonraISO = ucGunSonra.toISOString().slice(0, 10)

  const snap = await db.collection('oscarSezonlari').where('kilitli', '==', false).get()

  for (const belge of snap.docs) {
    const sezon = belge.data()
    if (sezon.tahminHatirlatmaGonderildi) continue
    if (!sezon.torenTarihi || sezon.torenTarihi.slice(0, 10) !== ucGunSonraISO) continue

    const tahminSnap = await db.collection('oscarTahminleri').where('sezonId', '==', belge.id).get()
    const kullaniciIdler = [...new Set(tahminSnap.docs.map((d) => d.data().kullaniciId))]
    if (kullaniciIdler.length === 0) continue

    await bildirimleriYazVeGonder(kullaniciIdler, {
      tur: 'odul_tahmin_hatirlatma',
      baslik: '🏆 Tahmin kilidi yaklaşıyor',
      govde: `${sezon.ad} 3 gün sonra — eksik kategorilerin varsa tahminlerini tamamlamayı unutma`,
      url: `/odul-toreni`,
    })
    await belge.ref.update({ tahminHatirlatmaGonderildi: true })
  }
})

// --- Instagram Gömme --------------------------------------------------
// 15 Haziran 2026'dan beri Meta'nın oEmbed uç noktası TOKEN GEREKTİRMİYOR
// (2020-2026 arası zorunluydu, kaldırıldı) — yine de tarayıcıdan doğrudan
// çağırmıyoruz çünkü graph.facebook.com rastgele origin'lerden gelen
// isteklere CORS izni vermiyor. Bu fonksiyon sadece bir vekil (proxy):
// herkese açık bir Instagram gönderisinin gömme HTML'ini alıp döndürüyor,
// hiçbir gizli anahtar/secret gerekmiyor.
exports.instagramGom = onCall(async (request) => {
  const { url } = request.data || {}
  if (!url || !url.includes('instagram.com')) {
    throw new HttpsError('invalid-argument', 'Geçerli bir Instagram gönderi linki gerekli')
  }
  // hidecaption=true: açıklama/hashtag/yorum kutusu bloğunu kaldırıyor —
  // sitedeki kart tasarımına göre bu, dikeyde çok yer kaplıyordu.
  // maxwidth=400: gömülen kartın genişliğini küçültüyor (varsayılan çok
  // geniş), boyu da orantılı küçülüyor. İkisi de Instagram'ın resmi,
  // desteklenen oEmbed parametreleri.
  const oembedUrl = `https://graph.facebook.com/v25.0/instagram_oembed?url=${encodeURIComponent(url)}&omitscript=false&hidecaption=true&maxwidth=400`
  const res = await fetch(oembedUrl)
  if (!res.ok) throw new HttpsError('unavailable', 'Bu gönderi bulunamadı — herkese açık ve doğru bir Instagram linki olduğundan emin ol')
  const veri = await res.json()
  return { html: veri.html, yazarAdi: veri.author_name || '' }
})

// X (Twitter) oEmbed — instagramGom/youtubeGom ile aynı mantık. X'in resmi
// oEmbed uç noktası (publish.x.com) de API anahtarı gerektirmiyor, ücretsiz
// ve kotasız — X'in kilitli/ücretli olan asıl Data API'siyle (arama, zaman
// tüneli çekme vb.) KARIŞTIRILMAMALI, bu farklı, herkese açık bir servis.
exports.twitterGom = onCall(async (request) => {
  const { url } = request.data || {}
  if (!url || !/(twitter\.com|x\.com)/.test(url)) {
    throw new HttpsError('invalid-argument', 'Geçerli bir X (Twitter) gönderi linki gerekli')
  }
  const oembedUrl = `https://publish.x.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`
  const res = await fetch(oembedUrl)
  if (!res.ok) throw new HttpsError('unavailable', 'Bu gönderi bulunamadı — herkese açık ve doğru bir X linki olduğundan emin ol')
  const veri = await res.json()
  return { html: veri.html, yazarAdi: veri.author_name || '' }
})

// YouTube oEmbed — aynı mantık, farklı platform. YouTube'un oEmbed uç
// noktası API ANAHTARI GEREKTİRMİYOR (arama gibi kotalı bir YouTube Data
// API v3 işlemi değil) — bu yüzden burada da tamamen ücretsiz ve sınırsız.
// Video başlığı, kanal adı ve embed HTML'i dönüyor.
exports.youtubeGom = onCall(async (request) => {
  const { url } = request.data || {}
  if (!url || !/(youtube\.com|youtu\.be)/.test(url)) {
    throw new HttpsError('invalid-argument', 'Geçerli bir YouTube video linki gerekli')
  }
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  const res = await fetch(oembedUrl)
  if (!res.ok) throw new HttpsError('unavailable', 'Bu video bulunamadı — herkese açık ve doğru bir YouTube linki olduğundan emin ol')
  const veri = await res.json()
  return { html: veri.html, baslik: veri.title || '', kanalAdi: veri.author_name || '', thumbnailUrl: veri.thumbnail_url || '' }
})

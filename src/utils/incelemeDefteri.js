import { collection, doc, getDoc, getDocs, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

// Film kulübünün "İnceleme Defteri": bir film etkinliği için ortak yazı alanları.
// Her bölüm gelecekEtkinlikler/{etkinlikId}/incelemeNotlari/{bolumId} altında ayrı
// bir belge — iki üye FARKLI bölümleri aynı anda yazabilir, birbirini ezmez.
// Kişisel notlar ise kisiselNotlar/{uid} altında, sadece sahibi okur/yazar.
// Bölüm listesi hem ekrandaki defterin hem yazdırılan şablonun TEK kaynağı.
export const INCELEME_BOLUMLERI = [
  { id: 'konu', baslik: 'Hikâyenin Hareketi', ikon: '📖', renk: '#8A5A00', ipucu: 'Başta kurulan çatışma neydi? Hangi anda yön değiştirdi (ya da değiştirmedi)? Bir-iki cümle yeter.' },
  { id: 'temalar', baslik: 'Temalar ve Olası Okumalar', ikon: '💭', renk: '#C0392B', ipucu: 'Film hangi gerilimi görünür kılıyor? Hangi sahne yorumunu destekliyor, hangisi zorluyor?' },
  { id: 'karakterler', baslik: 'Karakterler ve Oyunculuk', ikon: '👥', renk: '#1F6F8B', ipucu: 'Kim ne istiyor? Bir bakış, duraklama ya da jest bunu nasıl gösteriyor veya gizliyor?' },
  { id: 'gorsel', baslik: 'Görsel Dil ve Sinematografi', ikon: '🎥', renk: '#7B3F9E', ipucu: 'Kadraj bize neyi gösteriyor, neyi dışarıda bırakıyor? Işık, renk, kamera hareketi sahneye ne yapıyor?' },
  { id: 'kurgu', baslik: 'Kurgu, Müzik ve Ses', ikon: '🎼', renk: '#0F766E', ipucu: 'Hangi kesme, ses ya da sessizlik sahnenin ritmini veya anlamını değiştiriyor?' },
  { id: 'yonetmen', baslik: 'Yönetmenin Tercihleri', ikon: '🎬', renk: '#B45309', ipucu: 'Biçimsel tercihler ve etkisi. Varsa önceki filmleriyle bağı (zorunlu değil).' },
  { id: 'sahneler', baslik: 'Unutulmaz Sahneler ve Replikler', ikon: '💬', renk: '#B0185A', ipucu: 'Aklımızda kalan sahneler, alıntılamak istediğimiz replikler… (dakika yazmak isteğe bağlı)' },
  { id: 'semboller', baslik: 'Semboller ve Motifler', ikon: '🔍', renk: '#2E7D32', ipucu: 'Nerede tekrar ediyor? İkinci kullanım ilkini nasıl değiştiriyor? (Her filmde motif şart değil)' },
  { id: 'baglam', baslik: 'Bağlam ve Benzer Filmler', ikon: '🌍', renk: '#4B636E', ipucu: 'Bir bağlam bilgisi ya da başka bir film bu filmi nasıl farklı görmemizi sağlıyor?' },
  { id: 'sorular', baslik: 'Ortak Tartışma Soruları', ikon: '❓', renk: '#1565C0', ipucu: 'Etkinlikte hep birlikte konuşmak istediğimiz sorular. Mümkünse bir sahneye bağlayın.' },
]

// "Yakın Okuma": her üyenin kendi sahne notu + Zoom'a götüreceği soru.
// sahneNotlari/{uid} altında üye başına bir belge — herkes okur, yalnızca sahibi yazar.
export const SAHNE_ALANLARI = [
  { id: 'sahne', etiket: 'Sahne / yaklaşık dakika', ipucu: 'Örn. "Kapı kapanır, koridor sahnesi — 52. dk"', satir: 1, maks: 600 },
  { id: 'gordugum', etiket: 'Ne görüyorum veya duyuyorum?', ipucu: 'Önce yorum yapmadan tarif et: kadraj, ses, jest, söylenen söz…', satir: 3, maks: 2000 },
  { id: 'etki', etiket: 'Bunun etkisi ne?', ipucu: 'Bu sahne bende / filmde ne yaratıyor? Nereden anlıyorum?', satir: 3, maks: 2000 },
  { id: 'baska', etiket: 'Başka nasıl okunabilir?', ipucu: 'Farklı bir okuma mümkün mü? Hangi ayrıntı onu destekler?', satir: 3, maks: 2000 },
  { id: 'soru', etiket: "Zoom'a götüreceğim soru", ipucu: 'Grubun farklı cevaplar verebileceği bir soru. Mümkünse bir sahneye bağla.', satir: 2, maks: 1000 },
]

// Canlı dinleme: bir üye yazınca diğerlerinin ekranında da belirir.
export function incelemeBolumleriniDinle(etkinlikId, cb, hataCb) {
  return onSnapshot(
    collection(db, 'gelecekEtkinlikler', etkinlikId, 'incelemeNotlari'),
    (snap) => {
      const sonuc = {}
      snap.docs.forEach((d) => (sonuc[d.id] = d.data()))
      cb(sonuc)
    },
    hataCb
  )
}

// Kaydederken üzerine yazmaz, BİRLEŞTİRİR. `taban` = kullanıcının düzenlemeye başladığı
// andaki sunucu metni. Sunucudaki metin bu arada değiştiyse (başkası yazdıysa):
//  - kullanıcı sadece sonuna eklediyse → onun eklemesi sunucu metninin sonuna eklenir;
//  - başka yerde değiştirdiyse → tam metni, başkasının metninin altına "birleştirilen" notuyla eklenir.
// Döner: { metin, birlesti }
export async function incelemeBolumuKaydet(etkinlikId, bolumId, metin, taban, kullanici, ad) {
  const ref = doc(db, 'gelecekEtkinlikler', etkinlikId, 'incelemeNotlari', bolumId)
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const sunucu = snap.exists() ? snap.data().metin || '' : ''
    let son = metin
    let birlesti = false
    if (sunucu !== (taban || '') && sunucu !== metin) {
      birlesti = true
      if (metin.startsWith(taban || '')) {
        son = sunucu + metin.slice((taban || '').length)
      } else {
        son = `${sunucu}\n\n— ${ad || 'Üye'} (birleştirilen):\n${metin}`
      }
    }
    if (son.length > 6000) throw new Error('Birleşen metin çok uzun (6000 karakter sınırı). Bölümü kısaltıp tekrar kaydet.')
    tx.set(ref, { metin: son, guncelleyenId: kullanici.uid, guncelleyenAd: ad || '', tarih: serverTimestamp() })
    return { metin: son, birlesti }
  })
}

// Tek seferlik okuma (özet sayfası, Kulüp Hafızası araması).
export async function incelemeBolumleriniGetir(etkinlikId) {
  const snap = await getDocs(collection(db, 'gelecekEtkinlikler', etkinlikId, 'incelemeNotlari'))
  const sonuc = {}
  snap.docs.forEach((d) => (sonuc[d.id] = d.data()))
  return sonuc
}

export async function sahneNotlariniGetir(etkinlikId) {
  const snap = await getDocs(collection(db, 'gelecekEtkinlikler', etkinlikId, 'sahneNotlari'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export function sahneNotlariniDinle(etkinlikId, cb, hataCb) {
  return onSnapshot(
    collection(db, 'gelecekEtkinlikler', etkinlikId, 'sahneNotlari'),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    hataCb
  )
}

export async function sahneNotuKaydet(etkinlikId, kullanici, ad, alanlar) {
  const veri = { kullaniciId: kullanici.uid, kullaniciAdi: ad || '', tarih: serverTimestamp() }
  SAHNE_ALANLARI.forEach((a) => (veri[a.id] = (alanlar[a.id] || '').slice(0, a.maks)))
  await setDoc(doc(db, 'gelecekEtkinlikler', etkinlikId, 'sahneNotlari', kullanici.uid), veri)
}

export async function kisiselNotGetir(etkinlikId, uid) {
  const snap = await getDoc(doc(db, 'gelecekEtkinlikler', etkinlikId, 'kisiselNotlar', uid))
  return snap.exists() ? snap.data().metin || '' : ''
}

export async function kisiselNotKaydet(etkinlikId, uid, metin) {
  await setDoc(doc(db, 'gelecekEtkinlikler', etkinlikId, 'kisiselNotlar', uid), { metin, tarih: serverTimestamp() })
}

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY

// Künye (yönetmen, oyuncular, süre…) TMDB'den; etkinlik belgesinde sadece
// başlık/poster/yıl var.
export async function filmKunyesiGetir(tmdbId) {
  if (!TMDB_API_KEY || !tmdbId) return null
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=credits`)
    const d = await res.json()
    const ekip = d.credits?.crew || []
    return {
      orijinalBaslik: d.original_title || '',
      sureDk: d.runtime || null,
      turler: (d.genres || []).map((g) => g.name),
      ulkeler: (d.production_countries || []).map((c) => c.name),
      yonetmenler: ekip.filter((k) => k.job === 'Director').map((k) => k.name),
      senaristler: [...new Set(ekip.filter((k) => ['Screenplay', 'Writer', 'Story'].includes(k.job)).map((k) => k.name))].slice(0, 3),
      bestekar: ekip.find((k) => k.job === 'Original Music Composer')?.name || '',
      oyuncular: (d.credits?.cast || []).slice(0, 6).map((k) => k.name),
      ozet: d.overview || '',
      // Sinema Odası için ek alanlar (künye çekmecesi, ambiyans zemini)
      slogan: d.tagline || '',
      goruntuYonetmenleri: ekip.filter((k) => k.job === 'Director of Photography').map((k) => k.name),
      kurgucular: ekip.filter((k) => k.job === 'Editor').map((k) => k.name).slice(0, 2),
      kadro: (d.credits?.cast || []).slice(0, 12).map((k) => ({
        ad: k.name,
        karakter: k.character || '',
        foto: k.profile_path ? `https://image.tmdb.org/t/p/w185${k.profile_path}` : '',
      })),
      backdropUrl: d.backdrop_path ? `https://image.tmdb.org/t/p/w1280${d.backdrop_path}` : '',
      posterUrl: d.poster_path ? `https://image.tmdb.org/t/p/w342${d.poster_path}` : '',
    }
  } catch {
    return null
  }
}

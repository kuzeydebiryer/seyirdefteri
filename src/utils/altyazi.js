import { addDoc, collection, doc, deleteDoc, getDoc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'

// İnceleme Defteri "Altyazı: Repliği Bul". Altyazı, filmdeki bir ana dönmek için aranabilir bir
// DİZİN — oynatıcı değil. Üye bir repliği bulur, o ana kendi gözlemini bağlar, isterse
// Zoom Tartışma Modu slaytına taşır.
//
// Veri modeli (hepsi gelecekEtkinlikler/{etkinlikId} altında):
//   altyazilar/{aid}              → küçük bilgi belgesi: dil, sürüm, dosya adı, satır sayısı, ekleyen
//   altyazilar/{aid}/icerik/ana   → { satirlarJson } = [[basMs, bitMs, metin], …]  (listelemede okunmaz)
//   anNotlari/{nid}               → üye başına "an notu": hedef zaman, replik ALINTISI, yorum, soru, görünürlük
// Replik alıntısı nota kopyalanır: altyazı dosyası değişse/silinse de not ve alıntı kaybolmaz,
// sessizce başka bir repliğe de bağlanmaz.

export const ALTYAZI_MAKS_BAYT = 1.5 * 1024 * 1024
const ICERIK_MAKS_BAYT = 900000

// --- Zaman kodu --------------------------------------------------------------

export function zamanFormatla(ms) {
  const toplam = Math.max(0, Math.round((ms || 0) / 1000))
  const s = toplam % 60
  const d = Math.floor(toplam / 60) % 60
  const sa = Math.floor(toplam / 3600)
  return [sa, d, s].map((x) => String(x).padStart(2, '0')).join(':')
}

// "42:18", "1:02:03" ya da "00:42:18" → ms; geçersizse null.
export function zamanCoz(metin) {
  const m = (metin || '').trim().match(/^(?:(\d{1,2}):)?(\d{1,3}):(\d{2})$/)
  if (!m) return null
  const sa = m[1] ? parseInt(m[1], 10) : 0
  const d = parseInt(m[2], 10)
  const s = parseInt(m[3], 10)
  if (s > 59 || (m[1] && d > 59)) return null
  return ((sa * 60 + d) * 60 + s) * 1000
}

// --- .srt çözümleme ------------------------------------------------------------

// Türkçe altyazı dosyalarının çoğu eski Windows-1254 kodlamasında gelir; önce UTF-8'i dener,
// olmazsa Windows-1254 ile okur (yoksa ş/ğ/ı bozulur).
export async function dosyaMetniOku(dosya) {
  const buf = await dosya.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    return new TextDecoder('windows-1254').decode(buf)
  }
}

const zamanMs = (sa, d, s, kesir) => ((+sa * 60 + +d) * 60 + +s) * 1000 + Number(String(kesir).padEnd(3, '0').slice(0, 3))
const ZAMAN_SATIRI = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/

// Döner: [[basMs, bitMs, metin], …] (zamana göre sıralı). Geçersiz dosyada Error fırlatır.
export function srtCoz(ham) {
  const metin = (ham || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const satirlar = []
  for (const blok of metin.split(/\n{2,}/)) {
    const ls = blok.split('\n').filter((l) => l.trim() !== '')
    const i = ls.findIndex((l) => ZAMAN_SATIRI.test(l))
    if (i < 0) continue
    const m = ls[i].match(ZAMAN_SATIRI)
    const icerik = ls
      .slice(i + 1)
      .join('\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\{\\[^}]*\}/g, '')
      .trim()
    if (!icerik) continue
    satirlar.push([zamanMs(m[1], m[2], m[3], m[4]), zamanMs(m[5], m[6], m[7], m[8]), icerik])
  }
  if (satirlar.length < 20) {
    throw new Error('Bu dosya geçerli bir .srt altyazısı gibi görünmüyor (zaman kodlu en az 20 satır bulunamadı). Var olan altyazı değişmedi.')
  }
  return satirlar.sort((a, b) => a[0] - b[0])
}

// --- Arama (Türkçe karakter duyarlı) -----------------------------------------

const KATLA = { ı: 'i', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c', â: 'a', î: 'i', û: 'u', ê: 'e', é: 'e', è: 'e' }

// Küçült (tr-TR: I→ı, İ→i), aksan/Türkçe harfleri sadeleştir, noktalama→boşluk.
// Böylece "gorusuruz" da "Görüşürüz"ü bulur ama "I/ı" ile "İ/i" karışmaz.
export function normalle(t) {
  return (t || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[ışğüöçâîûêéè]/g, (c) => KATLA[c])
    .replace(/['’‘`´ʼ]/g, '') // İstanbul'a = Istanbula: kesme işareti iki yazımda da aynı bulunsun
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

const dizinOnbellegi = new WeakMap()

function dizinKur(satirlar) {
  if (dizinOnbellegi.has(satirlar)) return dizinOnbellegi.get(satirlar)
  const baslar = []
  const idx = []
  let birlesik = ''
  satirlar.forEach((s, i) => {
    const n = normalle(s[2])
    if (!n) return
    baslar.push(birlesik.length)
    idx.push(i)
    birlesik += n + ' '
  })
  const dizin = { birlesik, baslar, idx }
  dizinOnbellegi.set(satirlar, dizin)
  return dizin
}

function satirBul(baslar, konum) {
  let lo = 0
  let hi = baslar.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (baslar[mid] <= konum) lo = mid
    else hi = mid - 1
  }
  return lo
}

// Birden çok satıra yayılan replikleri de bulur (satırlar birleştirilmiş metinde aranır).
// Döner: [{ bas, son }] — altyazıdaki satır numaraları.
export function replikAra(satirlar, sorgu, limit = 40) {
  const q = normalle(sorgu)
  if (q.length < 2 || !satirlar?.length) return []
  const { birlesik, baslar, idx } = dizinKur(satirlar)
  const sonuclar = []
  let konum = birlesik.indexOf(q)
  let sonBas = -1
  while (konum !== -1 && sonuclar.length < limit) {
    const bas = idx[satirBul(baslar, konum)]
    const son = idx[satirBul(baslar, konum + q.length - 1)]
    if (bas !== sonBas) sonuclar.push({ bas, son })
    sonBas = bas
    konum = birlesik.indexOf(q, konum + 1)
  }
  return sonuclar
}

// --- Firestore: altyazı dosyaları --------------------------------------------

const altyaziKoleksiyonu = (etkinlikId) => collection(db, 'gelecekEtkinlikler', etkinlikId, 'altyazilar')
const icerikOnbellegi = new Map()

export function altyazilariDinle(etkinlikId, cb, hataCb) {
  return onSnapshot(
    altyaziKoleksiyonu(etkinlikId),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.tarih?.toMillis?.() ?? Date.now()) - (b.tarih?.toMillis?.() ?? Date.now()))),
    hataCb
  )
}

export async function altyaziIcerigiGetir(etkinlikId, altyaziId) {
  const k = `${etkinlikId}/${altyaziId}`
  if (icerikOnbellegi.has(k)) return icerikOnbellegi.get(k)
  const snap = await getDoc(doc(db, 'gelecekEtkinlikler', etkinlikId, 'altyazilar', altyaziId, 'icerik', 'ana'))
  if (!snap.exists()) throw new Error('Altyazı içeriği bulunamadı.')
  const satirlar = JSON.parse(snap.data().satirlarJson)
  icerikOnbellegi.set(k, satirlar)
  return satirlar
}

// satirlar zaten srtCoz ile doğrulanmış olmalı: geçersiz dosyada buraya hiç gelinmez, eski altyazı değişmez.
// Her yükleme YENİ bir belge oluşturur (üzerine yazmaz): eski altyazıya bağlı notlar bozulmaz.
export async function altyaziYukle(etkinlikId, kullanici, ad, { dil, surum, dosyaAdi, satirlar }) {
  const json = JSON.stringify(satirlar)
  if (new Blob([json]).size > ICERIK_MAKS_BAYT) throw new Error('Altyazı çok uzun (en fazla ~900 KB metin). Daha kısa bir dosya dene.')
  const aRef = doc(altyaziKoleksiyonu(etkinlikId))
  const batch = writeBatch(db)
  batch.set(aRef, {
    dil: (dil || '').slice(0, 40),
    surum: (surum || '').slice(0, 120),
    dosyaAdi: (dosyaAdi || '').slice(0, 200),
    satirSayisi: satirlar.length,
    sureMs: satirlar[satirlar.length - 1][1],
    ekleyenId: kullanici.uid,
    ekleyenAd: ad || '',
    tarih: serverTimestamp(),
  })
  batch.set(doc(aRef, 'icerik', 'ana'), { satirlarJson: json, ekleyenId: kullanici.uid })
  await batch.commit()
  icerikOnbellegi.set(`${etkinlikId}/${aRef.id}`, satirlar)
  return aRef.id
}

export async function altyaziSil(etkinlikId, altyaziId) {
  const aRef = doc(db, 'gelecekEtkinlikler', etkinlikId, 'altyazilar', altyaziId)
  const batch = writeBatch(db)
  batch.delete(doc(aRef, 'icerik', 'ana'))
  batch.delete(aRef)
  await batch.commit()
  icerikOnbellegi.delete(`${etkinlikId}/${altyaziId}`)
}

// --- Firestore: an notları -------------------------------------------------------
// Görünürlük: 'ozel' (sadece yazan) | 'kulup' (topluluk üyeleri). Kurallar bunu zorlar; bu yüzden
// iki ayrı sorgu (kendi notlarım + kulüple paylaşılanlar) birleştirilir.

const anKoleksiyonu = (etkinlikId) => collection(db, 'gelecekEtkinlikler', etkinlikId, 'anNotlari')
const birlestirVeSirala = (harita) => [...harita.values()].sort((a, b) => (a.hedefMs ?? 0) - (b.hedefMs ?? 0))

export function anNotlariniDinle(etkinlikId, uid, cb, hataCb) {
  const harita = { benim: new Map(), kulup: new Map() }
  const yay = () => cb(birlestirVeSirala(new Map([...harita.kulup, ...harita.benim])))
  const dinle = (anahtar, q) =>
    onSnapshot(
      q,
      (snap) => {
        harita[anahtar] = new Map(snap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]))
        yay()
      },
      hataCb
    )
  const u1 = dinle('benim', query(anKoleksiyonu(etkinlikId), where('kullaniciId', '==', uid)))
  const u2 = dinle('kulup', query(anKoleksiyonu(etkinlikId), where('gorunurluk', '==', 'kulup')))
  return () => {
    u1()
    u2()
  }
}

export async function anNotlariniGetir(etkinlikId, uid) {
  const [a, b] = await Promise.all([
    getDocs(query(anKoleksiyonu(etkinlikId), where('kullaniciId', '==', uid))),
    getDocs(query(anKoleksiyonu(etkinlikId), where('gorunurluk', '==', 'kulup'))),
  ])
  const harita = new Map()
  ;[...b.docs, ...a.docs].forEach((d) => harita.set(d.id, { id: d.id, ...d.data() }))
  return birlestirVeSirala(harita)
}

function anVerisiTemizle(v) {
  return {
    altyaziId: v.altyaziId || '',
    altyaziEtiketi: (v.altyaziEtiketi || '').slice(0, 160),
    satirNo: v.satirNo ?? null,
    orijinalMs: v.orijinalMs ?? null,
    hedefMs: v.hedefMs,
    replik: (v.replik || '').slice(0, 700),
    yorum: (v.yorum || '').slice(0, 2000),
    soru: (v.soru || '').slice(0, 500),
    gorunurluk: v.slaytta ? 'kulup' : v.gorunurluk === 'kulup' ? 'kulup' : 'ozel',
    slaytta: !!v.slaytta,
    yorumAcik: !!v.slaytta && !!v.yorumAcik,
    medyaId: v.medyaId || '',
  }
}

export async function anNotuEkle(etkinlikId, kullanici, ad, veri) {
  await addDoc(anKoleksiyonu(etkinlikId), { ...anVerisiTemizle(veri), kullaniciId: kullanici.uid, kullaniciAdi: ad || '', tarih: serverTimestamp() })
}

export async function anNotuGuncelle(etkinlikId, notId, kullanici, ad, veri) {
  await updateDoc(doc(db, 'gelecekEtkinlikler', etkinlikId, 'anNotlari', notId), {
    ...anVerisiTemizle(veri),
    kullaniciId: kullanici.uid,
    kullaniciAdi: ad || '',
  })
}

export async function anNotuSil(etkinlikId, notId) {
  await deleteDoc(doc(db, 'gelecekEtkinlikler', etkinlikId, 'anNotlari', notId))
}

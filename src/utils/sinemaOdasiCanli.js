import { collection, deleteDoc, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'
import { eserPuanla } from './eserPuani.js'

// 🎬 Sinema Odası — Faz 2 canlı katman (Firestore onSnapshot):
//   gelecekEtkinlikler/{id}/oda/durum             → sunum slaytı + puanlama aşaması (yalnızca moderatör yazar)
//   gelecekEtkinlikler/{id}/oda/durum/klaket/{uid} → söz isteme sırası
//   gelecekEtkinlikler/{id}/oda/durum/oyVerenler/{uid} → kim oy verdi (puansız)
//   gelecekEtkinlikler/{id}/oylar/{uid}            → gizli oy (açılana kadar yalnızca sahibi okur)

const durumRef = (eid) => doc(db, 'gelecekEtkinlikler', eid, 'oda', 'durum')

export const BOS_DURUM = {
  sunum: { acik: false, anahtar: 'kapak', sira: 0, acikYorumlar: {} },
  puanlama: { durum: 'bos', turId: 0 },
  adayOylamasi: { durum: 'kapali', kazananId: '' },
}

export function odaDurumuDinle(eid, cb, hataCb) {
  return onSnapshot(
    durumRef(eid),
    (s) => {
      const d = s.exists() ? s.data() : {}
      cb({
        sunum: { ...BOS_DURUM.sunum, ...(d.sunum || {}) },
        puanlama: { ...BOS_DURUM.puanlama, ...(d.puanlama || {}) },
        adayOylamasi: { ...BOS_DURUM.adayOylamasi, ...(d.adayOylamasi || {}) },
      })
    },
    hataCb
  )
}

// Moderatör: durum alanlarını birleştirerek yazar (iç içe alanlar korunur).
export function odaDurumuGuncelle(eid, uid, veri) {
  return setDoc(durumRef(eid), { ...veri, guncelleyenId: uid, guncellenme: serverTimestamp() }, { merge: true })
}

// --- Klaket (söz isteme) ---
export function klaketDinle(eid, cb, hataCb) {
  return onSnapshot(
    collection(db, 'gelecekEtkinlikler', eid, 'oda', 'durum', 'klaket'),
    (snap) => {
      const simdi = Date.now()
      const liste = snap.docs.map((d) => ({ uid: d.id, ad: d.data().ad, ms: d.data().zaman?.toMillis?.() ?? simdi }))
      cb(liste.sort((a, b) => a.ms - b.ms))
    },
    hataCb
  )
}
export const klaketIste = (eid, uid, ad) =>
  setDoc(doc(db, 'gelecekEtkinlikler', eid, 'oda', 'durum', 'klaket', uid), { ad: String(ad).slice(0, 60), zaman: serverTimestamp() })
export const klaketBirak = (eid, uid) => deleteDoc(doc(db, 'gelecekEtkinlikler', eid, 'oda', 'durum', 'klaket', uid))

// --- Gizli puanlama ---
export function oyVerenleriDinle(eid, cb, hataCb) {
  return onSnapshot(
    collection(db, 'gelecekEtkinlikler', eid, 'oda', 'durum', 'oyVerenler'),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))),
    hataCb
  )
}

// Puanlar açıldıktan sonra o turun tüm oyları (kural, açılmadan önce bu sorguyu reddeder).
export function oylariDinle(eid, turId, cb, hataCb) {
  return onSnapshot(
    query(collection(db, 'gelecekEtkinlikler', eid, 'oylar'), where('turId', '==', turId)),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))),
    hataCb
  )
}

export async function benimOyumuGetir(eid, uid) {
  const s = await getDoc(doc(db, 'gelecekEtkinlikler', eid, 'oylar', uid))
  return s.exists() ? s.data() : null
}

export async function oyVer(eid, uid, ad, puan, turId) {
  const b = writeBatch(db)
  const kisaAd = String(ad || 'Üye').slice(0, 60)
  b.set(doc(db, 'gelecekEtkinlikler', eid, 'oylar', uid), { kullaniciId: uid, ad: kisaAd, puan, turId, zaman: serverTimestamp() })
  b.set(doc(db, 'gelecekEtkinlikler', eid, 'oda', 'durum', 'oyVerenler', uid), { ad: kisaAd, turId, zaman: serverTimestamp() })
  await b.commit()
}

export function ortalamaHesapla(oylar) {
  const p = oylar.map((o) => o.puan).filter((x) => typeof x === 'number')
  if (!p.length) return null
  return Math.round((p.reduce((t, x) => t + x, 0) / p.length) * 100) / 100
}

export const puanYaz = (n, basamak = 1) =>
  n == null ? '–' : Number(n).toLocaleString('tr-TR', { minimumFractionDigits: Number.isInteger(n) ? 0 : basamak, maximumFractionDigits: basamak })

// Moderatör: kulüp ortalamasını etkinlik kaydına (Kulüp Hafızası / arşiv) işler.
export function ortalamayiKaydet(eid, ortalama, oySayisi) {
  return updateDoc(doc(db, 'gelecekEtkinlikler', eid), {
    kulupOrtalamasi: { puan: ortalama, oySayisi, kaydedilme: serverTimestamp() },
  })
}

// Üye: tören puanını kendi film puanına (5 yıldız, yarımlı) işler → Kulüp Eleştirmenleri de görür.
export const yildizaCevir = (puan10) => Math.round(puan10) / 2
export function puanimiFilmeIsle(etkinlik, uid, puan10) {
  return eserPuanla(etkinlik.eserTur || 'sinema', etkinlik.eserTmdbId, yildizaCevir(puan10), { uid }, {
    baslik: etkinlik.eserBaslik,
    posterUrl: etkinlik.eserPosterUrl,
    yil: etkinlik.eserYil,
  })
}

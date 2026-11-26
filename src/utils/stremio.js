import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

// 📺 Stremio / Nuvio katalog eklentisi — kişisel adres anahtarı.
// stremioAnahtarlari/{anahtar} → { kullaniciId, olusturma }. Anahtar tahmin edilemez (32 karakter);
// adresi bilen herkes katalogu görebilir, bu yüzden "Adresi yenile" eskisini iptal eder.

export const STREMIO_KOK = 'https://seyirdefteri.net/stremio'

function rastgeleAnahtar(uzunluk = 32) {
  const harfler = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const dizi = new Uint32Array(uzunluk)
  crypto.getRandomValues(dizi)
  return Array.from(dizi, (x) => harfler[x % harfler.length]).join('')
}

export async function stremioAnahtarimiGetir(uid) {
  const s = await getDocs(query(collection(db, 'stremioAnahtarlari'), where('kullaniciId', '==', uid)))
  return s.docs[0]?.id || null
}

export async function stremioAnahtariOlustur(uid) {
  const eskiler = await getDocs(query(collection(db, 'stremioAnahtarlari'), where('kullaniciId', '==', uid)))
  await Promise.all(eskiler.docs.map((d) => deleteDoc(d.ref)))
  const anahtar = rastgeleAnahtar()
  await setDoc(doc(db, 'stremioAnahtarlari', anahtar), { kullaniciId: uid, olusturma: serverTimestamp() })
  return anahtar
}

export async function stremioAnahtariniIptalEt(uid) {
  const eskiler = await getDocs(query(collection(db, 'stremioAnahtarlari'), where('kullaniciId', '==', uid)))
  await Promise.all(eskiler.docs.map((d) => deleteDoc(d.ref)))
}

export const manifestAdresi = (anahtar) => `${STREMIO_KOK}/${anahtar}/manifest.json`
// Stremio uygulamasını doğrudan "eklenti yükle" ekranında açar.
export const stremioUygulamaAdresi = (anahtar) => manifestAdresi(anahtar).replace(/^https:\/\//, 'stremio://')

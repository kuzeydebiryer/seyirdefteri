// Bir kerelik geriye dönük hesaplama — eserIstatistikleri/kisiIstatistikleri
// özet koleksiyonları eklendiğinde, o ana kadar verilmiş puanlar bu özete hiç
// yansımamış oluyordu ("Bizim Aramızda Popüler" listeleri boşalırdı). Bu
// fonksiyon, TEK SEFERLİK olarak gonderiler+eserPuanlari+kisiDegerlendirmeleri'ni
// tarayıp özet kayıtlarını sıfırdan (doğru sayılarla) oluşturur/üzerine yazar.
// Not: Bu fonksiyon BİLEREK tüm koleksiyonları tarıyor — ama sadece bir kez,
// elle tetiklendiğinde çalışıyor; sayfa yüklemelerinde ASLA çağrılmıyor.

import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

async function eserleriYenidenHesapla(tur) {
  const gruplar = new Map() // disId -> { baslik, alt, posterUrl, yil, puanToplam, puanSayisi }

  function ekle(disId, veri, puan) {
    if (!disId || puan == null) return
    if (!gruplar.has(disId)) {
      gruplar.set(disId, {
        baslik: veri.baslik || '',
        alt: veri.alt || veri.yazar || veri.yonetmen || '',
        posterUrl: veri.posterUrl || '',
        yil: veri.yil || '',
        puanToplam: 0,
        puanSayisi: 0,
      })
    }
    const kayit = gruplar.get(disId)
    kayit.puanToplam += puan
    kayit.puanSayisi += 1
  }

  const gonderilerSnap = await getDocs(query(collection(db, 'gonderiler'), where('tur', '==', tur)))
  gonderilerSnap.docs.forEach((d) => {
    const v = d.data()
    const disId = tur === 'kitap' ? v.googleBooksId : v.tmdbId
    ekle(disId, v, v.kullaniciPuani)
  })

  const puanlarSnap = await getDocs(query(collection(db, 'eserPuanlari'), where('tur', '==', tur)))
  puanlarSnap.docs.forEach((d) => {
    const v = d.data()
    ekle(v.disId, v, v.puan)
  })

  await Promise.all(
    Array.from(gruplar.entries()).map(([disId, k]) =>
      setDoc(doc(db, 'eserIstatistikleri', `${tur}_${disId}`), { tur, disId, ...k })
    )
  )
  return gruplar.size
}

async function kisileriYenidenHesapla() {
  const gruplar = new Map()
  const snap = await getDocs(collection(db, 'kisiDegerlendirmeleri'))
  snap.docs.forEach((d) => {
    const v = d.data()
    if (!v.kisiTmdbId || v.puan == null) return
    if (!gruplar.has(v.kisiTmdbId)) {
      gruplar.set(v.kisiTmdbId, { kisiAdi: v.kisiAdi || '', kisiFotoUrl: v.kisiFotoUrl || '', puanToplam: 0, puanSayisi: 0 })
    }
    const kayit = gruplar.get(v.kisiTmdbId)
    kayit.puanToplam += v.puan
    kayit.puanSayisi += 1
  })
  await Promise.all(
    Array.from(gruplar.entries()).map(([kisiTmdbId, k]) =>
      setDoc(doc(db, 'kisiIstatistikleri', String(kisiTmdbId)), { kisiTmdbId, ...k })
    )
  )
  return gruplar.size
}

export async function tumIstatistikleriYenidenHesapla(ilerlemeGuncelle) {
  const sonuclar = {}
  for (const tur of ['sinema', 'dizi', 'kitap']) {
    ilerlemeGuncelle?.(`${tur} eserleri hesaplanıyor...`)
    sonuclar[tur] = await eserleriYenidenHesapla(tur)
  }
  ilerlemeGuncelle?.('Kişiler hesaplanıyor...')
  sonuclar.kisiler = await kisileriYenidenHesapla()
  return sonuclar
}

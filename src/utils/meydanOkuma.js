import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import { izlenecekGetir } from './izlenecek.js'

function meydanOkumaRef(id) {
  return doc(db, 'meydanOkumalar', id)
}

export async function meydanOkumaOlustur(kullanici, profil, veri) {
  const belge = await addDoc(collection(db, 'meydanOkumalar'), {
    sahipId: kullanici.uid,
    sahipAdi: profil?.adSoyad || kullanici.displayName || 'İsimsiz',
    sahipAvatarUrl: profil?.avatarUrl || '',
    herkeseAcik: false,
    gunlukKayitlar: {},
    olusturmaTarihi: serverTimestamp(),
    ...veri,
  })
  return belge.id
}

export async function meydanOkumalariGetir(uid) {
  const q = query(collection(db, 'meydanOkumalar'), where('sahipId', '==', uid))
  const snap = await getDocs(q)
  const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  liste.sort((a, b) => (b.olusturmaTarihi?.toMillis?.() || 0) - (a.olusturmaTarihi?.toMillis?.() || 0))
  return liste
}

// Başka birinin profilinde SADECE herkese açık meydan okumaları getirir.
export async function herkeseAcikMeydanOkumalariGetir(uid) {
  const q = query(collection(db, 'meydanOkumalar'), where('sahipId', '==', uid), where('herkeseAcik', '==', true))
  const snap = await getDocs(q)
  const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  liste.sort((a, b) => (b.olusturmaTarihi?.toMillis?.() || 0) - (a.olusturmaTarihi?.toMillis?.() || 0))
  return liste
}

export async function meydanOkumaGuncelle(id, kismiVeri) {
  await updateDoc(meydanOkumaRef(id), kismiVeri)
}

export async function meydanOkumaSil(id) {
  await deleteDoc(meydanOkumaRef(id))
}

// Ritüel tipi meydan okumalarda bugünün check-in'ini kaydeder/günceller.
// girisTipi 'evet_hayir' için deger=true/false, 'sayi' için deger=sayı.
export async function ritualCheckinYap(id, tarihISO, deger) {
  await updateDoc(meydanOkumaRef(id), { [`gunlukKayitlar.${tarihISO}`]: deger })
}

// --- İlerleme hesaplama --------------------------------------------------
// Medya bazlı (sayısal/eser) türlerde ilerleme, kullanıcının zaten yaptığı
// puanlama/izleme davranışından OTOMATİK türetiliyor — meydan okumaya özel
// hiçbir manuel "tik" gerekmiyor. Bunun için mevcut gunlukKayitlari ve
// izlenecekler koleksiyonlarını okuyoruz (yeni bir yazma yolu açmıyoruz).
export async function meydanOkumaIlerlemesiHesapla(mo, uid) {
  if (mo.tur === 'sayisal') {
    const q = query(collection(db, 'gunlukKayitlari'), where('kullaniciId', '==', uid), where('tur', '==', mo.medyaTuru))
    const snap = await getDocs(q)
    const bas = new Date(mo.baslangicTarihi)
    const bit = new Date(mo.bitisTarihi + 'T23:59:59')
    const tamamlananIdler = new Set()
    snap.docs.forEach((d) => {
      const k = d.data()
      if (k.olayTuru === 'baslama') return // sadece başlama olayı — tamamlanma sayılmaz
      const tarih = k.izlemeTarihi?.toDate?.()
      if (!tarih || tarih < bas || tarih > bit) return
      tamamlananIdler.add(String(k.disId))
    })
    return { yapilan: tamamlananIdler.size, hedef: mo.hedefSayi }
  }

  if (mo.tur === 'eser') {
    const kayit = await izlenecekGetir(uid, mo.iliskiliTur, mo.iliskiliDisId)
    return { yapilan: kayit?.durum === 'tamamlandi' ? 1 : 0, hedef: 1 }
  }

  if (mo.tur === 'rituel') {
    const kayitlar = mo.gunlukKayitlar || {}
    if (mo.girisTipi === 'sayi') {
      const toplam = Object.values(kayitlar).reduce((t, v) => t + (Number(v) || 0), 0)
      return { yapilan: toplam, hedef: mo.hedefSayi }
    }
    const yapilanGun = Object.values(kayitlar).filter(Boolean).length
    const toplamGun = gunFarkiHesapla(mo.baslangicTarihi, mo.bitisTarihi)
    return { yapilan: yapilanGun, hedef: toplamGun }
  }

  return { yapilan: 0, hedef: 1 }
}

export function gunFarkiHesapla(baslangicISO, bitisISO) {
  const bas = new Date(baslangicISO)
  const bit = new Date(bitisISO)
  return Math.max(1, Math.round((bit - bas) / (1000 * 60 * 60 * 24)) + 1)
}

export function kalanGunHesapla(bitisISO) {
  const bugun = new Date(new Date().toISOString().slice(0, 10))
  const bit = new Date(bitisISO)
  return Math.round((bit - bugun) / (1000 * 60 * 60 * 24))
}

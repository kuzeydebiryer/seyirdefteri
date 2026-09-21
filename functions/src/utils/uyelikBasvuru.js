import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import { uretDavetKodu } from './davetKodu.js'

// Davet kodu olmayanlar için üyelik başvurusu — kimlik doğrulama
// gerektirmiyor (henüz üye değiller), herkes başvurabilir. Onay, mevcut
// üyelerin kendi davet kotasından bir kod üretip başvuruya bağlamasıyla
// oluyor — ayrı bir "yönetici" rolü icat etmek yerine, sitenin zaten var
// olan "davet hakkı" mekanizmasını yeniden kullanıyoruz.
export async function basvuruGonder({ ad, eposta, mesaj }) {
  await addDoc(collection(db, 'uyelikBasvurulari'), {
    ad,
    eposta,
    mesaj: mesaj || '',
    durum: 'bekliyor',
    olusturmaTarihi: serverTimestamp(),
  })
}

export async function bekleyenBasvurulariGetir() {
  const q = query(collection(db, 'uyelikBasvurulari'), where('durum', '==', 'bekliyor'))
  const snap = await getDocs(q)
  const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  liste.sort((a, b) => (a.olusturmaTarihi?.toMillis?.() || 0) - (b.olusturmaTarihi?.toMillis?.() || 0))
  return liste
}

// Onay: yeni bir davet kodu üretip (onaylayan üyenin kendi kotasından
// düşerek) başvuruya işliyor — başvuru sahibine bu kodu elle (e-posta vb.)
// iletmek onaylayan kişiye kalıyor.
// Onay: yeni bir davet kodu üretip (onaylayan üyenin kendi kotasından
// düşerek) başvuruya işliyor — başvuru sahibine bu kodu elle (e-posta vb.)
// iletmek onaylayan kişiye kalıyor. Mevcut "davet hakkı" ekonomisiyle
// tutarlı olsun diye (bkz. Profil.jsx davetKoduOlustur) onaylayanın hakkı
// da burada düşülüyor — bu akış, o mekanizmayı BYPASS ETMİYOR.
export async function basvuruOnayla(basvuru, onaylayanUid, onaylayanAdi) {
  const kullaniciRef = doc(db, 'kullanicilar', onaylayanUid)
  const kullaniciSnap = await getDoc(kullaniciRef)
  const kalanHak = kullaniciSnap.exists() ? kullaniciSnap.data().kalanDavetHakki || 0 : 0
  if (kalanHak <= 0) throw new Error('Davet hakkın kalmamış, onaylayamazsın.')

  const kod = uretDavetKodu()
  await setDoc(doc(db, 'davetKodlari', kod), { olusturanId: onaylayanUid, kullanildiMi: false, olusturmaTarihi: serverTimestamp() })
  await updateDoc(kullaniciRef, { kalanDavetHakki: kalanHak - 1 })
  await updateDoc(doc(db, 'uyelikBasvurulari', basvuru.id), {
    durum: 'onaylandi',
    onaylayanId: onaylayanUid,
    onaylayanAdi: onaylayanAdi || '',
    davetKodu: kod,
    onayTarihi: serverTimestamp(),
  })
  return kod
}

export async function basvuruReddet(basvuruId) {
  await updateDoc(doc(db, 'uyelikBasvurulari', basvuruId), { durum: 'reddedildi' })
}

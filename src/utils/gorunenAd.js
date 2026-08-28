import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'

// Sitede iki isim var: adSoyad (herkeste zorunlu) ve kullaniciAdi (kayıt
// sırasında herkes belirliyor, ama şimdiye kadar sadece kendi profilinde
// "@kullaniciadi" olarak görünüyordu). Bu fonksiyon, profildeki
// gorunumTercihi alanına göre hangisinin gösterileceğine karar veriyor —
// varsayılan 'adSoyad' (tercih hiç değiştirilmemişse eski davranış aynen
// sürüyor). Yorum/günce/paylaşım gibi bir şeyi KAYDEDEN her yerde, o anki
// kullanici.displayName yerine bu fonksiyon çağrılmalı.
export function gorunenAdGetir(profil, yedekAd) {
  if (profil?.gorunumTercihi === 'kullaniciAdi' && profil?.kullaniciAdi) return profil.kullaniciAdi
  return profil?.adSoyad || yedekAd || 'İsimsiz'
}

// Profildeki gorunumTercihi değiştiğinde, geçmişte yazılmış yorum/günce/
// paylaşım/alıntı kayıtları OTOMATİK güncellenmiyor (isim kaydı yazıldığı
// anda o kaydın içine kopyalanıyor — performans için, her gösterimde ayrı
// profil sorgusu atmamak adına). Bu fonksiyon, isteyen kullanıcının KENDİ
// kayıtlarını (sadece kendi uid'siyle eşleşenleri) dört ana koleksiyonda
// tarayıp güncel isimle YENİDEN yazıyor — profil sayfasında "Geçmişimi de
// Güncelle" butonuna basınca çağrılıyor, otomatik değil (kullanıcının
// bilinçli tercihiyle).
export async function gecmisPaylasimlariGuncelle(uid, yeniAd) {
  let toplamGuncellenen = 0

  const koleksiyonlar = [
    { ad: 'yorumlar', sahipAlani: 'yazarId', isimAlani: 'yazarAdi' },
    { ad: 'gunlukKayitlari', sahipAlani: 'kullaniciId', isimAlani: 'kullaniciAdi' },
    { ad: 'ilhamPanosu', sahipAlani: 'paylasanId', isimAlani: 'paylasanAdi' },
    { ad: 'alintilar', sahipAlani: 'kullaniciId', isimAlani: 'kullaniciAdi' },
  ]

  for (const { ad, sahipAlani, isimAlani } of koleksiyonlar) {
    const snap = await getDocs(query(collection(db, ad), where(sahipAlani, '==', uid)))
    const guncellenecekler = snap.docs.filter((d) => d.data()[isimAlani] !== yeniAd)
    for (let i = 0; i < guncellenecekler.length; i += 400) {
      const parca = guncellenecekler.slice(i, i + 400)
      const batch = writeBatch(db)
      parca.forEach((d) => batch.update(d.ref, { [isimAlani]: yeniAd }))
      await batch.commit()
    }
    toplamGuncellenen += guncellenecekler.length
  }

  return toplamGuncellenen
}

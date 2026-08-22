function tariheDevir(deger) {
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  return isNaN(d.getTime()) ? null : d
}

// "Yılın Özeti" (istatistik kartları) ve "Günlük" sekmesinin (liste) AYNI
// olayları göstermesini garanti eden TEK hesaplama. Eskiden ikisi ayrı ayrı
// hesaplanıyordu — Yılın Özeti gunlukKayitlari + gonderiler + eserPuanlari
// üçünü birleştirirken, Günlük sekmesi sadece gunlukKayitlari'nı
// gösteriyordu. Bir puanlama/gönderi gerçek bir günlük satırı OLUŞTURMADAN
// kaydedildiyse (eski veri, silinen bir günlük kaydı, ya da farklı yıla
// düşen bir oluşturma tarihi), istatistikte SAYILIYOR ama Günlük'te hiç
// GÖRÜNMÜYORDU — "hayalet" kayıt. Artık ikisi de bu fonksiyonun döndürdüğü
// TEK listeden besleniyor, sayılar yapısal olarak asla birbirinden
// sapamıyor.
export function buYilOlaylariHesapla(yil, gonderiler, eserPuanlarim, gunlukKayitlari = []) {
  const eserAnahtari = (tur, disId) => `${tur}_${disId}`
  const gunlukKapsananlar = new Set(gunlukKayitlari.map((g) => eserAnahtari(g.tur, g.disId)))

  const gunlukOlaylari = gunlukKayitlari.map((g) => ({
    id: g.id,
    tur: g.tur,
    disId: g.disId,
    baslik: g.baslik,
    posterUrl: g.posterUrl,
    yil: g.yil,
    tarih: g.izlemeTarihi,
    izlemeTarihi: g.izlemeTarihi,
    puan: g.puan,
    not: g.not,
    tekrarMi: g.tekrarMi,
    olayTuru: g.olayTuru,
    kaynak: 'gunluk',
  }))

  const buYilGonderiler = gonderiler.filter((g) => tariheDevir(g.tarih)?.getFullYear() === yil)
  const gonderiOlaylari = buYilGonderiler
    .filter((g) => g.posterUrl || g.tur === 'gezi' || g.tur === 'etkinlik')
    .map((g) => ({
      id: g.id,
      tur: g.tur,
      disId: g.tur === 'gezi' || g.tur === 'etkinlik' ? g.id : g.tmdbId || g.googleBooksId,
      baslik: g.baslik,
      posterUrl: g.posterUrl,
      yil: g.yil,
      tarih: g.tarih,
      izlemeTarihi: g.tarih,
      puan: g.kullaniciPuani,
      kaynak: 'gonderi',
      gonderiId: g.id,
    }))
    .filter((g) => !gunlukKapsananlar.has(eserAnahtari(g.tur, g.disId)))

  const buYilPuanlar = eserPuanlarim.filter((e) => tariheDevir(e.tarih)?.getFullYear() === yil)
  const puanOlaylari = buYilPuanlar
    .filter((e) => e.gunlukVar !== true)
    .filter((e) => !gunlukKapsananlar.has(eserAnahtari(e.tur, e.disId)))
    .filter((e) => !gonderiOlaylari.some((g) => g.tur === e.tur && g.disId === e.disId))
    .map((e) => ({
      id: e.id,
      tur: e.tur,
      disId: e.disId,
      baslik: e.baslik,
      posterUrl: e.posterUrl,
      yil: e.yil,
      tarih: e.tarih,
      izlemeTarihi: e.tarih,
      puan: e.puan,
      kaynak: 'puan',
    }))

  // KRİTİK: üç kaynak birleştirilince sıralama kaybolmuştu — Firestore'dan
  // gunlukKayitlari zaten sıralı geliyordu ama gonderiOlaylari/puanOlaylari
  // birleşince ay grupları (Ağustos→Temmuz→Ağustos→...) karışık çıkıyordu.
  // Aylara göre gruplama mantığı (GunlukListesi.jsx) sıralı bir dizi
  // BEKLEDİĞİ için bu sıralama şart.
  const hepsi = [...gunlukOlaylari, ...gonderiOlaylari, ...puanOlaylari]
  hepsi.sort((a, b) => {
    const ta = tariheDevir(a.tarih)?.getTime() || 0
    const tb = tariheDevir(b.tarih)?.getTime() || 0
    return tb - ta
  })
  return hepsi
}

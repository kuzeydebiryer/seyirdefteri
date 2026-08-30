// "Korku Sineması"nın sadece bir örnek olduğu, ileride Bilim Kurgu/Fantastik,
// Dram-Suç-Bağımsız, Komedi-Aksiyon gibi başka ana türlerin de ekleneceği
// belirtildiği için, tek seferlik bir "Korku" sayfası yerine VERİ GÜDÜMLÜ bir
// yapı kuruldu — yeni bir ana tür eklemek, buraya bir obje eklemekten ibaret,
// yeni bir bileşen/sayfa yazmaya gerek yok (bkz. SinemaAltTurleri.jsx,
// SinemaAltTuruDetay.jsx).
//
// anahtarKelimeIdleri: TMDB'nin GENRE'ları (with_genres) sadece ~19 geniş
// kategoriyi biliyor — "Folk Horror", "Giallo" gibi ince alt türler TMDB'de
// tür değil, topluluk tarafından etiketlenen ANAHTAR KELİME (keyword) olarak
// yaşıyor (bkz. /discover/movie?with_keywords=X). Her ID, TMDB'nin
// /search/keyword uç noktasından elle doğrulanıp buraya sabitlendi — tahmini
// değil, gerçek film örnekleriyle test edildi.
//
// tmdbDiziTurId: TMDB'nin dizi (tv) tür listesinde "Korku" diye bir kategori
// YOK (TV türleri: Aksiyon&Macera, Animasyon, Komedi, Suç, Belgesel, Dram,
// Aile, Çocuk, Gizem, Haber, Reality, Bilim Kurgu&Fantastik, Pembe Dizi,
// Talk, Savaş&Politika, Vahşi Batı — Korku hiç yok). Bu yüzden dizi
// aramalarında tür kısıtı UYGULANMIYOR, sadece anahtar kelime yeterli
// (null bırakılan alanlar bu yüzden bilerek boş).
export const SINEMA_ALT_TURLERI = {
  korku: {
    ad: 'Korku Sineması',
    ikon: '🎃',
    tmdbFilmTurId: 27,
    tmdbDiziTurId: null,
    altTurler: [
      { id: 'folk-horror', ad: 'Folk Horror', ikon: '🌾', anahtarKelimeIdleri: [209568] },
      { id: 'beden-korkusu', ad: 'Beden Korkusu', ikon: '🩸', anahtarKelimeIdleri: [283085] },
      { id: 'giallo-slasher', ad: 'Giallo & Slasher', ikon: '🔪', anahtarKelimeIdleri: [272242, 12339] },
      { id: 'buluntu-film', ad: 'Buluntu Film', ikon: '📹', anahtarKelimeIdleri: [163053] },
    ],
  },
  // İleride: bilimkurgu, dram-suc-bagimsiz, komedi-aksiyon — her biri aynı
  // şekilde { ad, ikon, tmdbFilmTurId, tmdbDiziTurId, altTurler } ile eklenir.
  // Anahtar kelime ID'leri eklenmeden ÖNCE mutlaka TMDB'de doğrulanmalı
  // (bkz. Korku'nun doğrulama süreci) — tahmini ID kullanmak boş/zayıf bir
  // sekmeyle sonuçlanabilir.
}

export function altTurBul(anaTurId, altTurId) {
  const anaTur = SINEMA_ALT_TURLERI[anaTurId]
  if (!anaTur) return null
  const altTur = anaTur.altTurler.find((a) => a.id === altTurId)
  if (!altTur) return null
  return { anaTur, altTur }
}

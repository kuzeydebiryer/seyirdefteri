// "En İyi Film Listeleri" (Letterboxd 500, IMDb 250, 1001 Film, Criterion)
// sabit listeler — üyelik SADECE yönetici elle bir içe aktarma/düzeltme
// yaptığında değişiyor, yani günlük bir veri değil. Film sayfası rozetleri
// (filminListeSiralariGetir) ve "O mu Bu mu" oyun havuzu bu yüzden 30 günlük
// bir önbellekten besleniyor — aynı embed/OMDb önbelleklerindeki desen,
// sadece süre çok daha uzun (veri çok daha az değişken olduğu için).
const BELLEK_ONBELLEK = new Map()
const DEPOLAMA_ANAHTARI_ONEKI = 'disListe_onbellek_'
const GECERLILIK_SURESI_MS = 30 * 24 * 60 * 60 * 1000 // 30 gün

export function disListeOnbellektenOku(anahtar) {
  if (BELLEK_ONBELLEK.has(anahtar)) return BELLEK_ONBELLEK.get(anahtar)
  try {
    const ham = localStorage.getItem(DEPOLAMA_ANAHTARI_ONEKI + anahtar)
    if (!ham) return undefined
    const { veri, zaman } = JSON.parse(ham)
    if (Date.now() - zaman > GECERLILIK_SURESI_MS) return undefined
    BELLEK_ONBELLEK.set(anahtar, veri)
    return veri
  } catch {
    return undefined
  }
}

export function disListeOnbellegeYaz(anahtar, veri) {
  BELLEK_ONBELLEK.set(anahtar, veri)
  try {
    localStorage.setItem(DEPOLAMA_ANAHTARI_ONEKI + anahtar, JSON.stringify({ veri, zaman: Date.now() }))
  } catch {
    // localStorage dolu/kapalı olabilir — sessizce geç, bellek içi önbellek zaten çalışıyor
  }
}

// Yönetici bir düzeltme yaptığında (film silme, liste düzenleme, toplu
// içe aktarma) KENDİ tarayıcısında önbellek hemen temizlenmeli — yoksa
// 30 gün boyunca kendi düzeltmesinin işe yarayıp yaramadığını göremez.
// Hangi anahtarın etkilendiğini tek tek izlemek yerine (karmaşık, hataya
// açık), her mutasyonda TÜMÜNÜ temizlemek daha basit ve güvenli — bu
// işlemler zaten nadir (sadece yönetici, sadece elle).
export function disListeOnbellegiTemizle() {
  BELLEK_ONBELLEK.clear()
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(DEPOLAMA_ANAHTARI_ONEKI))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    // localStorage kapalı olabilir — sessizce geç
  }
}

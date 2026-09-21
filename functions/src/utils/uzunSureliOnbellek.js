// Genel amaçlı, uzun süreli (30 gün) önbellek — yönetici tarafından nadiren
// düzenlenen ama sık okunan küratörlü veriler için (bkz. "En İyi Film
// Listeleri" ve "Sinemasal Alt Türler" kullanımları — ikisi de her film
// sayfası ziyaretinde okunuyordu, veri ise sadece yönetici elle bir şey
// eklediğinde/sildiğinde değişiyor). Her özellik kendi "adAlanı"
// (namespace) ile çağırıyor ki biri kendi önbelleğini temizlerken
// diğerini yanlışlıkla etkilemesin.
const BELLEK_ONBELLEK = new Map()
const DEPOLAMA_ANAHTARI_ONEKI = 'uzunOnbellek_'
const GECERLILIK_SURESI_MS = 30 * 24 * 60 * 60 * 1000 // 30 gün

export function uzunSureliOnbellektenOku(adAlani, anahtar) {
  const tamAnahtar = `${adAlani}_${anahtar}`
  if (BELLEK_ONBELLEK.has(tamAnahtar)) return BELLEK_ONBELLEK.get(tamAnahtar)
  try {
    const ham = localStorage.getItem(DEPOLAMA_ANAHTARI_ONEKI + tamAnahtar)
    if (!ham) return undefined
    const { veri, zaman } = JSON.parse(ham)
    if (Date.now() - zaman > GECERLILIK_SURESI_MS) return undefined
    BELLEK_ONBELLEK.set(tamAnahtar, veri)
    return veri
  } catch {
    return undefined
  }
}

export function uzunSureliOnbellegeYaz(adAlani, anahtar, veri) {
  const tamAnahtar = `${adAlani}_${anahtar}`
  BELLEK_ONBELLEK.set(tamAnahtar, veri)
  try {
    localStorage.setItem(DEPOLAMA_ANAHTARI_ONEKI + tamAnahtar, JSON.stringify({ veri, zaman: Date.now() }))
  } catch {
    // localStorage dolu/kapalı olabilir — sessizce geç, bellek içi önbellek zaten çalışıyor
  }
}

// Yönetici bir düzeltme yaptığında (ekleme/silme/düzenleme) KENDİ
// tarayıcısında, SADECE o özelliğin (adAlani) önbelleği hemen temizlenmeli
// — yoksa 30 gün boyunca kendi değişikliğinin işe yarayıp yaramadığını
// göremez. Diğer özelliklerin önbelleği (farklı adAlani) etkilenmiyor.
export function uzunSureliOnbellegiTemizle(adAlani) {
  const onek = `${adAlani}_`
  ;[...BELLEK_ONBELLEK.keys()].filter((k) => k.startsWith(onek)).forEach((k) => BELLEK_ONBELLEK.delete(k))
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(DEPOLAMA_ANAHTARI_ONEKI + onek))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    // localStorage kapalı olabilir — sessizce geç
  }
}

// Instagram/YouTube/X gömme sonuçları (oEmbed HTML'i) her url için pratikte
// hiç değişmiyor — ama önceden her sayfa ziyaretinde, aynı gönderi tekrar
// görüntülendiğinde bile, Cloud Function'a (instagramGom/youtubeGom/
// twitterGom) yeniden istek atılıyordu. Bu, en çok çağrılan üç fonksiyonun
// invocation sayısını gereksiz yere şişiriyordu. Şimdi hem bellek içi (aynı
// oturumda anında) hem localStorage (bir sonraki ziyarette de) önbellek var
// — bir url için sonuç bir kez geldi mi, 30 gün boyunca tekrar istenmiyor.
// Sadece BAŞARILI sonuçlar önbelleğe yazılıyor — bir hata geçici olabilir,
// onu önbelleklersek gerçek bir düzelme fırsatını kaçırırız.
const BELLEK_ONBELLEK = new Map()
const DEPOLAMA_ANAHTARI_ONEKI = 'gomulme_onbellek_'
const GECERLILIK_SURESI_MS = 30 * 24 * 60 * 60 * 1000 // 30 gün

export function gomulmeOnbellektenOku(url) {
  if (BELLEK_ONBELLEK.has(url)) return BELLEK_ONBELLEK.get(url)
  try {
    const ham = localStorage.getItem(DEPOLAMA_ANAHTARI_ONEKI + url)
    if (!ham) return undefined
    const { html, zaman } = JSON.parse(ham)
    if (Date.now() - zaman > GECERLILIK_SURESI_MS) return undefined
    BELLEK_ONBELLEK.set(url, html)
    return html
  } catch {
    return undefined
  }
}

export function gomulmeOnbellegeYaz(url, html) {
  if (!html) return // sadece başarılı sonuçlar önbelleğe yazılır
  BELLEK_ONBELLEK.set(url, html)
  try {
    localStorage.setItem(DEPOLAMA_ANAHTARI_ONEKI + url, JSON.stringify({ html, zaman: Date.now() }))
  } catch {
    // localStorage dolu/kapalı olabilir — sessizce geç, bellek içi önbellek zaten çalışıyor
  }
}

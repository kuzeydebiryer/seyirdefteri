// TMDB, Türkiye'de aktif OLAN her sağlayıcıyı döndürüyor — bunların çoğu
// (küçük yerel VOD servisleri, TV kanalı uygulamaları vb.) kullanıcıların
// aradığı "büyük" platformlar değil. Listeyi bilinen, tanıdık platformlarla
// sınırlıyoruz — 40-50 satırlık bir kalabalık yerine, gerçekten arananlar.
//
// Platformlar.jsx (platform ızgarası) ve izlemeYeri.js (Oscar Yolculuğu gibi
// "bu film nerede izlenir" rozetleri için) burayı birlikte kullanıyor — liste
// tek yerden yönetiliyor, ikisi arasında birbirinden farklı sonuç çıkmasın.
export const TANIDIK_PLATFORMLAR = [
  'Netflix',
  'Amazon Prime Video',
  'Disney Plus',
  'Max',
  'HBO Max',
  'BluTV',
  'Gain',
  'MUBI',
  'TOD',
  'Apple TV',
  'Apple TV+',
]

// "Nerede izlenir" rozetlerinde (bkz. izlemeYeri.js) her platformu kendi
// tematik rengiyle göstermek için — tek düze bir "mürekkep" rengi yerine
// Netflix kırmızı, HBO Max mor, Disney+ mavi gibi anında tanınan renkler.
// Sıra ÖNEMLİ: daha özel adlar (ör. "HBO Max") daha genel olanlardan
// (ör. "Max") ÖNCE gelmeli, yoksa "HBO Max" yanlışlıkla "Max" rengini alır.
const PLATFORM_RENKLERI = [
  ['HBO Max', '#5822B4'],
  ['Max', '#002BE7'],
  ['Netflix', '#E50914'],
  ['Amazon Prime Video', '#00A8E1'],
  ['Disney Plus', '#113CCF'],
  ['Disney+', '#113CCF'],
  ['BluTV', '#0096FF'],
  ['Gain', '#7B2FF7'],
  ['MUBI', '#FF5000'],
  ['TOD', '#E30613'],
  ['Apple TV+', '#1D1D1F'],
  ['Apple TV', '#1D1D1F'],
]

export function platformRengiGetir(providerName) {
  if (!providerName) return null
  const adiKucuk = providerName.toLowerCase()
  const eslesme = PLATFORM_RENKLERI.find(([ad]) => adiKucuk.includes(ad.toLowerCase()))
  return eslesme ? eslesme[1] : null
}

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

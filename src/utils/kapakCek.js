// Cloud Functions v2 için Firebase'in standart, tahmin edilebilir URL kalıbı
// (bkz. functions/index.js — setGlobalOptions region: 'europe-west1').
const PROJE_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID

// Bir Kitapyurdu ürün linkinden kitap bilgilerini (varsa: başlık, yazar,
// yayınevi, ISBN, sayfa sayısı, özet, kapak) çeker. Bulunamayan alanlar boş
// string olarak döner — çağıran taraf sadece dolu olanları forma yansıtmalı.
export async function kitapyurdundanBilgiCek(kitapyurduLinki) {
  const url = `https://europe-west1-${PROJE_ID}.cloudfunctions.net/kitapBilgisiCek?url=${encodeURIComponent(kitapyurduLinki)}`
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(data.hata || 'Bilgi çekilemedi.')
  return data
}

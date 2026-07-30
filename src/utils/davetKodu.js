// Karışabilecek karakterleri (0/O, 1/I) dışarıda tutan okunaklı kod üretici
const KARAKTERLER = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function uretDavetKodu(uzunluk = 8) {
  let kod = ''
  for (let i = 0; i < uzunluk; i++) {
    kod += KARAKTERLER[Math.floor(Math.random() * KARAKTERLER.length)]
  }
  return kod
}

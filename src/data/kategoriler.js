export const KATEGORI_BILGI = {
  sinema: { etiket: 'Sinema', ikon: '🎬', renk: '#3F6C68', oran: 'dikey' },
  kitap: { etiket: 'Kitap', ikon: '📚', renk: '#C9A227', oran: 'dikey' },
  yazi: { etiket: 'Yazı', ikon: '✍️', renk: '#B33A3A', oran: 'dikey' },
  gezi: { etiket: 'Gezi', ikon: '🧭', renk: '#5B6F52', oran: 'yatay' },
  etkinlik: { etiket: 'Etkinlik', ikon: '🎭', renk: '#6B4E71', oran: 'yatay' },
}

export function kategoriBilgi(tur) {
  return KATEGORI_BILGI[tur] || KATEGORI_BILGI.sinema
}

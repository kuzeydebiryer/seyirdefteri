// Yazı içeriğini paragraf, görsel, başlık ve alıntı bloklarına ayırır.
// Kural bilerek çok basit tutuldu — tam bir Markdown editörü değil, sadece
// birkaç işaret: `# Başlık`, `> Alıntı`, satır içinde `*kalın metin*`, ve
// tek satırlık bir görsel URL'i otomatik görsele dönüşüyor. Yeni bir editör
// kütüphanesi öğrenmeye gerek yok.

const GORSEL_DESENI = /^https?:\/\/\S+\.(jpg|jpeg|png|gif|webp|avif)(\?\S*)?$/i

// Gönderi içine gömülmüş bir film/dizi/kitap/oyuncu referansı — GonderiEkle.jsx
// içindeki "🎬📚 Eser Ekle" akışı (EserSecici) tarafından, kendi paragrafı
// olarak tek satırlık bir JSON blok halinde ekleniyor: @@eser:{"tur":...}.
// Elle yazan biri için gizli/teknik görünse de, kullanıcı bunu hiç görmüyor —
// sadece "Eser Ekle" butonuyla dolduruluyor.
const ESER_DESENI = /^@@eser:(\{[\s\S]*\})$/

export function icerikBloklariniAyir(metin) {
  if (!metin) return []
  const bloklar = metin
    .split(/\n\s*\n/)
    .map((blok) => blok.trim())
    .filter(Boolean)
    .map((blok) => {
      const eserEslesme = blok.match(ESER_DESENI)
      if (eserEslesme) {
        try {
          return { tip: 'eser', veri: JSON.parse(eserEslesme[1]) }
        } catch {
          // Bozuk/eski bir JSON'sa sessizce düz metne düş — sayfa çökmesin.
        }
      }
      if (GORSEL_DESENI.test(blok)) return { tip: 'gorsel', url: blok }
      if (blok.startsWith('# ')) return { tip: 'baslik', icerik: blok.slice(2).trim() }
      if (blok.startsWith('> ')) {
        const satirlar = blok.split('\n').map((s) => s.replace(/^>\s?/, ''))
        return { tip: 'alinti', icerik: satirlar.join('\n') }
      }
      return { tip: 'metin', icerik: blok }
    })

  // Art arda gelen 'eser' bloklarını tek bir 'eser-listesi' bloğunda
  // topluyor — "en iyi 10 film" gibi art arda eklenmiş referanslar, tek tek
  // büyük kartlar yerine numaralı, yatay bir liste şeridi olarak gösterilsin
  // diye (bkz. GomuluEserSeridi.jsx). Tek bir referans da (uzunluk 1) aynı
  // yoldan geçiyor — GomuluEserSeridi tek öğeyi farklı (daha büyük) render ediyor.
  const gruplanmis = []
  for (const blok of bloklar) {
    const sonuncu = gruplanmis[gruplanmis.length - 1]
    if (blok.tip === 'eser') {
      if (sonuncu?.tip === 'eser-listesi') sonuncu.ogeler.push(blok.veri)
      else gruplanmis.push({ tip: 'eser-listesi', ogeler: [blok.veri] })
    } else {
      gruplanmis.push(blok)
    }
  }
  return gruplanmis
}

// Ham gönderi metninin içindeki TÜM @@eser: referanslarını, konumlarıyla
// (index + eşleşen tam metin) birlikte bulur — GonderiEkle.jsx'teki
// "Eklenen Eserler" yönetim listesi (çıkarma/sıralama) bunu kullanıyor.
// icerikBloklariniAyir'dan farklı olarak blok/paragraf ayrımı yapmadan
// metnin tamamını tarar, böylece kaldırma/taşıma işlemleri ham metin
// üzerinde doğrudan (index tabanlı) string işlemi olarak yapılabiliyor.
const ESER_TARAMA_DESENI = /@@eser:(\{[^\n]*\})/g

export function eserReferanslariniBul(metin) {
  if (!metin) return []
  const sonuc = []
  for (const m of metin.matchAll(ESER_TARAMA_DESENI)) {
    try {
      sonuc.push({ index: m.index, tamMetin: m[0], veri: JSON.parse(m[1]) })
    } catch {
      // Bozuk JSON — yönetim listesinde göstermeye çalışma.
    }
  }
  return sonuc
}

// `*kalın metin*` içeren bir paragrafı, sırayla düz/kalın parçalara böler —
// GonderiIcerik bunu React elemanlarına çevirip render ediyor.
export function satirIciBicimlendir(metin) {
  return metin.split(/\*(.+?)\*/g).map((parca, i) => ({ kalin: i % 2 === 1, metin: parca, anahtar: i }))
}

// Kelime sayısından kabaca okuma süresi (ortalama 200 kelime/dk okuma hızı).
export function okumaSuresiTahminEt(metin) {
  if (!metin) return 0
  const kelimeSayisi = metin.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(kelimeSayisi / 200))
}

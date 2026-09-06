// Open Library zenginleştirme mantığı — önceden kitapKatalog.js içindeydi,
// turkceKitapVeriTabani.js da (statik 67 bin kitaplık veri seti, en yüksek
// hacimli kayıt yolu) aynı katmanlı aramayı kullanabilsin diye KENDİ ayrı
// dosyasına çıkarıldı. kitapIsbnEslestir.js'teki notla aynı sebep: iki
// dosya birbirini import etmeye kalkarsa dairesel bağımlılık oluşurdu.
//
// İki katmanlı çalışır:
//   1) ISBN üzerinden TAM baskıyı bulmayı dener (en doğru veri — o Türkçe
//      baskının gerçek sayfa sayısı, kapağı vb.)
//   2) ISBN'de bulunamayan ya da eksik kalan alanlar için başlık+yazar
//      araması yapar ve İSTER Türkçe baskıdan ister başka bir baskıdan olsun,
//      eşleşen ilk kayıttan yaklaşık bir değer alır (örn. sayfa sayısı) —
//      hiç veri olmamasından iyidir, sadece bir tahmindir.
// Çağıran taraf bunun üzerine yazmıyor, sadece boş alanları tamamlıyor.
async function openLibraryIsbnIle(isbn) {
  try {
    const kitapRes = await fetch(`https://openlibrary.org/isbn/${isbn}.json`)
    if (!kitapRes.ok) return null
    const kitapData = await kitapRes.json()

    let ozet = ''
    let turler = []
    const workKey = kitapData.works?.[0]?.key
    if (workKey) {
      try {
        const workRes = await fetch(`https://openlibrary.org${workKey}.json`)
        if (workRes.ok) {
          const workData = await workRes.json()
          ozet = typeof workData.description === 'string' ? workData.description : workData.description?.value || ''
          turler = (workData.subjects || []).slice(0, 6)
        }
      } catch {
        // Work verisi alınamazsa sorun değil, isbn seviyesindeki veriyle devam
      }
    }

    const kapakId = kitapData.covers?.[0]
    return {
      posterUrl: kapakId ? `https://covers.openlibrary.org/b/id/${kapakId}-L.jpg` : '',
      ozet,
      turler: turler.join(', '),
      sayfaSayisi: kitapData.number_of_pages || null,
      yayinevi: (kitapData.publishers || [])[0] || '',
    }
  } catch (err) {
    console.warn('Open Library (ISBN) zenginleştirme başarısız:', err.message)
    return null
  }
}

async function openLibraryBaslikIle(baslik, yazar) {
  if (!baslik) return null
  try {
    const parcalar = [`title=${encodeURIComponent(baslik)}`]
    if (yazar) parcalar.push(`author=${encodeURIComponent(yazar.split(',')[0])}`)
    const res = await fetch(`https://openlibrary.org/search.json?${parcalar.join('&')}&limit=5`)
    if (!res.ok) return null
    const data = await res.json()
    const eslesen = (data.docs || []).find((d) => d.number_of_pages_median || d.cover_i) || data.docs?.[0]
    if (!eslesen) return null
    return {
      posterUrl: eslesen.cover_i ? `https://covers.openlibrary.org/b/id/${eslesen.cover_i}-L.jpg` : '',
      ozet: '',
      turler: (eslesen.subject || []).slice(0, 6).join(', '),
      sayfaSayisi: eslesen.number_of_pages_median || null,
      yayinevi: (eslesen.publisher || [])[0] || '',
    }
  } catch (err) {
    console.warn('Open Library (başlık araması) zenginleştirme başarısız:', err.message)
    return null
  }
}

export async function openLibraryZenginlestir({ isbn13, isbn10, baslik, yazar }) {
  const isbn = isbn13 || isbn10
  const isbnSonucu = isbn ? await openLibraryIsbnIle(isbn) : null

  // ISBN sonucu varsa ama hâlâ boş kalan alanlar varsa, başlık araması ile
  // TAMAMLAYICI olarak devam et (isbnSonucu'nun üzerine yazmaz).
  const eksikVarMi = !isbnSonucu || !isbnSonucu.sayfaSayisi || !isbnSonucu.posterUrl || !isbnSonucu.ozet
  const baslikSonucu = eksikVarMi ? await openLibraryBaslikIle(baslik, yazar) : null

  if (!isbnSonucu && !baslikSonucu) return null
  return {
    posterUrl: isbnSonucu?.posterUrl || baslikSonucu?.posterUrl || '',
    ozet: isbnSonucu?.ozet || baslikSonucu?.ozet || '',
    turler: isbnSonucu?.turler || baslikSonucu?.turler || '',
    sayfaSayisi: isbnSonucu?.sayfaSayisi ?? baslikSonucu?.sayfaSayisi ?? null,
    yayinevi: isbnSonucu?.yayinevi || baslikSonucu?.yayinevi || '',
  }
}

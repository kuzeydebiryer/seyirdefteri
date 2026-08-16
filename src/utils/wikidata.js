// Wikidata Köprüsü — TMDB ve Google Books gibi API'ler birbirinden habersiz
// çalışıyor. Wikidata ise film/kitap uyarlaması gibi ilişkileri (P144: "temel
// alındığı eser") barındıran devasa bir bağlantı grafiği. Bu dosya o grafiği
// "İlgili Eser Ekle" panelinde bir ÖNERİ kaynağı olarak kullanır — hiçbir
// otomatik/arka plan çağrı yok, yalnızca kullanıcı butona bastığında TEK bir
// istek atılır. Böylece Wikidata Query Service'in rate limit riskinden
// tamamen izole kalıyoruz.
//
// Kapsam notu: Wikidata'da her kitabın/filmin uyarlama ilişkisi işaretli
// değil, özellikle Türkçe çevirilerde başlık eşleşmesi tutmayabilir. Bu
// yüzden her iki fonksiyon da "bulunamadı" durumunu sessizce (boş dizi
// döndürerek) karşılar — üst katman kullanıcıya nazik bir mesaj gösterir.

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql'
const WD_API = 'https://www.wikidata.org/w/api.php'
const ZAMAN_ASIMI_MS = 10000

async function sparqlSorgula(sorgu) {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(sorgu)}&format=json`
  const kontrolci = new AbortController()
  const zamanlayici = setTimeout(() => kontrolci.abort(), ZAMAN_ASIMI_MS)
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/sparql-results+json' },
      signal: kontrolci.signal,
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.results?.bindings || []
  } catch {
    return []
  } finally {
    clearTimeout(zamanlayici)
  }
}

// Başlık üzerinden Wikidata'da adaylık teşkil eden madde(ler)i bulur.
// (SPARQL'a doğrudan metin aramasıyla gitmek tüm veritabanını taratacağından
// çok yavaş kalır — bunun yerine Wikidata'nın kendi arama uç noktasını
// kullanıp QID adaylarını topluyoruz, asıl graf sorgusu bu QID'lerle sınırlı
// ve hızlı çalışıyor.)
async function baslikladanQidAdaylari(baslik, limitSayisi = 5) {
  if (!baslik) return []
  const url = `${WD_API}?action=wbsearchentities&search=${encodeURIComponent(baslik)}&language=tr&uselang=tr&format=json&origin=*&limit=${limitSayisi}&type=item`
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return (data.search || []).map((s) => s.id)
  } catch {
    return []
  }
}

// Kitap sayfasında: bu kitaba dayanan film/dizi uyarlamalarını önerir.
// Dönüş: [{ wikidataQid, baslik, yil, tmdbId }]
export async function kitaptanFilmOner(kitapBasligi, yazarAdi) {
  const adaylar = await baslikladanQidAdaylari(kitapBasligi)
  if (adaylar.length === 0) return []

  const values = adaylar.map((q) => `wd:${q}`).join(' ')
  const sorgu = `
    SELECT ?kitap ?film ?filmLabel ?yil ?tmdbId WHERE {
      VALUES ?kitap { ${values} }
      ?film wdt:P144 ?kitap.
      OPTIONAL { ?film wdt:P577 ?tarih. BIND(YEAR(?tarih) AS ?yil) }
      OPTIONAL { ?film wdt:P4947 ?tmdbId. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "tr,en". }
    }
    LIMIT 15
  `
  const sonuclar = await sparqlSorgula(sorgu)

  const gorulen = new Set()
  const oneriler = []
  for (const r of sonuclar) {
    const tmdbId = r.tmdbId?.value ? Number(r.tmdbId.value) : null
    if (!tmdbId) continue // TMDB ID'si yoksa sitede gösterecek posterimiz/verimiz olmaz
    if (gorulen.has(tmdbId)) continue
    gorulen.add(tmdbId)
    oneriler.push({
      wikidataQid: r.film?.value?.split('/').pop() || '',
      baslik: r.filmLabel?.value || '',
      yil: r.yil?.value || '',
      tmdbId,
    })
  }
  return oneriler
}

// Film/dizi sayfasında: TMDB ID üzerinden bu yapımın dayandığı kitabı önerir.
// TMDB ID Wikidata'da tekil/indeksli bir alan olduğundan bu sorgu tüm
// veritabanını taramaz, doğrudan eşleşen az sayıda satırla döner — kitap
// aramasındaki başlık taramasından farklı olarak burada arama adayı gerekmez.
// Dönüş: [{ wikidataQid, baslik, yazar, isbn13 }]
export async function filmdenKitapOner(tmdbId) {
  if (!tmdbId) return []
  const sorgu = `
    SELECT ?kitap ?kitapLabel ?isbn ?yazarLabel WHERE {
      ?film wdt:P4947 "${tmdbId}".
      ?film wdt:P144 ?kitap.
      OPTIONAL { ?kitap wdt:P212 ?isbn. }
      OPTIONAL { ?kitap wdt:P50 ?yazar. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "tr,en". }
    }
    LIMIT 5
  `
  const sonuclar = await sparqlSorgula(sorgu)

  const gorulen = new Set()
  const oneriler = []
  for (const r of sonuclar) {
    const qid = r.kitap?.value?.split('/').pop() || ''
    if (!qid || gorulen.has(qid)) continue
    gorulen.add(qid)
    oneriler.push({
      wikidataQid: qid,
      baslik: r.kitapLabel?.value || '',
      yazar: r.yazarLabel?.value || '',
      isbn13: (r.isbn?.value || '').replace(/-/g, ''),
    })
  }
  return oneriler
}

// --- Strateji 2: Derin Bağlamsal Keşifler -------------------------------
// Yönetmen/oyuncu sayfasında "İlham Kaynakları" — TMDB kişi ID'si üzerinden
// Wikidata'daki karşılığını bulur (P4985: TMDB kişi ID'si — tekil/indeksli
// bir alan olduğundan hızlı ve doğrudan eşleşir), sonra P737 (etkilenilen
// kişi) ilişkisini HER İKİ yönde de tarar: kimlerden etkilenmiş, kimleri
// etkilemiş. Çoğu kişi maddesinde bu alan boş — bu normal, sessizce boş
// dizi döner.
// Dönüş: [{ wikidataQid, ad, meslek, yon: 'etkilendi' | 'etkiledi' }]
export async function kisiEtkilesimleriGetir(tmdbKisiId) {
  if (!tmdbKisiId) return []
  const sorgu = `
    SELECT ?yon ?kisi2 ?kisi2Label ?meslekLabel WHERE {
      ?kisi wdt:P4985 "${tmdbKisiId}".
      {
        ?kisi wdt:P737 ?kisi2.
        BIND("etkilendi" AS ?yon)
      } UNION {
        ?kisi2 wdt:P737 ?kisi.
        BIND("etkiledi" AS ?yon)
      }
      OPTIONAL { ?kisi2 wdt:P106 ?meslek. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "tr,en". }
    }
    LIMIT 20
  `
  const sonuclar = await sparqlSorgula(sorgu)

  const gorulen = new Set()
  const etkilesimler = []
  for (const r of sonuclar) {
    const qid = r.kisi2?.value?.split('/').pop() || ''
    const yon = r.yon?.value || ''
    const anahtar = `${qid}_${yon}`
    if (!qid || gorulen.has(anahtar)) continue
    gorulen.add(anahtar)
    etkilesimler.push({
      wikidataQid: qid,
      ad: r.kisi2Label?.value || '',
      meslek: r.meslekLabel?.value || '',
      yon,
    })
  }
  return etkilesimler
}

// --- Strateji 3: Otomatik İlginç Bilgiler (Trivia) ----------------------
// Film/dizi sayfasında küçük bir "İlginç Bilgiler" kutusu için: çekim
// yerleri, ait olduğu sanat/sinema akımı, ve hikayenin geçtiği (kurgusal
// olabilir) mekan. TMDB ID üzerinden (P4947) tekil eşleşme aranıyor, bu da
// sorguyu hızlı ve ucuz tutuyor. GROUP_CONCAT kullanıldığından ?xLabel
// otomatik etiketleme servisi yerine elle rdfs:label + FILTER(LANG()) —
// Wikidata'da agregasyonlu sorgularda otomatik etiket servisi güvenilir
// çalışmıyor, bu yüzden bilinen bir çözüm.
// Dönüş: { cekimYerleri: string[], akimlar: string[], anlatiYerleri: string[] } | null
export async function filmTriviaGetir(tmdbId) {
  if (!tmdbId) return null
  const sorgu = `
    SELECT
      (GROUP_CONCAT(DISTINCT ?cekimYeriLabel; separator="|") AS ?cekimYerleri)
      (GROUP_CONCAT(DISTINCT ?akimLabel; separator="|") AS ?akimlar)
      (GROUP_CONCAT(DISTINCT ?anlatiYeriLabel; separator="|") AS ?anlatiYerleri)
    WHERE {
      ?film wdt:P4947 "${tmdbId}".
      OPTIONAL {
        ?film wdt:P915 ?cekimYeri.
        ?cekimYeri rdfs:label ?cekimYeriLabel.
        FILTER(LANG(?cekimYeriLabel) IN ("tr", "en"))
      }
      OPTIONAL {
        ?film wdt:P135 ?akim.
        ?akim rdfs:label ?akimLabel.
        FILTER(LANG(?akimLabel) IN ("tr", "en"))
      }
      OPTIONAL {
        ?film wdt:P840 ?anlatiYeri.
        ?anlatiYeri rdfs:label ?anlatiYeriLabel.
        FILTER(LANG(?anlatiYeriLabel) IN ("tr", "en"))
      }
    }
    GROUP BY ?film
  `
  const sonuclar = await sparqlSorgula(sorgu)
  const satir = sonuclar[0]
  if (!satir) return null

  const ayir = (deger) => {
    if (!deger) return []
    // Aynı etiketin hem tr hem en dilinde gelmesi ihtimaline karşı (FILTER
    // ikisine de izin veriyor) basit bir tekilleştirme.
    return [...new Set(deger.split('|').filter(Boolean))]
  }

  const cekimYerleri = ayir(satir.cekimYerleri?.value)
  const akimlar = ayir(satir.akimlar?.value)
  const anlatiYerleri = ayir(satir.anlatiYerleri?.value)

  if (cekimYerleri.length === 0 && akimlar.length === 0 && anlatiYerleri.length === 0) return null
  return { cekimYerleri, akimlar, anlatiYerleri }
}

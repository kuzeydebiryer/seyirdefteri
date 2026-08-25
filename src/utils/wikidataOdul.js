// Resmi adaylıklar/kazananlar açıklandıktan SONRA kullanılmak üzere —
// Wikidata sadece gönüllülerin girdiği, ONAYLANMIŞ sonuçları içeriyor, tahmin
// aşamasında (adaylıklar açıklanmadan önce) burada hiçbir veri olmaz.
//
// SPARQL sorgusu, Serkan'la birlikte canlı Wikidata'da test ederek
// doğrulanan GERÇEK modele göre kuruldu — önceden "kategoriler o yılki
// törene bağlı" varsayımıyla yazılmıştı, bu YANLIŞ çıktı: kategoriler
// aslında JENERİK, yıldan bağımsız ödüle (ör. "Primetime Emmy Award")
// P361 ("parçasıdır") ile bağlı. Yıl bilgisi ise her adaylık/kazanma
// KAYDININ kendi üzerinde bir P585 ("point in time") niteleyicisi olarak
// duruyor. Bu yüzden nitelikleri okumak için basit `wdt:` kısayolları değil,
// tam "statement" söz dizimi (`p:`/`ps:`/`pq:`) gerekiyor.
//
// Bu yüzden artık İKİ girdi isteniyor: jenerik ödül Q kodu + hedef yıl.

const SPARQL_UC_NOKTASI = 'https://query.wikidata.org/sparql'

function sorguOlustur(odulQid, yil) {
  return `
    SELECT ?work ?workLabel ?tmdbMovie ?tmdbTv ?tmdbPerson ?category ?categoryLabel ?won WHERE {
      ?category wdt:P361 wd:${odulQid}.
      {
        ?work p:P1411 ?statement.
        ?statement ps:P1411 ?category.
        ?statement pq:P585 ?tarih.
        BIND(false AS ?won)
      }
      UNION
      {
        ?work p:P166 ?statement.
        ?statement ps:P166 ?category.
        ?statement pq:P585 ?tarih.
        BIND(true AS ?won)
      }
      FILTER(YEAR(?tarih) = ${Number(yil)})
      OPTIONAL { ?work wdt:P4947 ?tmdbMovie. }
      OPTIONAL { ?work wdt:P4983 ?tmdbTv. }
      OPTIONAL { ?work wdt:P4985 ?tmdbPerson. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "tr,en". }
    }
  `.trim()
}

// odulQid: "Q..." formatında, JENERİK (yıldan bağımsız) ödülün Wikidata
// kodu — ör. "Primetime Emmy Award" sayfasının kodu, "78th Primetime Emmy
// Awards" gibi yıllık tören sayfasının DEĞİL. yil: sayı, ör. 2026.
// Dönüş: [{ kategoriAdi, adaylar: [{ ad, tmdbId, tur: 'film'|'dizi'|'kisi', kazandiMi }] }]
export async function wikidataOduluCek(odulQid, yil) {
  const sorgu = sorguOlustur(odulQid.trim(), yil)
  const url = `${SPARQL_UC_NOKTASI}?query=${encodeURIComponent(sorgu)}&format=json`
  const res = await fetch(url, { headers: { Accept: 'application/sparql-results+json' } })
  if (!res.ok) throw new Error('Wikidata sorgusu başarısız oldu (SPARQL yanıt vermedi).')
  const data = await res.json()
  const satirlar = data.results?.bindings || []
  if (satirlar.length === 0) throw new Error('Bu ödül + yıl için hiç kategori/aday bulunamadı — kodu ve yılı kontrol et.')

  const kategoriMap = new Map()
  satirlar.forEach((satir) => {
    const kategoriAdi = satir.categoryLabel?.value || satir.category?.value
    if (!kategoriMap.has(kategoriAdi)) kategoriMap.set(kategoriAdi, [])
    kategoriMap.get(kategoriAdi).push({
      ad: satir.workLabel?.value || '',
      tmdbId: satir.tmdbMovie?.value || satir.tmdbTv?.value || satir.tmdbPerson?.value || null,
      tur: satir.tmdbMovie ? 'film' : satir.tmdbTv ? 'dizi' : satir.tmdbPerson ? 'kisi' : 'bilinmiyor',
      kazandiMi: satir.won?.value === 'true',
    })
  })

  return [...kategoriMap.entries()].map(([kategoriAdi, adaylar]) => ({ kategoriAdi, adaylar }))
}

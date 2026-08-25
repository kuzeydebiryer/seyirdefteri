// Resmi adaylıklar/kazananlar açıklandıktan SONRA kullanılmak üzere —
// Wikidata sadece gönüllülerin girdiği, ONAYLANMIŞ sonuçları içeriyor, tahmin
// aşamasında (adaylıklar açıklanmadan önce) burada hiçbir veri olmaz.
//
// SPARQL sorgusu şu Wikidata kalıbına dayanıyor: bir ödül töreninin
// (ör. "98th Academy Awards") her kategorisi P361 ("parçasıdır") ile o
// törene bağlı ayrı bir varlık; bir eser/kişi P1411 ("aday gösterildi") ya
// da P166 ("ödül aldı") ile doğrudan o KATEGORİYE bağlanıyor. TMDB'yle
// doğrudan eşleşme için P4947 (TMDB Film ID) / P4983 (TMDB Dizi ID) /
// P4985 (TMDB Kişi ID) varsa onu da çekiyoruz — varsa isimle aramaya hiç
// gerek kalmıyor, yoksa çağıran taraf (Oscar.jsx) isimle TMDB araması
// yapıyor.
//
// NOT: Bu sorgu Wikidata'nın belgelenmiş property kalıplarına göre
// tasarlandı ama bu ortamdan canlı test edilemedi (query.wikidata.org bu
// sanal alana kapalı) — ilk denemede küçük bir ayar gerekebilir.

const SPARQL_UC_NOKTASI = 'https://query.wikidata.org/sparql'

function sorguOlustur(torenQid) {
  return `
    SELECT ?work ?workLabel ?tmdbMovie ?tmdbTv ?tmdbPerson ?category ?categoryLabel ?won WHERE {
      ?category wdt:P361 wd:${torenQid}.
      {
        ?work wdt:P1411 ?category.
        BIND(false AS ?won)
      }
      UNION
      {
        ?work wdt:P166 ?category.
        BIND(true AS ?won)
      }
      OPTIONAL { ?work wdt:P4947 ?tmdbMovie. }
      OPTIONAL { ?work wdt:P4983 ?tmdbTv. }
      OPTIONAL { ?work wdt:P4985 ?tmdbPerson. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "tr,en". }
    }
  `.trim()
}

// torenQid: "Q..." formatında, o yılki törenin Wikidata sayfa kodu — admin
// Wikidata.org'da o töreni arayıp URL'deki kodu buraya yapıştırıyor.
// Dönüş: [{ kategoriAdi, adaylar: [{ ad, tmdbId, tur: 'film'|'dizi'|'kisi', kazandiMi }] }]
export async function wikidataOduluCek(torenQid) {
  const sorgu = sorguOlustur(torenQid.trim())
  const url = `${SPARQL_UC_NOKTASI}?query=${encodeURIComponent(sorgu)}&format=json`
  const res = await fetch(url, { headers: { Accept: 'application/sparql-results+json' } })
  if (!res.ok) throw new Error('Wikidata sorgusu başarısız oldu (SPARQL yanıt vermedi).')
  const data = await res.json()
  const satirlar = data.results?.bindings || []
  if (satirlar.length === 0) throw new Error('Bu Wikidata kodu için hiç kategori/aday bulunamadı — kodu kontrol et.')

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

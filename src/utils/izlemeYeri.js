// Bir filmin TMDB'nin "watch providers" verisine göre Türkiye'de ŞU AN nerede
// izlenebildiğini tespit eder — Topluluklar sayfasındaki "Oscar Yolculuğu
// Filmleri" gibi bölümlerde, Platformlar sayfasındaki rozet mantığının
// (bkz. platformlar.js) aynısını tek bir filme uygulamak için kullanılıyor:
// tanıdık bir platformda abonelikle (flatrate) varsa o platformun adı; değilse
// kirala/satın al ya da tanıdık olmayan bir platformda abonelikle varsa
// "💻 Dijital"; TR'de hiçbiri yoksa ama film başka bir ülkede (ör. ABD)
// dijital olarak çıkmışsa "🌍 Henüz TR'de değil" + o ülkedeki dijital çıkış
// tarihi (ör. "🌍 Henüz TR'de değil (ABD: 15 Eyl 2026)"); hiçbir ülkede
// dijital olarak yoksa ama bir vizyon (sinema) tarihi varsa (TR'de henüz
// vizyonda/vizyona girecek, yoksa ABD'deki vizyon tarihi) "Kaynak yok
// (TR vizyon: ...)" gibi onu da ekliyor — gerçekten hiçbir tarih bilgisi
// yoksa düz "Kaynak yok". Hepsi bilgilendirme amaçlı; korsan/torrent
// kaynaklarına yönlendirme YAPILMIYOR.
import { TANIDIK_PLATFORMLAR } from './platformlar.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY

const ULKE_ADLARI = { TR: 'TR', US: 'ABD', GB: 'İngiltere' }
function ulkeAdiGetir(kod) {
  return ULKE_ADLARI[kod] || kod
}

// TR'de dijital bulunamadığında bakılacak ülkeler — büyük dijital pazarlar,
// bir filmin dünyada dijitale çıkıp çıkmadığını büyük ölçüde temsil ediyor.
const DIGER_ULKELER = ['US', 'GB']

function dijitalSecenekVarMi(ulkeVerisi) {
  if (!ulkeVerisi) return false
  return (ulkeVerisi.flatrate?.length || 0) > 0 || (ulkeVerisi.rent?.length || 0) > 0 || (ulkeVerisi.buy?.length || 0) > 0
}

// TMDB release_dates kayıtları type koduyla geliyor: 1 Prömiyer, 2 Sınırlı
// vizyon, 3 Vizyon, 4 Dijital, 5 Fiziksel, 6 TV. Verilen tür(ler)e uyan en
// erken tarihi (varsa) döndürür.
function enErkenTarih(ulkeKaydi, turler) {
  const tarihler = (ulkeKaydi?.release_dates || []).filter((r) => turler.includes(r.type) && r.release_date).map((r) => r.release_date)
  return tarihler.length > 0 ? tarihler.sort()[0] : null
}

function tarihFormatla(isoTarih) {
  return new Date(isoTarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function releaseDatesGetir(tmdbId) {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/release_dates?api_key=${TMDB_API_KEY}`)
    const data = await res.json()
    return data.results || []
  } catch {
    return []
  }
}

export async function filmIzlemeYeriGetir(tmdbId) {
  if (!TMDB_API_KEY || !tmdbId) return 'Kaynak yok'
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`)
    const data = await res.json()
    const sonuclar = data.results || {}
    const tr = sonuclar.TR

    if (tr) {
      const flatrate = tr.flatrate || []
      const tanidikEslesme = flatrate.find((p) =>
        TANIDIK_PLATFORMLAR.some((ad) => p.provider_name.toLowerCase().includes(ad.toLowerCase()))
      )
      if (tanidikEslesme) return tanidikEslesme.provider_name
      if (dijitalSecenekVarMi(tr)) return '💻 Dijital'
    }

    // TR'de dijital yok — bu noktadan sonra her durumda release_dates
    // gerekiyor (ya başka ülkenin dijital tarihi, ya da bir vizyon tarihi).
    const releaseDates = await releaseDatesGetir(tmdbId)

    const eslesenUlke = DIGER_ULKELER.find((ulke) => dijitalSecenekVarMi(sonuclar[ulke]))
    if (eslesenUlke) {
      const kayit = releaseDates.find((r) => r.iso_3166_1 === eslesenUlke)
      const tarih = enErkenTarih(kayit, [4])
      const ulkeAdi = ulkeAdiGetir(eslesenUlke)
      return tarih ? `🌍 Henüz TR'de değil (${ulkeAdi}: ${tarihFormatla(tarih)})` : `🌍 Henüz TR'de değil (${ulkeAdi})`
    }

    // Hiçbir yerde dijital yok — en azından bir vizyon tarihi var mı diye
    // bakılıyor (önce TR, yoksa ABD/İngiltere) — "henüz vizyonda/vizyona
    // girmedi" bilgisini veriyor, korsan kaynak önerilmiyor.
    for (const ulke of ['TR', 'US', 'GB']) {
      const kayit = releaseDates.find((r) => r.iso_3166_1 === ulke)
      const tarih = enErkenTarih(kayit, [2, 3])
      if (tarih) return `Kaynak yok (${ulkeAdiGetir(ulke)} vizyon: ${tarihFormatla(tarih)})`
    }

    return 'Kaynak yok'
  } catch {
    return 'Kaynak yok'
  }
}

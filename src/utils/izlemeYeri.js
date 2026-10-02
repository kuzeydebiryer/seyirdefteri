// Bir filmin TMDB'nin "watch providers" verisine göre Türkiye'de ŞU AN nerede
// izlenebildiğini tespit eder — Topluluklar sayfasındaki "Oscar Yolculuğu
// Filmleri" gibi bölümlerde, Platformlar sayfasındaki rozet mantığının
// (bkz. platformlar.js) aynısını tek bir filme uygulamak için kullanılıyor.
//
// Dönüş değeri düz bir metin DEĞİL, { tur, metin, platformAdi } biçiminde —
// çağıran taraf (TopluluklarDetay.jsx) rozetin rengini metne göre kırılgan
// bir string eşleştirmesiyle değil, `tur` alanına göre seçiyor:
//   'platform'  → tanıdık bir platformda abonelikle var; metin platform adı,
//                 platformAdi de rengini (bkz. platformRengiGetir) bulmak için.
//   'dijital'   → TR'de tanıdık olmayan bir platformda ya da kirala/satın al
//                 olarak var; metin "💻 Dijital".
//   'henuzTR'   → TR'de hiç yok ama başka bir ülkede (ör. ABD) dijital olarak
//                 çıkmış; metin "🌍 Henüz TR'de değil (ABD: 15 Eyl 2026)" gibi.
//   'vizyon'    → hiçbir yerde dijital yok ama bir vizyon (sinema) tarihi var;
//                 metin sade biçimde "TR vizyon: 20 Kas 2026" — "Kaynak yok"
//                 YAZMIYOR, ülke+tarih kendi başına yeterli bilgi.
//   'yok'       → hiçbir bilgi yok; metin "Kaynak yok".
// Hepsi bilgilendirme amaçlı; korsan/torrent kaynaklarına yönlendirme YAPILMIYOR.
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

const YOK_ROZETI = { tur: 'yok', metin: 'Kaynak yok' }

export async function filmIzlemeYeriGetir(tmdbId) {
  if (!TMDB_API_KEY || !tmdbId) return YOK_ROZETI
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
      if (tanidikEslesme) return { tur: 'platform', metin: tanidikEslesme.provider_name, platformAdi: tanidikEslesme.provider_name }
      if (dijitalSecenekVarMi(tr)) return { tur: 'dijital', metin: '💻 Dijital' }
    }

    // TR'de dijital yok — bu noktadan sonra her durumda release_dates
    // gerekiyor (ya başka ülkenin dijital tarihi, ya da bir vizyon tarihi).
    const releaseDates = await releaseDatesGetir(tmdbId)

    const eslesenUlke = DIGER_ULKELER.find((ulke) => dijitalSecenekVarMi(sonuclar[ulke]))
    if (eslesenUlke) {
      const kayit = releaseDates.find((r) => r.iso_3166_1 === eslesenUlke)
      const tarih = enErkenTarih(kayit, [4])
      const ulkeAdi = ulkeAdiGetir(eslesenUlke)
      const metin = tarih ? `🌍 Henüz TR'de değil (${ulkeAdi}: ${tarihFormatla(tarih)})` : `🌍 Henüz TR'de değil (${ulkeAdi})`
      return { tur: 'henuzTR', metin }
    }

    // Hiçbir yerde dijital yok — en azından bir vizyon tarihi var mı diye
    // bakılıyor (önce TR, yoksa ABD/İngiltere) — "henüz vizyonda/vizyona
    // girmedi" bilgisini sade biçimde (ülke+tarih) veriyor, "Kaynak yok"
    // YAZMIYOR; korsan kaynak da önerilmiyor.
    for (const ulke of ['TR', 'US', 'GB']) {
      const kayit = releaseDates.find((r) => r.iso_3166_1 === ulke)
      const tarih = enErkenTarih(kayit, [2, 3])
      if (tarih) return { tur: 'vizyon', metin: `${ulkeAdiGetir(ulke)} vizyon: ${tarihFormatla(tarih)}` }
    }

    return YOK_ROZETI
  } catch {
    return YOK_ROZETI
  }
}

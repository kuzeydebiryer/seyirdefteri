// Bir filmin TMDB'nin "watch providers" verisine göre Türkiye'de ŞU AN nerede
// izlenebildiğini tespit eder — Topluluklar sayfasındaki "Oscar Yolculuğu
// Filmleri" gibi bölümlerde, Platformlar sayfasındaki rozet mantığının
// (bkz. platformlar.js) aynısını tek bir filme uygulamak için kullanılıyor:
// tanıdık bir platformda abonelikle (flatrate) varsa o platformun adı; değilse
// kirala/satın al ya da tanıdık olmayan bir platformda abonelikle varsa
// "💻 Dijital"; TR'de hiçbiri yoksa ama film başka bir ülkede (ör. ABD)
// dijital olarak çıkmışsa "🌍 Henüz TR'de değil" (ileride gelebilir anlamında —
// korsan/torrent kaynaklarına yönlendirme YAPILMIYOR, sadece bilgilendirme);
// hiçbir ülkede dijital olarak yoksa "Kaynak yok".
import { TANIDIK_PLATFORMLAR } from './platformlar.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY

// TR'de bulunamadığında bakılacak ülkeler — büyük dijital pazarlar, bir
// filmin dünyada dijitale çıkıp çıkmadığını büyük ölçüde temsil ediyor.
const DIGER_ULKELER = ['US', 'GB']

function dijitalSecenekVarMi(ulkeVerisi) {
  if (!ulkeVerisi) return false
  return (ulkeVerisi.flatrate?.length || 0) > 0 || (ulkeVerisi.rent?.length || 0) > 0 || (ulkeVerisi.buy?.length || 0) > 0
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

    // TR'de yok — sadece bu durumda başka ülkelere bakılıyor.
    const baskaUlkedeVarMi = DIGER_ULKELER.some((ulke) => dijitalSecenekVarMi(sonuclar[ulke]))
    if (baskaUlkedeVarMi) return '🌍 Henüz TR\'de değil'

    return 'Kaynak yok'
  } catch {
    return 'Kaynak yok'
  }
}

// Bir filmin TMDB'nin "watch providers" verisine göre Türkiye'de ŞU AN nerede
// izlenebildiğini tespit eder — Topluluklar sayfasındaki "Oscar Yolculuğu
// Filmleri" gibi bölümlerde, Platformlar sayfasındaki rozet mantığının
// (bkz. platformlar.js) aynısını tek bir filme uygulamak için kullanılıyor:
// tanıdık bir platformda abonelikle (flatrate) varsa o platformun adı; değilse
// kirala/satın al ya da tanıdık olmayan bir platformda abonelikle varsa
// "💻 Dijital"; hiçbiri yoksa "Kaynak yok".
import { TANIDIK_PLATFORMLAR } from './platformlar.js'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY

export async function filmIzlemeYeriGetir(tmdbId) {
  if (!TMDB_API_KEY || !tmdbId) return 'Kaynak yok'
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`)
    const data = await res.json()
    const tr = data.results?.TR
    if (!tr) return 'Kaynak yok'

    const flatrate = tr.flatrate || []
    const tanidikEslesme = flatrate.find((p) =>
      TANIDIK_PLATFORMLAR.some((ad) => p.provider_name.toLowerCase().includes(ad.toLowerCase()))
    )
    if (tanidikEslesme) return tanidikEslesme.provider_name

    const digerDijitalSecenekVarMi = flatrate.length > 0 || (tr.rent?.length || 0) > 0 || (tr.buy?.length || 0) > 0
    if (digerDijitalSecenekVarMi) return '💻 Dijital'

    return 'Kaynak yok'
  } catch {
    return 'Kaynak yok'
  }
}

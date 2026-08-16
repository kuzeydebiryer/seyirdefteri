// Bu dosya Vercel'in "Routing Middleware" özelliğini kullanıyor — proje kökünde
// (package.json ile aynı seviyede) durması yeterli, ayrıca bir yapılandırma
// gerekmiyor. Her istekten önce çalışıyor.
//
// SORUN: Sitemiz istemci tarafında render edilen tek sayfalık bir uygulama
// (SPA). WhatsApp/Facebook/Twitter gibi uygulamaların "link önizlemesi" botları
// JavaScript ÇALIŞTIRMIYOR — sadece ham HTML'e bakıp <meta property="og:..">
// etiketlerini arıyorlar. Normalde her rota (film/dizi/kitap fark etmeden)
// AYNI boş index.html'i döndürdüğü için, hiçbir paylaşımda görsel/başlık
// çıkmıyordu.
//
// ÇÖZÜM: Sadece BOT olduğu anlaşılan istekler için (User-Agent'tan tespit
// ediliyor), gerçek film/dizi/kitap/günce bilgisiyle küçük, özel bir HTML
// döndürüyoruz — TMDB'den (film/dizi) ya da Firestore'un herkese açık REST
// API'sinden (kitap/günce, kural zaten "allow read: if true" olduğu için
// kimlik doğrulama gerekmiyor) veri çekip. GERÇEK KULLANICILAR bu koddan hiç
// etkilenmiyor — User-Agent eşleşmezse fonksiyon hemen `return` ediyor ve
// Vercel normal SPA'yı (index.html) servis etmeye devam ediyor.

export const config = {
  matcher: ['/film/:id', '/dizi/:id', '/kitap/:id', '/gonderi/:id'],
}

const BOT_DESENI = /(WhatsApp|facebookexternalhit|Twitterbot|TelegramBot|Slackbot|LinkedInBot|Discordbot|SkypeUriPreview|Pinterest)/i

const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID

function kacisliMetin(metin) {
  return (metin || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function onizlemeHtml({ baslik, aciklama, gorsel, url }) {
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${kacisliMetin(baslik)} — Seyirdefteri</title>
<meta property="og:title" content="${kacisliMetin(baslik)}">
<meta property="og:description" content="${kacisliMetin(aciklama)}">
${gorsel ? `<meta property="og:image" content="${kacisliMetin(gorsel)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:url" content="${kacisliMetin(url)}">
<meta property="og:site_name" content="Seyirdefteri">
<meta name="twitter:card" content="summary_large_image">
</head>
<body></body>
</html>`
}

// Firestore'un herkese açık REST API'si — kitaplar/gonderiler koleksiyonları
// zaten "allow read: if true" olduğu için kimlik doğrulama gerekmiyor.
async function firestoreBelgeGetir(koleksiyon, id) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${koleksiyon}/${id}`
  )
  if (!res.ok) return null
  const data = await res.json()
  const alanlar = data.fields || {}
  const metinAl = (ad) => alanlar[ad]?.stringValue || ''
  return { metinAl }
}

export default async function middleware(request) {
  const userAgent = request.headers.get('user-agent') || ''
  if (!BOT_DESENI.test(userAgent)) return // gerçek kullanıcı — dokunma

  const url = new URL(request.url)
  const [, tur, id] = url.pathname.split('/')

  try {
    if ((tur === 'film' || tur === 'dizi') && TMDB_API_KEY) {
      const tmdbTuru = tur === 'film' ? 'movie' : 'tv'
      const res = await fetch(`https://api.themoviedb.org/3/${tmdbTuru}/${id}?api_key=${TMDB_API_KEY}&language=tr-TR`)
      if (!res.ok) return
      const data = await res.json()
      const baslik = data.title || data.name
      if (!baslik) return
      const gorsel = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : ''
      const aciklama = (data.overview || 'Seyirdefteri’de incele.').slice(0, 200)
      return new Response(onizlemeHtml({ baslik, aciklama, gorsel, url: url.toString() }), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    }

    if (tur === 'kitap' && FIREBASE_PROJECT_ID) {
      const belge = await firestoreBelgeGetir('kitaplar', id)
      if (!belge) return
      const baslik = belge.metinAl('baslik')
      if (!baslik) return
      const yazar = belge.metinAl('yazar')
      const gorsel = belge.metinAl('posterUrl')
      const aciklama = yazar ? `${yazar} — Seyirdefteri'de incele.` : 'Seyirdefteri’de incele.'
      return new Response(onizlemeHtml({ baslik, aciklama, gorsel, url: url.toString() }), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    }

    if (tur === 'gonderi' && FIREBASE_PROJECT_ID) {
      const belge = await firestoreBelgeGetir('gonderiler', id)
      if (!belge) return
      const baslik = belge.metinAl('baslik')
      if (!baslik) return
      const gorsel = belge.metinAl('posterUrl')
      const yazarAdi = belge.metinAl('yazarAdi')
      const aciklama = yazarAdi ? `${yazarAdi} paylaştı — Seyirdefteri` : 'Seyirdefteri'
      return new Response(onizlemeHtml({ baslik, aciklama, gorsel, url: url.toString() }), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    }
  } catch {
    // Herhangi bir hata olursa sessizce normal SPA'ya düş — bot önizlemesiz
    // kalır ama site asla bozulmaz.
    return
  }
}

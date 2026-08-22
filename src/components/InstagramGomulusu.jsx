import { useEffect, useRef, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase.js'

const instagramGomCallable = httpsCallable(functions, 'instagramGom')

let embedScriptYuklendi = false
function embedScriptiYukle() {
  if (embedScriptYuklendi || document.getElementById('instagram-embed-script')) return
  embedScriptYuklendi = true
  const script = document.createElement('script')
  script.id = 'instagram-embed-script'
  script.src = 'https://www.instagram.com/embed.js'
  script.async = true
  document.body.appendChild(script)
}

// Sitenin dört farklı bölümünde (Etkinlik Habercisi, Yazı, İlham Panosu,
// Kulüp) kullanılan TEK gömme bileşeni — hepsinde aynı çerçeve, aynı
// davranış. Instagram'ın kendi kartı (beyaz zemin, kendi tasarımı) bizim
// "kağıt" temamıza boyanamıyor — bunun yerine ince bir çerçeveyle "sayfanın
// bir parçası" gibi hissettiriyoruz, kartın kendisine dokunmuyoruz.
export default function InstagramGomulusu({ url, paylasanAdi }) {
  const [html, setHtml] = useState(undefined) // undefined = yükleniyor, null = hata
  const kapsayiciRef = useRef(null)

  useEffect(() => {
    if (!url) return
    let iptal = false
    setHtml(undefined)
    instagramGomCallable({ url })
      .then((sonuc) => {
        if (!iptal) setHtml(sonuc.data?.html || null)
      })
      .catch(() => {
        if (!iptal) setHtml(null)
      })
    return () => {
      iptal = true
    }
  }, [url])

  useEffect(() => {
    if (!html) return
    embedScriptiYukle()
    // Script zaten yüklüyse (başka bir gömme daha önce yüklemiş), yeni
    // eklenen blockquote'u işlemesi için elle tetikliyoruz.
    const dene = () => {
      if (window.instgrm?.Embeds) {
        window.instgrm.Embeds.process()
      } else {
        setTimeout(dene, 300)
      }
    }
    dene()
  }, [html])

  if (!url) return null

  return (
    <div className="my-4 max-w-md overflow-hidden rounded-sm ring-1 ring-cizgi">
      <div className="flex items-center gap-2 bg-kagitKoyu px-3 py-2">
        <span className="text-xs text-kraft">📷 Instagram</span>
        {paylasanAdi && <span className="text-xs text-kraft">— {paylasanAdi} paylaştı</span>}
      </div>
      {html === undefined && <p className="p-3 text-xs text-kraft">Yükleniyor...</p>}
      {html === null && (
        <p className="p-3 text-xs text-kraft">
          Bu gönderi gösterilemedi —{' '}
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-deniz hover:underline">
            Instagram'da aç
          </a>
          .
        </p>
      )}
      {html && <div ref={kapsayiciRef} className="flex justify-center bg-white p-2" dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  )
}

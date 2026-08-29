import { useEffect, useRef, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase.js'
import { gomulmeOnbellektenOku, gomulmeOnbellegeYaz } from '../utils/gomulmeOnbellek.js'

const twitterGomCallable = httpsCallable(functions, 'twitterGom')

let widgetsScriptYuklendi = false
function widgetsScriptiYukle() {
  if (widgetsScriptYuklendi || document.getElementById('twitter-widgets-script')) return
  widgetsScriptYuklendi = true
  const script = document.createElement('script')
  script.id = 'twitter-widgets-script'
  script.src = 'https://platform.twitter.com/widgets.js'
  script.async = true
  document.body.appendChild(script)
}

// InstagramGomulusu ile BİREBİR aynı kalıp (tembel yükleme + kompakt mod) —
// X'in resmi, ücretsiz oEmbed'i (publish.x.com) ve widgets.js'i kullanıyor.
export default function TwitterGomulusu({ url, paylasanAdi, kompakt = false }) {
  const [genisletildiMi, setGenisletildiMi] = useState(!kompakt)
  const [gorunumeGeldiMi, setGorunumeGeldiMi] = useState(false)
  const [html, setHtml] = useState(undefined) // undefined = yükleniyor, null = hata
  const disKapsayiciRef = useRef(null)

  useEffect(() => {
    if (!url || !genisletildiMi || gorunumeGeldiMi) return
    const eleman = disKapsayiciRef.current
    if (!eleman) return
    const gozlemci = new IntersectionObserver(
      (girdiler) => {
        if (girdiler[0].isIntersecting) {
          setGorunumeGeldiMi(true)
          gozlemci.disconnect()
        }
      },
      { rootMargin: '300px' }
    )
    gozlemci.observe(eleman)
    return () => gozlemci.disconnect()
  }, [url, genisletildiMi, gorunumeGeldiMi])

  useEffect(() => {
    if (!url || !gorunumeGeldiMi) return
    const onbellekteki = gomulmeOnbellektenOku(url)
    if (onbellekteki !== undefined) {
      setHtml(onbellekteki)
      return
    }
    let iptal = false
    setHtml(undefined)
    twitterGomCallable({ url })
      .then((sonuc) => {
        const gelenHtml = sonuc.data?.html || null
        if (!iptal) setHtml(gelenHtml)
        gomulmeOnbellegeYaz(url, gelenHtml)
      })
      .catch(() => {
        if (!iptal) setHtml(null)
      })
    return () => {
      iptal = true
    }
  }, [url, gorunumeGeldiMi])

  useEffect(() => {
    if (!html) return
    widgetsScriptiYukle()
    const dene = () => {
      if (window.twttr?.widgets) {
        window.twttr.widgets.load(disKapsayiciRef.current)
      } else {
        setTimeout(dene, 300)
      }
    }
    dene()
  }, [html])

  if (!url) return null

  if (kompakt && !genisletildiMi) {
    return (
      <button
        type="button"
        onClick={() => setGenisletildiMi(true)}
        className="my-3 flex w-full items-center justify-between gap-2 rounded-sm bg-kagitKoyu px-3 py-2 text-left ring-1 ring-cizgi transition hover:ring-deniz/50"
      >
        <span className="text-xs text-kraft">𝕏 X (Twitter)</span>
        <span className="ml-auto shrink-0 text-xs text-deniz">İzlemek için tıkla ▸</span>
      </button>
    )
  }

  return (
    <div ref={disKapsayiciRef} className="my-4 max-w-md overflow-hidden rounded-sm ring-1 ring-cizgi">
      <div className="flex items-center gap-2 bg-kagitKoyu px-3 py-2">
        <span className="text-xs text-kraft">𝕏 X (Twitter)</span>
        {paylasanAdi && <span className="text-xs text-kraft">— {paylasanAdi} paylaştı</span>}
      </div>
      {!gorunumeGeldiMi && <div className="h-32 animate-pulse bg-kagitKoyu/50" />}
      {gorunumeGeldiMi && html === undefined && <p className="p-3 text-xs text-kraft">Yükleniyor...</p>}
      {gorunumeGeldiMi && html === null && (
        <p className="p-3 text-xs text-kraft">
          Bu gönderi gösterilemedi —{' '}
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-deniz hover:underline">
            X'te aç
          </a>
          .
        </p>
      )}
      {html && <div className="flex justify-center bg-white p-2" dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase.js'

const youtubeGomCallable = httpsCallable(functions, 'youtubeGom')

// InstagramGomulusu ile BİREBİR aynı kalıp — tembel yükleme
// (IntersectionObserver) + kompakt mod (tıkla-genişlet), sadece kaynak
// YouTube'un oEmbed uç noktası. YouTube oEmbed API anahtarı gerektirmiyor,
// kotasız/sınırsız (arama gibi kotalı bir YouTube Data API v3 işlemi
// DEĞİL) — bu yüzden Instagram'daki gibi bir önbellek koleksiyonuna bile
// gerek yok, her seferinde doğrudan isteniyor.
export default function YoutubeGomulusu({ url, paylasanAdi, kompakt = false }) {
  const [genisletildiMi, setGenisletildiMi] = useState(!kompakt)
  const [gorunumeGeldiMi, setGorunumeGeldiMi] = useState(false)
  const [veri, setVeri] = useState(undefined) // undefined = yükleniyor, null = hata
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
    let iptal = false
    setVeri(undefined)
    youtubeGomCallable({ url })
      .then((sonuc) => {
        if (!iptal) setVeri(sonuc.data || null)
      })
      .catch(() => {
        if (!iptal) setVeri(null)
      })
    return () => {
      iptal = true
    }
  }, [url, gorunumeGeldiMi])

  if (!url) return null

  if (kompakt && !genisletildiMi) {
    return (
      <button
        type="button"
        onClick={() => setGenisletildiMi(true)}
        className="my-3 flex w-full items-center justify-between gap-2 rounded-sm bg-kagitKoyu px-3 py-2 text-left ring-1 ring-cizgi transition hover:ring-deniz/50"
      >
        <span className="text-xs text-kraft">▶️ YouTube</span>
        <span className="ml-auto shrink-0 text-xs text-deniz">İzlemek için tıkla ▸</span>
      </button>
    )
  }

  return (
    <div ref={disKapsayiciRef} className="my-4 max-w-md overflow-hidden rounded-sm ring-1 ring-cizgi">
      <div className="flex items-center gap-2 bg-kagitKoyu px-3 py-2">
        <span className="text-xs text-kraft">▶️ YouTube</span>
        {veri?.kanalAdi && <span className="truncate text-xs text-kraft">— {veri.kanalAdi}</span>}
        {paylasanAdi && <span className="shrink-0 text-xs text-kraft">— {paylasanAdi} paylaştı</span>}
      </div>
      {!gorunumeGeldiMi && <div className="aspect-video animate-pulse bg-kagitKoyu/50" />}
      {gorunumeGeldiMi && veri === undefined && <p className="p-3 text-xs text-kraft">Yükleniyor...</p>}
      {gorunumeGeldiMi && veri === null && (
        <p className="p-3 text-xs text-kraft">
          Bu video gösterilemedi —{' '}
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-deniz hover:underline">
            YouTube'da aç
          </a>
          .
        </p>
      )}
      {veri && (
        <>
          <div className="aspect-video bg-black [&>iframe]:h-full [&>iframe]:w-full" dangerouslySetInnerHTML={{ __html: veri.html }} />
          {veri.baslik && <p className="bg-kagit px-3 py-2 text-xs text-murekkep">{veri.baslik}</p>}
        </>
      )}
    </div>
  )
}

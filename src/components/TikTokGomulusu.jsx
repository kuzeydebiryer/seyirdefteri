// TikTok videosu gömme: https://www.tiktok.com/@kullanici/video/1234567890 biçimindeki uzun
// bağlantıdan video kimliği alınıp TikTok'un resmi gömme sayfası (embed/v2) açılır.
// Kısa bağlantılar (vm.tiktok.com/…) yönlendirme içerdiği için çözülemez — uzun bağlantı istenir.
export function tiktokIdCoz(url) {
  return (url || '').match(/tiktok\.com\/(?:@[\w.-]+\/video|embed(?:\/v2)?|v)\/(\d{8,})/)?.[1] || null
}

export default function TikTokGomulusu({ url, paylasanAdi, kompakt = false }) {
  const id = tiktokIdCoz(url)
  if (!id) {
    return (
      <p className="rounded-sm bg-kagitKoyu p-3 text-xs text-kraft ring-1 ring-cizgi">
        TikTok kısa bağlantısı gösterilemiyor. Videoyu tarayıcıda açıp adres çubuğundaki uzun bağlantıyı (…/video/123…) kullan.{' '}
        <a href={url} target="_blank" rel="noreferrer" className="text-deniz underline">
          TikTok'ta aç ↗
        </a>
      </p>
    )
  }
  return (
    <div className={`mx-auto w-full ${kompakt ? 'max-w-[300px]' : 'max-w-[340px]'}`}>
      <div className="overflow-hidden rounded-md bg-black ring-1 ring-cizgi" style={{ aspectRatio: '9 / 16', maxHeight: kompakt ? 540 : 720 }}>
        <iframe
          src={`https://www.tiktok.com/embed/v2/${id}`}
          title="TikTok videosu"
          className="h-full w-full"
          allow="encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
      {paylasanAdi && <p className="mt-1 text-[11px] text-kraft">{paylasanAdi} paylaştı</p>}
    </div>
  )
}

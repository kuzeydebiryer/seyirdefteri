import { useState } from 'react'

// Mobilde (Web Share API destekleniyorsa) tek tıkla telefonun kendi
// paylaşım menüsünü açar — WhatsApp, Instagram, Mesajlar, ne kuruluysa
// hepsi orada listelenir, biz platform başına ayrı kod yazmıyoruz.
// Masaüstünde (Web Share API yoksa) küçük bir panel açılır — WhatsApp,
// Facebook, X, Telegram butonları (her birinin resmi, ücretsiz "paylaşım
// linki" var). Instagram'ın böyle bir web linki YOK (bilerek sunmuyorlar) —
// bu yüzden masaüstü panelinde Instagram butonu bulunmuyor, sadece mobil
// native menüde (Instagram uygulaması kuruluysa) çıkabilir.
export default function PaylasButonu({ baslik, url, boyut = 'normal' }) {
  const [panelAcik, setPanelAcik] = useState(false)
  const tamUrl = url.startsWith('http') ? url : `https://seyirdefteri.com${url}`

  async function tiklandi() {
    if (navigator.share) {
      try {
        await navigator.share({ title: baslik, url: tamUrl })
      } catch {
        // Kullanıcı paylaşım menüsünü iptal etti — sorun değil, sessizce geç.
      }
      return
    }
    setPanelAcik((a) => !a)
  }

  const platformlar = [
    { ad: 'WhatsApp', ikon: '💬', href: `https://wa.me/?text=${encodeURIComponent(`${baslik} — ${tamUrl}`)}` },
    { ad: 'Facebook', ikon: '📘', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(tamUrl)}` },
    { ad: 'X', ikon: '𝕏', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(baslik)}&url=${encodeURIComponent(tamUrl)}` },
    { ad: 'Telegram', ikon: '✈️', href: `https://t.me/share/url?url=${encodeURIComponent(tamUrl)}&text=${encodeURIComponent(baslik)}` },
  ]

  const boyutSinifi = boyut === 'kucuk' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5'

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={tiklandi}
        className={`rounded-full bg-kagitKoyu font-govde text-kraft ring-1 ring-cizgi hover:text-murekkep ${boyutSinifi}`}
      >
        ↗ Paylaş
      </button>
      {panelAcik && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setPanelAcik(false)} />
          <div className="absolute right-0 z-20 mt-1 flex gap-1.5 rounded-sm bg-kagit p-2 ring-1 ring-cizgi">
            {platformlar.map((p) => (
              <a
                key={p.ad}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setPanelAcik(false)}
                title={p.ad}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-kagitKoyu text-sm ring-1 ring-cizgi hover:ring-deniz/50"
              >
                {p.ikon}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { ODA_TEMASI } from '../../utils/toplantiOdasi.js'

// Daily Prebuilt'i (kamera, mikrofon, ekran paylaşımı, sohbet) verilen kutuya gömer.
// Kamera/mikrofon testi Daily'nin kendi "katılmadan önce" ekranında yapılır.
// Katılımcı listesi değiştikçe onKatilimcilar([{ uid, ad, yerel }]) çağrılır.
export default function VideoSahnesi({ giris, onAyrildi, onKatilimcilar, onHata }) {
  const kutu = useRef(null)
  const cagri = useRef(null)
  // Geri çağrıları ref'te tut ki efekt yeniden çalışmasın (tek Daily örneği şart).
  const geri = useRef({ onAyrildi, onKatilimcilar, onHata })
  geri.current = { onAyrildi, onKatilimcilar, onHata }

  useEffect(() => {
    if (!giris?.url || !kutu.current) return
    let iptal = false

    async function baslat() {
      const { default: DailyIframe } = await import('@daily-co/daily-js')
      if (iptal) return
      // StrictMode/yeniden bağlanma: önceki örnek kaldıysa yok et.
      const eski = DailyIframe.getCallInstance?.()
      if (eski) await eski.destroy()
      if (iptal) return

      const c = DailyIframe.createFrame(kutu.current, {
        iframeStyle: { width: '100%', height: '100%', border: '0', borderRadius: '6px', background: '#0b0b10' },
        showLeaveButton: true,
        showFullscreenButton: true,
        lang: 'tr',
        theme: ODA_TEMASI,
      })
      cagri.current = c

      const listele = () => {
        const p = c.participants() || {}
        geri.current.onKatilimcilar?.(
          Object.values(p).map((k) => ({ uid: k.user_id || k.session_id, ad: k.user_name || 'Misafir', yerel: !!k.local }))
        )
      }
      c.on('joined-meeting', listele)
        .on('participant-joined', listele)
        .on('participant-updated', listele)
        .on('participant-left', listele)
        .on('left-meeting', () => geri.current.onAyrildi?.())
        .on('error', (e) => geri.current.onHata?.(e?.errorMsg || 'Bağlantı hatası'))

      await c.join({ url: giris.url, token: giris.token })
    }

    baslat().catch((e) => geri.current.onHata?.(e?.message || 'Video başlatılamadı'))
    return () => {
      iptal = true
      const c = cagri.current
      cagri.current = null
      if (c) c.destroy().catch(() => {})
    }
  }, [giris?.url, giris?.token])

  return <div ref={kutu} className="h-full w-full" />
}

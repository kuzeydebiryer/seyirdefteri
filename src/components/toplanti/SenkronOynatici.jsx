import { useCallback, useEffect, useRef, useState } from 'react'

// 🎬 Senkron oynatıcı: yansıtan kişi (ya da moderatör) oynat/duraklat/sar dediğinde herkesin
// ekranında aynı saniyeye gelir. Kaynak: YouTube (IFrame API) ya da kulübün yüklediği kısa kesit.
// Durum ekran belgesinde: oynatma = { oynuyor, konum (sn), ms (yazıldığı an) }.
// İzleyenlerde tarayıcı otomatik sesli oynatmaya izin vermediği için video sessiz başlar;
// "Sesi aç" ile açılır. Sapma 1,5 sn'yi geçerse düzeltilir.

let ytSozu = null
function ytYukle() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!ytSozu) {
    ytSozu = new Promise((coz) => {
      const onceki = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        onceki?.()
        coz(window.YT)
      }
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
    })
  }
  return ytSozu
}

const sureYaz = (sn) => {
  const t = Math.max(0, Math.floor(sn || 0))
  const s = Math.floor(t / 3600)
  const d = Math.floor((t % 3600) / 60)
  const n = t % 60
  return `${s ? `${s}:` : ''}${String(d).padStart(s ? 2 : 1, '0')}:${String(n).padStart(2, '0')}`
}

export default function SenkronOynatici({ video, oynatma, yonetenAd, kontrolEdebilir, yaz }) {
  const ytKutu = useRef(null)
  const videoEl = useRef(null)
  const yt = useRef(null)
  const [hazir, setHazir] = useState(false)
  const [sesAcik, setSesAcik] = useState(false)
  const [an, setAn] = useState(0)
  const [sure, setSure] = useState(0)
  const [kaydirma, setKaydirma] = useState(null)
  const o = oynatma || { oynuyor: false, konum: 0, ms: Date.now() }

  // Ortak arayüz: YouTube ya da <video>.
  const oy = useCallback(() => {
    if (video?.tip === 'youtube') {
      const p = yt.current
      if (!p?.getCurrentTime) return null
      return {
        konum: () => p.getCurrentTime() || 0,
        sure: () => p.getDuration() || 0,
        oynat: () => p.playVideo(),
        durdur: () => p.pauseVideo(),
        git: (sn) => p.seekTo(sn, true),
        sessiz: (b) => (b ? p.mute() : p.unMute()),
      }
    }
    const v = videoEl.current
    if (!v) return null
    return {
      konum: () => v.currentTime || 0,
      sure: () => (Number.isFinite(v.duration) ? v.duration : 0),
      oynat: () => v.play().catch(() => {}),
      durdur: () => v.pause(),
      git: (sn) => {
        v.currentTime = sn
      },
      sessiz: (b) => {
        v.muted = b
      },
    }
  }, [video?.tip])

  // YouTube oynatıcısını kur.
  useEffect(() => {
    setHazir(false)
    if (video?.tip !== 'youtube' || !video.id) return
    let iptal = false
    ytYukle().then((YT) => {
      if (iptal || !ytKutu.current) return
      const hedef = document.createElement('div')
      ytKutu.current.innerHTML = ''
      ytKutu.current.appendChild(hedef)
      yt.current = new YT.Player(hedef, {
        videoId: video.id,
        host: 'https://www.youtube-nocookie.com',
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, playsinline: 1, controls: 0, disablekb: 1, modestbranding: 1, start: Math.floor(video.baslangic || 0) },
        events: {
          onReady: (e) => {
            if (iptal) return
            e.target.mute()
            setHazir(true)
          },
        },
      })
    })
    return () => {
      iptal = true
      try {
        yt.current?.destroy?.()
      } catch {
        /* zaten kapanmış */
      }
      yt.current = null
    }
  }, [video?.tip, video?.id, video?.baslangic])

  // Hedef konuma ve oynatma durumuna uy.
  const uy = useCallback(() => {
    const p = oy()
    if (!p) return
    const hedef = o.oynuyor ? o.konum + Math.max(0, Date.now() - o.ms) / 1000 : o.konum
    if (Math.abs(p.konum() - hedef) > 1.5) p.git(hedef)
    if (o.oynuyor) p.oynat()
    else p.durdur()
  }, [oy, o.oynuyor, o.konum, o.ms])

  useEffect(() => {
    if (!hazir) return
    uy()
    if (!o.oynuyor) return
    const t = setInterval(uy, 4000)
    return () => clearInterval(t)
  }, [hazir, uy, o.oynuyor])

  // Süre çubuğu.
  useEffect(() => {
    const t = setInterval(() => {
      const p = oy()
      if (!p) return
      setAn(p.konum())
      setSure(p.sure())
    }, 500)
    return () => clearInterval(t)
  }, [oy])

  function sesiAc() {
    const p = oy()
    if (!p) return
    p.sessiz(false)
    setSesAcik(true)
    if (o.oynuyor) p.oynat()
  }

  const yazOynatma = (oynuyor, konum) => yaz({ oynuyor, konum: Math.max(0, Math.round(konum * 10) / 10), ms: Date.now() })
  function oynatDuraklat() {
    const p = oy()
    const su = p ? p.konum() : o.konum
    if (!sesAcik) sesiAc()
    yazOynatma(!o.oynuyor, su)
  }
  const sar = (fark) => {
    const p = oy()
    yazOynatma(o.oynuyor, (p ? p.konum() : o.konum) + fark)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#ffd84d]">🎬 Senkron oynatıcı</p>
      <h2 className="font-baslik text-2xl text-white">{video?.baslik || 'Kesit'}</h2>
      <p className="mb-3 text-xs text-[#d9d2c3]">
        {kontrolEdebilir ? 'Oynat, duraklat ya da sar: herkes aynı saniyeyi görür.' : `${yonetenAd || 'Yansıtan'} yönetiyor; görüntü kendiliğinden eşitlenir.`}
      </p>

      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black ring-1 ring-white/15">
        {video?.tip === 'youtube' ? (
          <div ref={ytKutu} className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full" />
        ) : (
          <video
            ref={videoEl}
            src={video?.src}
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={() => setHazir(true)}
            className="absolute inset-0 h-full w-full bg-black object-contain"
          />
        )}
        {/* İzleyenler videoya tıklayıp akışı bozmasın */}
        {!kontrolEdebilir && <div className="absolute inset-0" />}
        {!sesAcik && hazir && (
          <button
            type="button"
            onClick={sesiAc}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-bold text-[#0b0b10] shadow-lg"
            style={{ background: '#ffd84d' }}
          >
            🔊 Sesi aç
          </button>
        )}
        {!hazir && <p className="absolute inset-0 flex items-center justify-center text-sm text-[#d9d2c3]">Oynatıcı hazırlanıyor…</p>}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-white">
        {kontrolEdebilir && (
          <>
            <button type="button" onClick={() => sar(-10)} className="rounded-sm bg-white/15 px-2 py-1.5" title="10 sn geri">
              ⏪ 10
            </button>
            <button
              type="button"
              onClick={oynatDuraklat}
              disabled={!hazir}
              className="rounded-sm px-4 py-1.5 font-bold text-[#0b0b10] disabled:opacity-40"
              style={{ background: '#ffd84d' }}
            >
              {o.oynuyor ? '⏸ Duraklat' : '▶ Oynat'}
            </button>
            <button type="button" onClick={() => sar(10)} className="rounded-sm bg-white/15 px-2 py-1.5" title="10 sn ileri">
              10 ⏩
            </button>
          </>
        )}
        {!kontrolEdebilir && <span className="rounded-sm bg-white/10 px-2 py-1">{o.oynuyor ? '▶ Oynuyor' : '⏸ Duraklatıldı'}</span>}
        <span className="w-12 text-right font-mono text-[#d9d2c3]">{sureYaz(kaydirma ?? an)}</span>
        <input
          type="range"
          min="0"
          max={Math.max(1, Math.floor(sure))}
          step="1"
          value={Math.floor(kaydirma ?? an)}
          disabled={!kontrolEdebilir || !sure}
          onChange={(e) => setKaydirma(Number(e.target.value))}
          onPointerUp={() => {
            if (kaydirma != null) yazOynatma(o.oynuyor, kaydirma)
            setKaydirma(null)
          }}
          onKeyUp={() => {
            if (kaydirma != null) yazOynatma(o.oynuyor, kaydirma)
            setKaydirma(null)
          }}
          className="flex-1"
          style={{ accentColor: '#C9A227' }}
          aria-label="Konum"
        />
        <span className="w-12 font-mono text-[#d9d2c3]">{sureYaz(sure)}</span>
      </div>
      <p className="mt-2 text-[11px] text-[#b9b2a3]">İpucu: video sesi mikrofona geri dönmesin diye kulaklık kullanın.</p>
    </div>
  )
}

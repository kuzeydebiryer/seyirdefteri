import { useEffect, useMemo, useRef, useState } from 'react'
import { INCELEME_BOLUMLERI } from '../utils/incelemeDefteri.js'
import { videoGomuGetir } from '../utils/incelemeMedya.js'
import { zamanFormatla } from '../utils/altyazi.js'

// Zoom Tartışma Modu: etkinlik sırasında ekran paylaşımı için tam ekran, büyük puntolu
// slayt görünümü. Slaytlar defterdeki canlı veriden kurulur (biri yazınca burada da güncellenir):
// kapak → her üyenin Yakın Okuma sahnesi → ortak defter bölümleri → Zoom soruları → puanlar.
// Kontroller: ← → / boşluk (gezin), F (tam ekran), + − (yazı boyutu), Esc (kapat).

export function slaytlariKur({ etkinlik, sahneKayitlari, bolumler, medya, anNotlari }) {
  const slaytlar = [{ tur: 'kapak', anahtar: 'kapak', etiket: 'Kapak' }]
  const sirali = [...sahneKayitlari].sort((a, b) => (a.kullaniciAdi || '').localeCompare(b.kullaniciAdi || '', 'tr'))

  sirali
    .filter((k) => ['sahne', 'gordugum', 'etki', 'baska'].some((a) => k[a]))
    .forEach((k) => slaytlar.push({ tur: 'sahne', anahtar: `sahne:${k.id}`, kayit: k, etiket: `🎞️ ${(k.kullaniciAdi || 'Üye').split(' ')[0]}` }))

  // Eklenen kareler ve videolar (kendi slaytları): sahne konuşması sırasında ekranda gösterilir.
  const kareler = (medya || []).filter((m) => m.tur === 'kare')
  kareler.forEach((m, i) => slaytlar.push({ tur: 'kare', anahtar: `kare:${m.id}`, kayit: m, no: i + 1, toplam: kareler.length, etiket: `🖼️ Kare ${i + 1}` }))
  ;(medya || [])
    .filter((m) => m.tur === 'video' && videoGomuGetir(m))
    .forEach((m, i) => slaytlar.push({ tur: 'video', anahtar: `video:${m.id}`, kayit: m, etiket: `🎬 Kesit ${i + 1}` }))

  // Altyazıdan / zaman kodundan "Tartışmaya ekle" denen anlar (zaman sırasıyla). Sadece kulüple
  // paylaşılanlar; yorum slayta ancak üye izin verdiyse ve tıklayınca açılır.
  ;(anNotlari || [])
    .filter((n) => n.slaytta && n.gorunurluk === 'kulup')
    .sort((a, b) => (a.hedefMs ?? 0) - (b.hedefMs ?? 0))
    .forEach((n) => slaytlar.push({ tur: 'an', anahtar: `an:${n.id}`, kayit: n, etiket: `⏱ ${zamanFormatla(n.hedefMs)}` }))

  INCELEME_BOLUMLERI.filter((b) => bolumler?.[b.id]?.metin?.trim()).forEach((b) =>
    slaytlar.push({ tur: 'bolum', anahtar: `bolum:${b.id}`, bolum: b, metin: bolumler[b.id].metin, ad: bolumler[b.id].guncelleyenAd, etiket: `${b.ikon} ${b.baslik}` })
  )

  const sorulu = sirali.filter((k) => k.soru?.trim())
  sorulu.forEach((k, i) => slaytlar.push({ tur: 'soru', anahtar: `soru:${k.id}`, kayit: k, no: i + 1, toplam: sorulu.length, etiket: `💬 Soru ${i + 1}` }))

  slaytlar.push({ tur: 'puan', anahtar: 'puan', etiket: '⭐ Puanlar' })
  return slaytlar
}

function ortalamaGoster(puanlar) {
  const dolu = (puanlar || []).filter((p) => p.puan != null)
  if (!dolu.length) return null
  const ort = (dolu.reduce((t, p) => t + p.puan, 0) / dolu.length) * 2
  return ort.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

// Tek bir slaydın içeriği — hem tam ekran Tartışma Modu hem Sinema Odası'ndaki
// senkron ortak sunum kullanır. Renkler sabit (koyu zemin).
export function SlaytGovdesi({ slayt, etkinlik, kunye, medya, puanlar, olcek = 1, acikYorumlar = {}, yorumAc }) {
  const govde = { fontSize: `${1.35 * olcek}rem`, lineHeight: 1.5 }
  const etiketStil = { fontSize: `${0.95 * olcek}rem`, fontWeight: 700 }

  function Etiketli({ ad, metin }) {
    if (!metin) return null
    return (
      <div>
        <p className="font-bold uppercase tracking-widest text-[#ffd84d]" style={etiketStil}>{ad}</p>
        <p className="mt-1 whitespace-pre-wrap text-white" style={govde}>{metin}</p>
      </div>
    )
  }

  let icerik
  if (slayt.tur === 'kapak') {
    icerik = (
      <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
        {etkinlik.eserPosterUrl && (
          <img src={etkinlik.eserPosterUrl} alt="" className="h-72 rounded-sm object-cover ring-4 ring-yellow-400/70 md:h-96" />
        )}
        <div>
          <p className="uppercase tracking-[0.3em] text-[#ffd84d]" style={etiketStil}>🎬 {etkinlik.topluluklAd}</p>
          <h1 className="mt-2 font-baslik text-white" style={{ fontSize: `${3 * olcek}rem`, lineHeight: 1.1 }}>
            {etkinlik.eserBaslik}
          </h1>
          <p className="mt-2 text-[#ffd84d]" style={{ fontSize: `${1.2 * olcek}rem` }}>
            {[etkinlik.eserYil, kunye?.sureDk && `${kunye.sureDk} dk`, kunye?.turler?.join(', ')].filter(Boolean).join(' · ')}
          </p>
          {kunye?.yonetmenler?.length > 0 && (
            <p className="mt-3 text-gray-100" style={govde}>
              Yönetmen: {kunye.yonetmenler.join(', ')}
            </p>
          )}
          {kunye?.oyuncular?.length > 0 && (
            <p className="text-gray-100" style={{ fontSize: `${1 * olcek}rem` }}>
              {kunye.oyuncular.join(' · ')}
            </p>
          )}
        </div>
      </div>
    )
  } else if (slayt.tur === 'sahne') {
    const k = slayt.kayit
    icerik = (
      <div className="space-y-6">
        <div>
          <p className="uppercase tracking-[0.25em] text-[#ffd84d]" style={etiketStil}>🎞️ {k.kullaniciAdi || 'Üye'} · Yakın Okuma</p>
          {k.sahne && (
            <h2 className="mt-1 font-baslik text-white" style={{ fontSize: `${2.2 * olcek}rem`, lineHeight: 1.2 }}>
              {k.sahne}
            </h2>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Etiketli ad="Ne görüyorum / duyuyorum?" metin={k.gordugum} />
          <Etiketli ad="Etkisi ne?" metin={k.etki} />
          <Etiketli ad="Başka nasıl okunabilir?" metin={k.baska} />
        </div>
        {k.soru && (
          <p className="rounded-sm bg-white/15 px-4 py-3 text-white" style={{ fontSize: `${1.1 * olcek}rem` }}>
            💬 {k.soru}
          </p>
        )}
      </div>
    )
  } else if (slayt.tur === 'kare') {
    const m = slayt.kayit
    icerik = (
      <div className="flex flex-col items-center text-center">
        <img src={m.url} alt={m.baslik || ''} className="max-h-[68vh] max-w-full rounded-sm object-contain ring-2 ring-yellow-400/40" />
        {m.baslik && (
          <p className="mt-3 text-white" style={{ fontSize: `${1.4 * olcek}rem` }}>
            {m.baslik}
          </p>
        )}
        <p className="mt-1 text-gray-100" style={etiketStil}>
          🖼️ Kare {slayt.no}/{slayt.toplam}{m.kaynak !== 'tmdb' && m.ekleyenAd ? ` · ${m.ekleyenAd}` : ''}
        </p>
      </div>
    )
  } else if (slayt.tur === 'video') {
    const m = slayt.kayit
    const gomu = videoGomuGetir(m)
    icerik = (
      <div className="flex flex-col items-center">
        {gomu?.tip === 'dosya' ? (
          <video src={gomu.src} controls className="max-h-[68vh] max-w-full rounded-sm bg-black" />
        ) : (
          <div className="aspect-video w-full max-w-5xl overflow-hidden rounded-sm bg-black" style={{ maxHeight: '68vh' }}>
            <iframe src={gomu?.src} title={m.baslik || 'Kesit'} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          </div>
        )}
        {m.baslik && (
          <p className="mt-3 text-white" style={{ fontSize: `${1.3 * olcek}rem` }}>
            🎬 {m.baslik}
          </p>
        )}
      </div>
    )
  } else if (slayt.tur === 'an') {
    const n = slayt.kayit
    const m = n.medyaId ? (medya || []).find((x) => x.id === n.medyaId) : null
    const gomu = m?.tur === 'video' ? videoGomuGetir(m) : null
    icerik = (
      <div className="flex flex-col items-center text-center">
        <p className="font-mono font-bold text-[#ffd84d]" style={{ fontSize: `${2.6 * olcek}rem` }}>⏱ {zamanFormatla(n.hedefMs)}</p>
        {n.replik && (
          <p className="mt-3 max-w-4xl whitespace-pre-wrap font-baslik italic text-white" style={{ fontSize: `${2.2 * olcek}rem`, lineHeight: 1.3 }}>
            “{n.replik}”
          </p>
        )}
        {m?.tur === 'kare' && <img src={m.url} alt={m.baslik || ''} className="mt-4 max-h-[34vh] max-w-full rounded-sm object-contain ring-2 ring-yellow-400/40" />}
        {gomu?.tip === 'dosya' && <video src={gomu.src} controls className="mt-4 max-h-[34vh] max-w-full rounded-sm bg-black" />}
        {gomu?.tip === 'iframe' && (
          <div className="mt-4 aspect-video w-full max-w-3xl overflow-hidden rounded-sm bg-black" style={{ maxHeight: '34vh' }}>
            <iframe src={gomu.src} title={m.baslik || 'Kesit'} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          </div>
        )}
        {n.soru && (
          <p className="mt-5 max-w-4xl rounded-sm bg-white/20 ring-1 ring-white/30 px-5 py-4 text-white" style={{ fontSize: `${1.5 * olcek}rem`, lineHeight: 1.4 }}>
            💬 {n.soru}
          </p>
        )}
        {n.yorumAcik && n.yorum && (
          <div className="mt-4 max-w-4xl">
            {acikYorumlar[n.id] ? (
              <p className="whitespace-pre-wrap text-gray-100" style={{ fontSize: `${1.15 * olcek}rem` }}>
                <span className="text-gray-100" style={etiketStil}>{n.kullaniciAdi || 'Üye'} yorumu: </span>
                {n.yorum}
              </p>
            ) : !yorumAc ? (
              <p className="text-gray-100" style={etiketStil}>💬 {n.kullaniciAdi || 'Üye'} yorumu moderatör açınca görünecek</p>
            ) : (
              <button onClick={() => yorumAc(n.id)} className="rounded-full bg-white/20 ring-1 ring-white/30 px-4 py-1.5 text-gray-100" style={etiketStil}>
                {n.kullaniciAdi || 'Üye'} yorumunu aç
              </button>
            )}
          </div>
        )}
        <p className="mt-4 text-gray-100" style={etiketStil}>{n.kullaniciAdi || 'Üye'}{n.altyaziEtiketi ? ` · ${n.altyaziEtiketi}` : ''}</p>
      </div>
    )
  } else if (slayt.tur === 'bolum') {
    icerik = (
      <div>
        <p className="inline-block rounded-sm px-3 py-1 font-baslik text-white" style={{ background: slayt.bolum.renk, fontSize: `${1.4 * olcek}rem` }}>
          {slayt.bolum.ikon} {slayt.bolum.baslik}
        </p>
        <p className="mt-5 whitespace-pre-wrap text-white" style={{ ...govde, fontSize: `${1.6 * olcek}rem` }}>
          {slayt.metin}
        </p>
        {slayt.ad && <p className="mt-4 text-gray-100" style={etiketStil}>Yazan: {slayt.ad}</p>}
      </div>
    )
  } else if (slayt.tur === 'soru') {
    const k = slayt.kayit
    icerik = (
      <div className="text-center">
        <p className="uppercase tracking-[0.3em] text-[#ffd84d]" style={etiketStil}>
          💬 Soru {slayt.no}/{slayt.toplam} · {k.kullaniciAdi || 'Üye'}
        </p>
        <p className="mx-auto mt-5 max-w-4xl font-baslik text-white" style={{ fontSize: `${2.4 * olcek}rem`, lineHeight: 1.3 }}>
          “{k.soru}”
        </p>
        {k.sahne && (
          <p className="mt-6 text-gray-100" style={{ fontSize: `${1 * olcek}rem` }}>
            Bağlı sahne: {k.sahne}
          </p>
        )}
      </div>
    )
  } else {
    const ort = ortalamaGoster(puanlar)
    const dolu = (puanlar || []).filter((p) => p.puan != null || p.cumle)
    icerik = (
      <div>
        <p className="uppercase tracking-[0.3em] text-[#ffd84d]" style={etiketStil}>⭐ Kulüp Puanları{ort ? ` · Ortalama ${ort}/10` : ''}</p>
        {dolu.length === 0 ? (
          <p className="mt-4 text-gray-100" style={govde}>Henüz puan veren yok.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {dolu.map((p) => (
              <div key={p.kullaniciId} className="rounded-sm bg-white/20 ring-1 ring-white/30 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-baslik text-white" style={{ fontSize: `${1.3 * olcek}rem` }}>{p.kullaniciAdi}</span>
                  <span className="font-baslik text-[#ffd84d]" style={{ fontSize: `${2 * olcek}rem` }}>{p.puan != null ? p.puan * 2 : '-'}</span>
                </div>
                {p.cumle && <p className="mt-1 italic text-gray-100" style={{ fontSize: `${1.05 * olcek}rem` }}>“{p.cumle}”</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return icerik
}

export default function TartismaModu({ acik, kapat, etkinlik, kunye, sahneKayitlari, bolumler, medya, anNotlari, puanlar }) {
  const [sira, setSira] = useState(0)
  const [olcek, setOlcek] = useState(1)
  const [acikYorumlar, setAcikYorumlar] = useState({}) // an notu id → yorum açıldı mı
  const kok = useRef(null)
  const dokunmaX = useRef(null)

  const slaytlar = useMemo(
    () => slaytlariKur({ etkinlik, sahneKayitlari, bolumler, medya, anNotlari }),
    [etkinlik, sahneKayitlari, bolumler, medya, anNotlari]
  )
  const guvenliSira = Math.min(sira, slaytlar.length - 1)
  const slayt = slaytlar[guvenliSira]

  const git = (n) => setSira(Math.max(0, Math.min(slaytlar.length - 1, n)))

  async function tamEkranDegistir() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await kok.current?.requestFullscreen?.()
    } catch {
      /* tam ekran desteklenmiyorsa overlay zaten sayfayı kaplıyor */
    }
  }

  useEffect(() => {
    if (!acik) return
    setSira(0)
    const oncekiOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = oncekiOverflow
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [acik])

  useEffect(() => {
    if (!acik) return
    function tus(e) {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        setSira((s) => Math.min(slaytlar.length - 1, s + 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        setSira((s) => Math.max(0, s - 1))
      } else if (e.key === 'Escape') kapat()
      else if (e.key === 'f' || e.key === 'F') tamEkranDegistir()
      else if (e.key === '+' || e.key === '=') setOlcek((o) => Math.min(1.8, +(o + 0.1).toFixed(1)))
      else if (e.key === '-') setOlcek((o) => Math.max(0.7, +(o - 0.1).toFixed(1)))
    }
    window.addEventListener('keydown', tus)
    return () => window.removeEventListener('keydown', tus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, slaytlar.length])

  if (!acik) return null

  const icerik = (
    <SlaytGovdesi
      slayt={slayt}
      etkinlik={etkinlik}
      kunye={kunye}
      medya={medya}
      puanlar={puanlar}
      olcek={olcek}
      acikYorumlar={acikYorumlar}
      yorumAc={(id) => setAcikYorumlar((a) => ({ ...a, [id]: true }))}
    />
  )

  const bos = slaytlar.length <= 2 && !slaytlar.some((s) => s.tur !== 'kapak' && s.tur !== 'puan')

  return (
    <div
      ref={kok}
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: '#0a0a10' }}
      onTouchStart={(e) => (dokunmaX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (dokunmaX.current == null) return
        const fark = e.changedTouches[0].clientX - dokunmaX.current
        if (Math.abs(fark) > 60) git(guvenliSira + (fark < 0 ? 1 : -1))
        dokunmaX.current = null
      }}
    >
      {/* Üst çubuk */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 text-sm text-white">
        <span className="truncate">🎬 {etkinlik.eserBaslik} · {guvenliSira + 1}/{slaytlar.length}</span>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => setOlcek((o) => Math.max(0.7, +(o - 0.1).toFixed(1)))} className="rounded-sm bg-white/20 ring-1 ring-white/30 px-2 py-1" title="Yazıyı küçült (−)">A−</button>
          <button onClick={() => setOlcek((o) => Math.min(1.8, +(o + 0.1).toFixed(1)))} className="rounded-sm bg-white/20 ring-1 ring-white/30 px-2 py-1" title="Yazıyı büyüt (+)">A+</button>
          <button onClick={tamEkranDegistir} className="rounded-sm bg-white/20 ring-1 ring-white/30 px-2 py-1" title="Tam ekran (F)">⛶ Tam ekran</button>
          <button onClick={kapat} className="rounded-sm bg-yellow-400 px-2 py-1 font-bold text-black" title="Kapat (Esc)">✕ Kapat</button>
        </div>
      </div>

      {/* Slayt */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center">
          {icerik}
          {bos && (
            <p className="mt-8 text-center text-gray-100" style={{ fontSize: `${1 * olcek}rem` }}>
              Henüz sahne notu ya da soru yazılmamış. Defterde “Yakın Okuma” kartını doldurunca burada belirir.
            </p>
          )}
        </div>
      </div>

      {/* Gezinme */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={() => git(guvenliSira - 1)} disabled={guvenliSira === 0} className="rounded-sm bg-white/20 ring-1 ring-white/30 px-3 py-1.5 text-sm text-white disabled:opacity-40">← Önceki</button>
        <div className="flex flex-1 items-center justify-center gap-1 overflow-x-auto">
          {slaytlar.map((s, i) => (
            <button
              key={i}
              onClick={() => git(i)}
              title={s.etiket}
              className={`h-2 shrink-0 rounded-full transition-all ${i === guvenliSira ? 'w-6 bg-yellow-400' : 'w-2 bg-white/30 hover:bg-white/60'}`}
            />
          ))}
        </div>
        <button onClick={() => git(guvenliSira + 1)} disabled={guvenliSira === slaytlar.length - 1} className="rounded-sm bg-yellow-400 px-3 py-1.5 text-sm font-bold text-black disabled:opacity-40">Sonraki →</button>
      </div>
    </div>
  )
}

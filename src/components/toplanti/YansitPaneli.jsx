import { useEffect, useState } from 'react'
import { kullaniciListeleriGetir, listeOgeleriGetir } from '../../utils/kisiselListe.js'
import { yansitilacakEser } from '../../utils/odaEkrani.js'
import { linkCoz, tmdbVideolariGetir } from '../../utils/incelemeMedya.js'
import { odulYansitmaVerisi } from '../../utils/odulAdayliklari.js'
import YapimArama from './YapimArama.jsx'

// 📺 Yansıt sekmesi: her üye bir yapımı, kendi listesini ya da aday oylamasını ortak ekrana yansıtabilir.
function Baslik({ children }) {
  return <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wider text-[#C9A227] first:mt-0">{children}</p>
}

export default function YansitPaneli({ etkinlik, benimUid, adim, ekran, yansit, kapat, medya = [], adayliklar }) {
  const [listeler, setListeler] = useState(null)
  const [mesgul, setMesgul] = useState('')
  const [hata, setHata] = useState('')
  const [fragmanlar, setFragmanlar] = useState(null)
  const [link, setLink] = useState('')

  useEffect(() => {
    if (!benimUid) return
    kullaniciListeleriGetir(benimUid)
      .then(setListeler)
      .catch(() => setListeler([]))
  }, [benimUid])

  async function calistir(anahtar, fn) {
    setMesgul(anahtar)
    setHata('')
    try {
      await fn()
    } catch (e) {
      setHata(e?.message?.includes('permission') ? 'Yansıtılamadı (yetki).' : 'Yansıtılamadı.')
    } finally {
      setMesgul('')
    }
  }

  const videoYansit = (video) =>
    calistir(`video-${video.id || video.src}`, () =>
      yansit({ tur: 'video', video, oynatma: { oynuyor: false, konum: video.baslangic || 0, ms: Date.now() } })
    )

  // Medya Kutusu kesitleri: YouTube bağlantıları ve yüklenen kısa videolar (Vimeo senkronlanamaz).
  const kesitler = medya
    .filter((m) => m.tur === 'video')
    .map((m) => {
      if (m.kaynak === 'yukleme') return { tip: 'dosya', src: m.url, baslik: m.baslik || 'Yüklenen kesit', baslangic: 0 }
      const c = linkCoz(m.url)
      return c.tip === 'youtube' ? { tip: 'youtube', id: c.id, baslik: m.baslik || 'YouTube kesiti', baslangic: c.baslangic || 0 } : null
    })
    .filter(Boolean)

  function linktenYansit(e) {
    e.preventDefault()
    const c = linkCoz(link)
    if (c.tip !== 'youtube') return setHata('Senkron oynatma için bir YouTube bağlantısı yapıştır.')
    videoYansit({ tip: 'youtube', id: c.id, baslik: 'YouTube videosu', baslangic: c.baslangic || 0 })
    setLink('')
  }

  const eserYansit = (eser) => calistir(`eser-${eser.eserTmdbId}`, async () => yansit({ tur: 'eser', eser: await yansitilacakEser(eser) }))

  const listeYansit = (l) =>
    calistir(`liste-${l.id}`, async () => {
      const ogeler = (await listeOgeleriGetir(l.id)).slice(0, 60).map((o) => ({
        tur: o.tur || '',
        disId: o.disId ?? '',
        baslik: o.baslik || '',
        alt: o.alt || '',
        posterUrl: o.posterUrl || '',
      }))
      await yansit({ tur: 'liste', liste: { ad: l.baslik || 'Liste', sahipAd: adim, ogeler }, vurgu: null })
    })

  return (
    <div>
      <p className="mb-3 text-xs leading-relaxed text-[#d9d2c3]">Yansıttığın şey herkesin ortak ekranında açılır. Başka biri yansıtınca ekran onunkiyle değişir.</p>

      {ekran.tur !== 'yok' && (
        <button
          type="button"
          onClick={() => calistir('kapat', kapat)}
          className="mb-3 w-full rounded-sm bg-white/10 px-3 py-2 text-xs text-white ring-1 ring-white/20 hover:bg-white/20"
        >
          ✕ Ortak ekranı kapat ({ekran.yansitanAd})
        </button>
      )}

      <Baslik>Bu haftanın filmi</Baslik>
      <button
        type="button"
        disabled={!!mesgul}
        onClick={() => eserYansit({ eserTur: etkinlik.eserTur || 'sinema', eserTmdbId: etkinlik.eserTmdbId, eserBaslik: etkinlik.eserBaslik, eserYil: etkinlik.eserYil, eserPosterUrl: etkinlik.eserPosterUrl })}
        className="flex w-full items-center gap-2 rounded-sm bg-white/5 p-1.5 text-left ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
      >
        {etkinlik.eserPosterUrl && <img src={etkinlik.eserPosterUrl} alt="" className="h-12 w-8 rounded-sm object-cover" />}
        <span className="flex-1 truncate text-xs text-white">{etkinlik.eserBaslik}</span>
        <span className="text-[11px] font-bold text-[#ffd84d]">📺 Yansıt</span>
      </button>

      <Baslik>Ödül adaylıkları</Baslik>
      <button
        type="button"
        disabled={!!mesgul || !adayliklar}
        onClick={() => calistir('odul', () => yansit({ tur: 'odul', odul: odulYansitmaVerisi(etkinlik.eserBaslik, adayliklar), vurgu: null }))}
        className="w-full rounded-sm bg-white/10 px-3 py-2 text-left text-xs text-white ring-1 ring-white/20 hover:bg-white/20 disabled:opacity-50"
      >
        🏆 {etkinlik.eserBaslik}: {adayliklar ? (adayliklar.toplam ? `${adayliklar.toplam} adaylık ve rakipleri` : 'kayıtlı adaylık yok') : 'yükleniyor…'}
      </button>

      <Baslik>Senkron oynatıcı</Baslik>
      {kesitler.length > 0 && (
        <ul className="mb-2 space-y-1">
          {kesitler.map((v, i) => (
            <li key={i} className="flex items-center gap-2 rounded-sm bg-white/5 p-1.5 ring-1 ring-white/10">
              <span className="w-6 text-center">{v.tip === 'youtube' ? '▶️' : '🎞️'}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-white">{v.baslik}</span>
              <button type="button" disabled={!!mesgul} onClick={() => videoYansit(v)} className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold text-[#0b0b10] disabled:opacity-50" style={{ background: '#C9A227' }}>
                ▶ Herkese aç
              </button>
            </li>
          ))}
        </ul>
      )}
      {fragmanlar === null ? (
        <button
          type="button"
          onClick={() => tmdbVideolariGetir(etkinlik.eserTmdbId).then(setFragmanlar).catch(() => setFragmanlar([]))}
          className="mb-2 w-full rounded-sm bg-white/10 px-3 py-2 text-xs text-white ring-1 ring-white/20 hover:bg-white/20"
        >
          🎞️ Fragman ve klipleri getir
        </button>
      ) : fragmanlar.length === 0 ? (
        <p className="mb-2 text-xs text-[#b9b2a3]">TMDB’de fragman bulunamadı.</p>
      ) : (
        <ul className="mb-2 max-h-48 space-y-1 overflow-y-auto">
          {fragmanlar.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-sm bg-white/5 p-1.5 ring-1 ring-white/10">
              <img src={`https://i.ytimg.com/vi/${f.id}/default.jpg`} alt="" className="h-9 w-12 shrink-0 rounded-sm object-cover" />
              <span className="min-w-0 flex-1 truncate text-xs text-white">{f.ad}</span>
              <button type="button" disabled={!!mesgul} onClick={() => videoYansit({ tip: 'youtube', id: f.id, baslik: f.ad, baslangic: 0 })} className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold text-[#0b0b10] disabled:opacity-50" style={{ background: '#C9A227' }}>
                ▶ Aç
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={linktenYansit} className="flex gap-1">
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="YouTube bağlantısı yapıştır"
          className="min-w-0 flex-1 rounded-sm bg-white/10 px-2 py-1.5 text-xs text-white placeholder-[#b9b2a3] ring-1 ring-white/20"
        />
        <button type="submit" disabled={!link.trim()} className="shrink-0 rounded-sm px-2.5 text-[11px] font-bold text-[#0b0b10] disabled:opacity-40" style={{ background: '#C9A227' }}>
          ▶
        </button>
      </form>

      <Baslik>Bir yapım</Baslik>
      <YapimArama eylemEtiketi="📺 Yansıt" onSec={eserYansit} />

      <Baslik>Listelerim</Baslik>
      {listeler === null ? (
        <p className="text-xs text-[#b9b2a3]">Yükleniyor…</p>
      ) : listeler.length === 0 ? (
        <p className="text-xs text-[#b9b2a3]">Henüz listen yok (Listelerim sayfasından oluşturabilirsin).</p>
      ) : (
        <ul className="space-y-1">
          {listeler.map((l) => (
            <li key={l.id} className="flex items-center gap-2 rounded-sm bg-white/5 p-1.5 ring-1 ring-white/10">
              {l.kapakUrl ? <img src={l.kapakUrl} alt="" className="h-10 w-7 rounded-sm object-cover" /> : <span className="w-7 text-center">📋</span>}
              <span className="min-w-0 flex-1 truncate text-xs text-white">
                {l.baslik} <span className="text-[#b9b2a3]">({l.ogeSayisi || 0})</span>
              </span>
              <button
                type="button"
                disabled={!!mesgul}
                onClick={() => listeYansit(l)}
                className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold text-[#0b0b10] disabled:opacity-50"
                style={{ background: '#C9A227' }}
              >
                {mesgul === `liste-${l.id}` ? '…' : '📺 Yansıt'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Baslik>Gelecek film oylaması</Baslik>
      <button
        type="button"
        disabled={!!mesgul}
        onClick={() => calistir('aday', () => yansit({ tur: 'aday' }))}
        className="w-full rounded-sm bg-white/10 px-3 py-2 text-xs text-white ring-1 ring-white/20 hover:bg-white/20 disabled:opacity-50"
      >
        🗳️ Aday oylamasını yansıt
      </button>

      {hata && <p className="mt-3 rounded-sm bg-[#9b1c1c]/80 px-3 py-2 text-xs text-white">{hata}</p>}
    </div>
  )
}

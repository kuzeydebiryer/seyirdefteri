import { Link } from 'react-router-dom'
import { eserSayfaYolu } from '../../utils/odaEkrani.js'
import OdulGorunumu from './OdulGorunumu.jsx'
import MedyaGomulusu from '../MedyaGomulusu.jsx'
import SenkronOynatici from './SenkronOynatici.jsx'

// 📺 Ortak ekrana yansıtılan içerik: bir yapım, bir liste, gelecek film oylaması,
// ödül adaylıkları ya da senkron oynatıcı.
// Herkes aynı şeyi görür. Sabit koyu sinema paleti.

const SARI = '#ffd84d'
const ALTIN = '#C9A227'

function EserGorunumu({ e }) {
  const yol = eserSayfaYolu(e)
  return (
    <div className="relative">
      {e.backdropUrl && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-30"
          style={{ backgroundImage: `url(${e.backdropUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', maskImage: 'linear-gradient(#000, transparent)' }}
        />
      )}
      <div className="relative flex flex-col items-center gap-5 pt-2 text-center sm:flex-row sm:items-start sm:text-left">
        {e.posterUrl ? (
          <img src={e.posterUrl} alt={e.baslik} className="w-40 shrink-0 rounded-sm shadow-2xl ring-2 ring-[#ffd84d]/50 sm:w-52" />
        ) : (
          <div className="flex h-60 w-40 shrink-0 items-center justify-center rounded-sm bg-white/10 text-5xl">🎬</div>
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: SARI }}>
            {e.tur === 'dizi' ? 'Dizi' : 'Film'}
          </p>
          <h2 className="mt-1 font-baslik text-3xl leading-tight text-white sm:text-4xl">
            {e.baslik} {e.yil && <span className="text-[#d9d2c3]">({e.yil})</span>}
          </h2>
          {e.kunye && <p className="mt-2 text-sm" style={{ color: SARI }}>{e.kunye}</p>}
          {e.oyuncular && <p className="mt-1 text-sm text-[#e8e2d4]">{e.oyuncular}</p>}
          {e.ozet && <p className="mt-4 max-w-2xl text-base leading-relaxed text-white">{e.ozet}</p>}
          {yol && (
            <Link to={yol} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs text-white ring-1 ring-white/25 hover:bg-white/20">
              Seyirdefteri'de aç ↗
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function ListeGorunumu({ liste, vurgu, onVurgu }) {
  const ogeler = liste?.ogeler || []
  const secili = vurgu != null ? ogeler[vurgu] : null
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: SARI }}>
        Liste{liste?.sahipAd ? ` · ${liste.sahipAd}` : ''}
      </p>
      <h2 className="mt-1 font-baslik text-3xl text-white">{liste?.ad}</h2>
      <p className="text-xs text-[#d9d2c3]">{ogeler.length} yapım · Bir afişe dokununca herkes için öne çıkar.</p>

      {secili && (
        <div className="mt-4 flex items-center gap-4 rounded-md bg-white/10 p-3 ring-1 ring-[#ffd84d]/50">
          {secili.posterUrl && <img src={secili.posterUrl} alt="" className="w-24 rounded-sm" />}
          <div>
            <p className="font-baslik text-2xl text-white">
              {vurgu + 1}. {secili.baslik}
            </p>
            {secili.alt && <p className="text-sm text-[#e8e2d4]">{secili.alt}</p>}
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {ogeler.map((o, i) => (
          <button
            key={`${o.disId}-${i}`}
            type="button"
            onClick={() => onVurgu(i === vurgu ? null : i)}
            className={`rounded-sm text-left transition ${i === vurgu ? 'ring-2 ring-[#ffd84d]' : 'ring-1 ring-white/15 hover:ring-white/50'}`}
          >
            {o.posterUrl ? (
              <img src={o.posterUrl} alt={o.baslik} loading="lazy" className="aspect-[2/3] w-full rounded-t-sm object-cover" />
            ) : (
              <div className="flex aspect-[2/3] w-full items-center justify-center rounded-t-sm bg-white/10 text-2xl">🎬</div>
            )}
            <p className="truncate px-1.5 py-1 text-[11px] text-white">
              <span style={{ color: SARI }}>{i + 1}.</span> {o.baslik}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

function AdayGorunumu({ sonuc, oylama }) {
  const enCok = Math.max(1, ...sonuc.map((a) => a.oy))
  const toplam = sonuc.reduce((t, a) => t + a.oy, 0)
  const durumYazi = oylama.durum === 'acik' ? 'Oylama sürüyor' : oylama.durum === 'bitti' ? 'Oylama bitti' : 'Oylama henüz başlamadı'
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: SARI }}>
        🗳️ Gelecek film · {durumYazi}
      </p>
      <h2 className="mt-1 font-baslik text-3xl text-white">Sıradaki filmimiz hangisi?</h2>
      <p className="text-xs text-[#d9d2c3]">{toplam} oy · Herkesin tek oyu var; yan paneldeki “🗳️ Adaylar”dan oy verilir.</p>
      {sonuc.length === 0 && <p className="mt-6 text-sm text-[#d9d2c3]">Henüz aday yok. Yan paneldeki “🗳️ Adaylar”dan ekleyebilirsin.</p>}
      <ul className="mt-5 space-y-3">
        {sonuc.map((a) => {
          const kazanan = oylama.durum === 'bitti' && oylama.kazananId === a.id
          return (
            <li key={a.id} className={`flex items-center gap-3 rounded-md p-2 ${kazanan ? 'bg-[#C9A227]/25 ring-2 ring-[#ffd84d]' : 'bg-white/5 ring-1 ring-white/10'}`}>
              {a.eserPosterUrl ? (
                <img src={a.eserPosterUrl} alt="" className="h-20 w-14 shrink-0 rounded-sm object-cover" />
              ) : (
                <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-sm bg-white/10">🎬</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-baslik text-lg text-white">
                  {kazanan && '🏆 '}
                  {a.eserBaslik} {a.eserYil && <span className="text-sm text-[#d9d2c3]">({a.eserYil})</span>}
                </p>
                <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(a.oy / enCok) * 100}%`, background: kazanan ? SARI : ALTIN }} />
                </div>
                <p className="mt-1 truncate text-[11px] text-[#d9d2c3]">
                  {a.oyVerenler.length ? a.oyVerenler.join(', ') : `${a.onerenAdi || 'Üye'} önerdi`}
                </p>
              </div>
              <span className="w-10 shrink-0 text-right font-baslik text-3xl" style={{ color: SARI }}>
                {a.oy}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function EkranYansitma({ ekran, adaySonuc, adayOylamasi, onKapat, onVurgu, kontrolEdebilir, onOynatma }) {
  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: '#0a0a10' }}>
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5 text-xs text-white">
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0b0b10]" style={{ background: ALTIN }}>
          📺 Ortak ekran
        </span>
        <span className="truncate text-[#d9d2c3]">{ekran.yansitanAd} yansıtıyor</span>
        <button type="button" onClick={onKapat} className="ml-auto shrink-0 rounded-sm bg-white/15 px-2 py-0.5 hover:bg-white/25">
          ✕ Kapat
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-5xl">
          {ekran.tur === 'eser' && ekran.eser && <EserGorunumu e={ekran.eser} />}
          {ekran.tur === 'liste' && <ListeGorunumu liste={ekran.liste} vurgu={ekran.vurgu ?? null} onVurgu={onVurgu} />}
          {ekran.tur === 'aday' && <AdayGorunumu sonuc={adaySonuc} oylama={adayOylamasi} />}
          {ekran.tur === 'odul' && <OdulGorunumu odul={ekran.odul} vurgu={ekran.vurgu ?? null} onVurgu={onVurgu} />}
          {ekran.tur === 'sosyal' && ekran.sosyal?.url && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#ffd84d]">📱 Paylaşım</p>
              {ekran.sosyal.baslik && <h2 className="mt-1 font-baslik text-2xl text-white">{ekran.sosyal.baslik}</h2>}
              <p className="mb-4 text-xs text-[#d9d2c3]">
                Herkesin ekranında açıldı. Video varsa herkes kendi ekranında oynatır (senkron değildir).{' '}
                <a href={ekran.sosyal.url} target="_blank" rel="noreferrer" className="text-[#ffd84d] underline">
                  Kaynağında aç ↗
                </a>
              </p>
              <div className="mx-auto max-w-[560px] rounded-md bg-[#f5f0e1] p-2">
                <MedyaGomulusu url={ekran.sosyal.url} paylasanAdi={ekran.sosyal.paylasanAdi} />
              </div>
            </div>
          )}
          {ekran.tur === 'video' && ekran.video && (
            <SenkronOynatici
              video={ekran.video}
              oynatma={ekran.oynatma}
              yonetenAd={ekran.yansitanAd}
              kontrolEdebilir={kontrolEdebilir}
              yaz={onOynatma}
            />
          )}
        </div>
      </div>
    </div>
  )
}

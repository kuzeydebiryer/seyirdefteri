import { useState } from 'react'
import InstagramGomulusu from './InstagramGomulusu.jsx'

function gunSayisi(tarih) {
  if (!tarih) return null
  const fark = new Date(tarih) - new Date(new Date().toISOString().slice(0, 10))
  return Math.round(fark / (1000 * 60 * 60 * 24))
}

function tarihKisa(tarih) {
  return new Date(tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

const BILGI_KISALTMA_UZUNLUGU = 220

export default function HabercKarti({ haberci, kullanici, onKatilimDegistir, onSil }) {
  const [bilgiAcik, setBilgiAcik] = useState(false)

  const gun = gunSayisi(haberci.ilkTarih)
  const biletGunu = gunSayisi(haberci.biletSatisTarihi)
  const katiliyorMu = kullanici && haberci.katilacaklar.includes(kullanici.uid)
  const tekTarih = haberci.tarihler.length === 1
  const bilgiUzunMu = haberci.bilgi && haberci.bilgi.length > BILGI_KISALTMA_UZUNLUGU

  return (
    <div className="overflow-hidden rounded-sm ring-1 ring-cizgi">
      <div className="relative">
        {haberci.gorselUrl ? (
          <img src={haberci.gorselUrl} alt={haberci.baslik} className="h-40 w-full object-cover" />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-kagit text-3xl">🎟️</div>
        )}
        <span className="absolute left-2 top-2 rounded-sm bg-murekkep/90 px-2 py-1 text-[10px] font-medium text-kagit">
          {haberci.tur}
        </span>
        {kullanici?.uid === haberci.ekleyenId && (
          <button
            onClick={() => onSil(haberci.id)}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-kagit/90 text-xs text-kraft hover:text-muhur"
            title="Duyuruyu sil"
          >
            ✕
          </button>
        )}
      </div>

      <div className="bg-kagitKoyu p-4">
        <h3 className="font-baslik text-lg text-murekkep">{haberci.baslik}</h3>
        <p className="text-xs text-kraft">{[haberci.mekan, haberci.sehir].filter(Boolean).join(', ')}</p>

        {/* Tarihler — belirgin rozet/pill görünümü, kalın font */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {tekTarih ? (
            <span className="rounded-sm bg-muhur px-2 py-1 font-govde text-xs font-medium text-kagit">
              {new Date(haberci.ilkTarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          ) : (
            haberci.tarihler.map((t) => (
              <span key={t} className="rounded-sm bg-muhur px-2 py-1 font-govde text-xs font-medium text-kagit">
                {tarihKisa(t)}
              </span>
            ))
          )}
          {gun != null && (
            <span className="text-xs text-kraft">{gun === 0 ? 'Bugün' : gun > 0 ? `${gun} gün sonra` : 'Geçti'}</span>
          )}
        </div>

        {haberci.biletSatisTarihi && biletGunu != null && biletGunu > 0 && (
          <p className="mt-2 text-xs text-gise">
            🎫 Bilet satışı {new Date(haberci.biletSatisTarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} tarihinde başlıyor
          </p>
        )}

        {haberci.bilgi && (
          <div className="mt-2">
            <p className={`text-sm text-murekkep leading-relaxed ${!bilgiAcik && bilgiUzunMu ? 'line-clamp-3' : ''}`}>{haberci.bilgi}</p>
            {bilgiUzunMu && (
              <button onClick={() => setBilgiAcik((a) => !a)} className="mt-1 text-xs text-kraft hover:text-deniz hover:underline">
                {bilgiAcik ? '↑ Daha Az Göster' : 'Devamını Oku →'}
              </button>
            )}
          </div>
        )}

        {haberci.instagramUrl && <InstagramGomulusu url={haberci.instagramUrl} paylasanAdi={haberci.ekleyenAdi} />}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {haberci.satisLinki && (
            <a
              href={haberci.satisLinki}
              target="_blank"
              rel="noreferrer"
              className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit hover:opacity-90"
            >
              🎟️ Bilet Al →
            </a>
          )}
          {kullanici && (
            <button
              onClick={() => onKatilimDegistir(haberci)}
              className={`rounded-sm px-3 py-1.5 font-govde text-xs ${
                katiliyorMu ? 'bg-murekkep text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'
              }`}
            >
              {katiliyorMu ? '✓ Katılıyorum' : '✋ Katılacağım'}
            </button>
          )}
          {haberci.katilacaklar.length > 0 && <span className="text-xs text-kraft">{haberci.katilacaklar.length} kişi katılıyor</span>}
          <span className="ml-auto text-[11px] text-kraft">{haberci.ekleyenAdi} paylaştı</span>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { katilacagimDegistir, kaynakEkle } from '../utils/gelecekEtkinlik.js'
import { useKaynaklar } from '../hooks/useKaynaklar.js'

const KAYNAK_TURLERI = [
  { id: 'yazi', etiket: 'Yazı', ikon: '📄' },
  { id: 'video', etiket: 'Video', ikon: '▶️' },
  { id: 'makale', etiket: 'Makale', ikon: '📰' },
  { id: 'diger', etiket: 'Diğer', ikon: '🔗' },
]

function tarihSaatGoster(iso) {
  if (!iso) return 'Tarih belirlenmedi'
  const d = new Date(iso)
  return d.toLocaleString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

export default function GelecekEtkinlikKarti({ topluluklId, etkinlik }) {
  const { kullanici } = useAuth()
  const [katilacaklar, setKatilacaklar] = useState(etkinlik.katilacaklar || [])
  const [kaynaklarAcik, setKaynaklarAcik] = useState(false)
  const [kaynakFormuAcik, setKaynakFormuAcik] = useState(false)
  const [kaynakTur, setKaynakTur] = useState('yazi')
  const [kaynakBaslik, setKaynakBaslik] = useState('')
  const [kaynakUrl, setKaynakUrl] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const { kaynaklar, yenidenYukle } = useKaynaklar(topluluklId, etkinlik.id)
  const katiliyorMu = kullanici && katilacaklar.includes(kullanici.uid)

  async function katilDegistir() {
    if (!kullanici) return
    const yeni = katiliyorMu ? katilacaklar.filter((u) => u !== kullanici.uid) : [...katilacaklar, kullanici.uid]
    setKatilacaklar(yeni)
    await katilacagimDegistir(topluluklId, etkinlik.id, kullanici.uid, katiliyorMu)
  }

  async function kaynakGonder(e) {
    e.preventDefault()
    if (!kaynakBaslik.trim() || !kaynakUrl.trim() || !kullanici) return
    setKaydediliyor(true)
    try {
      await kaynakEkle(topluluklId, etkinlik.id, { tur: kaynakTur, baslik: kaynakBaslik.trim(), url: kaynakUrl.trim(), kullanici })
      setKaynakBaslik('')
      setKaynakUrl('')
      setKaynakFormuAcik(false)
      yenidenYukle()
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <div className="rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-govde text-sm text-murekkep">{etkinlik.baslik}</p>
          <p className="text-xs text-kraft mt-0.5">{tarihSaatGoster(etkinlik.tarih)}</p>
          {etkinlik.aciklama && <p className="mt-1 text-xs text-murekkep/90">{etkinlik.aciklama}</p>}
          <p className="mt-1 text-xs text-kraft">{katilacaklar.length} kişi katılacak</p>
        </div>
        <button
          onClick={katilDegistir}
          disabled={!kullanici}
          className={`shrink-0 rounded-sm px-3 py-1.5 font-govde text-xs ${
            katiliyorMu ? 'bg-kagit text-kraft ring-1 ring-cizgi' : 'bg-muhur text-kagit'
          } disabled:opacity-40`}
        >
          {katiliyorMu ? 'Katılacaksın' : 'Katılacağım'}
        </button>
      </div>

      <button
        onClick={() => setKaynaklarAcik((a) => !a)}
        className="mt-3 text-xs text-deniz hover:underline"
      >
        {kaynaklarAcik ? 'Kaynakları gizle' : `Bunlara göz at (${kaynaklar.length})`}
      </button>

      {kaynaklarAcik && (
        <div className="mt-2 space-y-2 border-t border-cizgi pt-3">
          {kaynaklar.length === 0 && <p className="text-xs text-kraft">Henüz kaynak eklenmedi.</p>}
          {kaynaklar.map((k) => (
            <a
              key={k.id}
              href={k.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-xs text-murekkep hover:underline"
            >
              <span>{KAYNAK_TURLERI.find((t) => t.id === k.tur)?.ikon || '🔗'}</span>
              {k.baslik}
            </a>
          ))}

          {kullanici && !kaynakFormuAcik && (
            <button onClick={() => setKaynakFormuAcik(true)} className="text-xs text-kraft hover:text-murekkep">
              + Kaynak Ekle
            </button>
          )}

          {kaynakFormuAcik && (
            <form onSubmit={kaynakGonder} className="space-y-2 rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
              <div className="flex gap-2">
                {KAYNAK_TURLERI.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setKaynakTur(t.id)}
                    className={`rounded-sm px-2 py-1 text-[11px] ${
                      kaynakTur === t.id ? 'bg-deniz text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
                    }`}
                  >
                    {t.ikon} {t.etiket}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={kaynakBaslik}
                onChange={(e) => setKaynakBaslik(e.target.value)}
                placeholder="Başlık"
                className="w-full rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
              />
              <input
                type="text"
                value={kaynakUrl}
                onChange={(e) => setKaynakUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
              />
              <button
                type="submit"
                disabled={kaydediliyor}
                className="rounded-sm bg-muhur px-3 py-1 font-govde text-[11px] text-kagit disabled:opacity-40"
              >
                {kaydediliyor ? 'Ekleniyor...' : 'Ekle'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

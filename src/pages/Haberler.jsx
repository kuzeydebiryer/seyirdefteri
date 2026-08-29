import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { haberSayfasiGetir } from '../utils/haber.js'

const KATEGORILER = [
  { id: '', etiket: 'Tümü', ikon: '📰' },
  { id: 'sinema', etiket: 'Film', ikon: '🎬' },
  { id: 'dizi', etiket: 'Dizi', ikon: '📺' },
  { id: 'kitap', etiket: 'Kitap', ikon: '📚' },
  { id: 'kisi', etiket: 'Oyuncu', ikon: '🎭' },
]

function tarihGoster(deger) {
  if (!deger) return ''
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  if (isNaN(d.getTime())) return ''
  const bugun = new Date()
  if (d.toDateString() === bugun.toDateString()) return `Bugün ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Film/Dizi/Kitap/Oyuncu sayfalarındaki HaberBolumu'nun "Tümünü Gör"
// linklerinin gittiği yer — üst menüye eklenmedi (kasıtlı), sadece oradan
// erişiliyor. Kategoriler arası filtre burada, sayfa başına bölünmeden
// tüm listeyi kategoriye göre süzüyor. 20'şer sayfalanıyor (bkz. haber.js).
export default function Haberler() {
  const [aramaParametreleri, setAramaParametreleri] = useSearchParams()
  const kategori = aramaParametreleri.get('kategori') || ''
  const [haberler, setHaberler] = useState(null)
  const [sonBelge, setSonBelge] = useState(null)
  const [hepsiYuklendiMi, setHepsiYuklendiMi] = useState(false)
  const [dahaFazlaYukleniyor, setDahaFazlaYukleniyor] = useState(false)

  useEffect(() => {
    setHaberler(null)
    haberSayfasiGetir(kategori || undefined).then(({ liste, sonBelge, hepsiYuklendiMi }) => {
      setHaberler(liste)
      setSonBelge(sonBelge)
      setHepsiYuklendiMi(hepsiYuklendiMi)
    })
  }, [kategori])

  async function dahaFazlaYukle() {
    setDahaFazlaYukleniyor(true)
    try {
      const sonuc = await haberSayfasiGetir(kategori || undefined, sonBelge)
      setHaberler((onceki) => [...onceki, ...sonuc.liste])
      setSonBelge(sonuc.sonBelge)
      setHepsiYuklendiMi(sonuc.hepsiYuklendiMi)
    } finally {
      setDahaFazlaYukleniyor(false)
    }
  }

  function kategoriSec(id) {
    const yeni = new URLSearchParams()
    if (id) yeni.set('kategori', id)
    setAramaParametreleri(yeni)
  }

  return (
    <div>
      <h1 className="mb-1 font-baslik text-2xl text-murekkep">📰 Haberler</h1>
      <p className="mb-6 text-sm text-kraft">Film, dizi, kitap ve oyuncu dünyasından topluluğun paylaştığı haberler.</p>

      <div className="mb-6 flex flex-wrap gap-2">
        {KATEGORILER.map((k) => (
          <button
            key={k.id}
            onClick={() => kategoriSec(k.id)}
            className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
              kategori === k.id ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagitKoyu text-kraft ring-cizgi'
            }`}
          >
            {k.ikon} {k.etiket}
          </button>
        ))}
      </div>

      {haberler === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {haberler !== null && haberler.length === 0 && <p className="text-sm text-kraft">Bu kategoride henüz haber yok.</p>}

      <div className="space-y-2">
        {haberler?.map((h) => {
          const gorsel = h.gorselUrl || h.ilgiliPosterUrl
          const katIkon = KATEGORILER.find((k) => k.id === h.kategori)?.ikon || '📰'
          return (
            <Link key={h.id} to={`/haber/${h.id}`} className="flex gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi hover:ring-deniz/50">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi sm:h-20 sm:w-28">
                {gorsel ? (
                  <img src={gorsel} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg text-kraft">📰</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-widest text-kraft">
                  {katIkon} {KATEGORILER.find((k) => k.id === h.kategori)?.etiket}
                </p>
                <p className="font-govde text-sm font-medium text-murekkep line-clamp-2">{h.baslik}</p>
                <p className="mt-1 text-[11px] text-kraft">
                  {h.ekleyenAdi} · {tarihGoster(h.tarih)}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      {haberler && haberler.length > 0 && !hepsiYuklendiMi && (
        <button
          onClick={dahaFazlaYukle}
          disabled={dahaFazlaYukleniyor}
          className="mt-4 rounded-sm bg-kagitKoyu px-4 py-2 font-govde text-xs text-kraft ring-1 ring-cizgi hover:text-murekkep disabled:opacity-40"
        >
          {dahaFazlaYukleniyor ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
        </button>
      )}
    </div>
  )
}

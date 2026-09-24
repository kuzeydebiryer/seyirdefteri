import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { onayBekleyenHaberleriGetir, haberOnayla, haberReddet, haberOneCikarDegistir, haberSayfasiGetir } from '../utils/haber.js'

function tarihGoster(deger) {
  if (!deger) return ''
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const KATEGORI_ETIKETI = { sinema: '🎬 Film', dizi: '📺 Dizi', kitap: '📚 Kitap', kisi: '🎭 Oyuncu' }

// Bu sayfa herkese açık (route seviyesinde giriş kontrolü OzelRota ile
// zaten var) ama İÇERİĞİ sadece profil.yonetici === true olan hesaplara
// gösteriliyor — asıl güvenlik Firestore kuralında da var. İki bölüm:
// 1) Onay bekleyenler (onayli:false) — onayla/reddet.
// 2) En yeni onaylı haberler — hangilerinin Anasayfa vitrininde "öne çıkan"
//    olarak önceliklendirileceğini işaretlemek için (oneCikan toggle).
export default function HaberOnayYonetim() {
  const { profil } = useAuth()
  const [bekleyenler, setBekleyenler] = useState(null)
  const [islenenId, setIslenenId] = useState(null)
  const [onayliHaberler, setOnayliHaberler] = useState(null)
  const [oneCikarDegisenId, setOneCikarDegisenId] = useState(null)

  useEffect(() => {
    if (!profil?.yonetici) return
    onayBekleyenHaberleriGetir().then(setBekleyenler)
    haberSayfasiGetir(null).then((sonuc) => setOnayliHaberler(sonuc.liste))
  }, [profil?.yonetici])

  async function onaylaTiklandi(haber) {
    setIslenenId(haber.id)
    try {
      await haberOnayla(haber.id)
      setBekleyenler((liste) => liste.filter((h) => h.id !== haber.id))
      setOnayliHaberler((liste) => [{ ...haber, onayli: true }, ...(liste || [])])
    } finally {
      setIslenenId(null)
    }
  }

  async function reddetTiklandi(haber) {
    if (!window.confirm(`"${haber.baslik}" haberini kalıcı olarak reddedip silmek istediğine emin misin?`)) return
    setIslenenId(haber.id)
    try {
      await haberReddet(haber.id)
      setBekleyenler((liste) => liste.filter((h) => h.id !== haber.id))
    } finally {
      setIslenenId(null)
    }
  }

  async function oneCikarTiklandi(haber) {
    setOneCikarDegisenId(haber.id)
    try {
      const yeni = !haber.oneCikan
      await haberOneCikarDegistir(haber.id, yeni)
      setOnayliHaberler((liste) => liste.map((h) => (h.id === haber.id ? { ...h, oneCikan: yeni } : h)))
    } finally {
      setOneCikarDegisenId(null)
    }
  }

  if (!profil) return null

  if (!profil.yonetici) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-sm text-kraft">Bu sayfa sadece yöneticiye açık.</p>
        <Link to="/" className="mt-2 inline-block text-xs text-deniz hover:underline">
          ← Anasayfa
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/" className="text-xs text-kraft hover:text-deniz">
        ← Anasayfa
      </Link>
      <h1 className="mt-1 mb-1 font-baslik text-2xl text-murekkep">🛠 Haber Yönetimi</h1>
      <p className="mb-6 text-sm text-kraft">
        Yönetici olmayan bir hesabın eklediği her haber, burada onaylanana kadar sitede hiçbir yerde görünmez.
      </p>

      <div className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-widest text-gise">
          Onay Bekleyenler {bekleyenler && `(${bekleyenler.length})`}
        </p>
        {bekleyenler === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
        {bekleyenler?.length === 0 && <p className="text-sm text-kraft">Onay bekleyen haber yok.</p>}
        <ul className="space-y-2">
          {bekleyenler?.map((h) => {
            const gorsel = h.gorselUrl || h.ilgiliPosterUrl
            return (
              <li key={h.id} className="rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
                <div className="flex gap-3">
                  <div className="h-16 w-24 shrink-0 overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                    {gorsel ? (
                      <img src={gorsel} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg text-kraft">📰</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-widest text-kraft">{KATEGORI_ETIKETI[h.kategori] || '📰 Haber'}</p>
                    <Link to={`/haber/${h.id}`} className="font-govde text-sm font-medium text-murekkep hover:text-deniz">
                      {h.baslik}
                    </Link>
                    <p className="mt-1 text-[11px] text-kraft">
                      {h.ekleyenAdi} · {tarihGoster(h.tarih)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => onaylaTiklandi(h)}
                    disabled={islenenId === h.id}
                    className="rounded-sm bg-gise px-3 py-1 text-xs text-kagit disabled:opacity-40"
                  >
                    {islenenId === h.id ? '...' : '✓ Onayla'}
                  </button>
                  <button
                    onClick={() => reddetTiklandi(h)}
                    disabled={islenenId === h.id}
                    className="rounded-sm bg-kagit px-3 py-1 text-xs text-kraft ring-1 ring-cizgi hover:text-muhur disabled:opacity-40"
                  >
                    ✕ Reddet
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-widest text-gise">Öne Çıkan İşaretle</p>
        <p className="mb-3 text-[11px] text-kraft">
          Anasayfa'daki haber vitrininin hero kartı önce ⭐ öne çıkan işaretli haberleri gösterir, sonra en yenilerle doldurur.
        </p>
        {onayliHaberler === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
        <ul className="space-y-2">
          {onayliHaberler?.map((h) => (
            <li key={h.id} className="flex items-center gap-3 rounded-sm bg-kagitKoyu p-2.5 ring-1 ring-cizgi">
              <Link to={`/haber/${h.id}`} className="min-w-0 flex-1 truncate text-sm text-murekkep hover:text-deniz">
                {h.baslik}
              </Link>
              <button
                onClick={() => oneCikarTiklandi(h)}
                disabled={oneCikarDegisenId === h.id}
                className={`shrink-0 rounded-full px-3 py-1 text-xs disabled:opacity-40 ${
                  h.oneCikan ? 'bg-gise text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'
                }`}
              >
                {oneCikarDegisenId === h.id ? '...' : h.oneCikan ? '⭐ Öne Çıkan' : '☆ Öne Çıkar'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

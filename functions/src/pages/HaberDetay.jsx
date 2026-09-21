import { gorunenAdGetir } from '../utils/gorunenAd.js'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { haberGetir, haberSil, haberDuzenle, benzerHaberleriGetir } from '../utils/haber.js'
import { eserYorumlariGetir, eserYorumEkle, yorumSil, yorumBegenDegistir } from '../utils/yorum.js'
import PaylasButonu from '../components/PaylasButonu.jsx'
import Avatar from '../components/Avatar.jsx'

const eserLink = (tur, disId) => (tur === 'dizi' ? `/dizi/${disId}` : tur === 'kitap' ? `/kitap/${disId}` : tur === 'kisi' ? `/kisi/${disId}` : `/film/${disId}`)

const KATEGORI_ETIKETI = { sinema: '🎬 Film Haberi', dizi: '📺 Dizi Haberi', kitap: '📚 Kitap Haberi', kisi: '🎭 Oyuncu Haberi' }

function tarihGoster(deger) {
  if (!deger) return ''
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function youtubeIdCikar(girdi) {
  if (!girdi) return ''
  const temiz = girdi.trim()
  const eslesme = temiz.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  if (eslesme) return eslesme[1]
  if (/^[a-zA-Z0-9_-]{11}$/.test(temiz)) return temiz
  return temiz
}

// Haberler önceden Film/Dizi/Oyuncu/Kitap sayfalarında sadece tıkla-genişlet
// olarak (sayfa içinde) açılıyordu — yorum yazılamıyor, paylaşılamıyordu.
// Artık her haberin kendi sayfası var (bu bileşen) — üst menüye eklenmedi
// (kasıtlı, menü şişmesin diye), sadece HaberBolumu'ndaki satırlar ve
// /haberler hub sayfası buraya yönlendiriyor. Yorumlar, yorum.js'in
// {tur, disId} genel sözleşmesini "haber" + haberin kendi doküman ID'siyle
// kullanıyor — yeni bir yorum sistemi kurmaya gerek kalmadı.
export default function HaberDetay() {
  const { id } = useParams()
  const { kullanici, profil } = useAuth()
  const [haber, setHaber] = useState(undefined) // undefined: yükleniyor, null: bulunamadı
  const [yorumlar, setYorumlar] = useState(null)
  const [yeniYorum, setYeniYorum] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [benzerHaberler, setBenzerHaberler] = useState(null)

  const [duzenleAcik, setDuzenleAcik] = useState(false)
  const [duzenleBaslik, setDuzenleBaslik] = useState('')
  const [duzenleIcerik, setDuzenleIcerik] = useState('')
  const [duzenleGorselUrl, setDuzenleGorselUrl] = useState('')
  const [duzenleFragman, setDuzenleFragman] = useState('')
  const [duzenleKaydediliyor, setDuzenleKaydediliyor] = useState(false)

  useEffect(() => {
    haberGetir(id).then(setHaber)
  }, [id])

  useEffect(() => {
    if (!haber) return
    benzerHaberleriGetir(haber.kategori, id).then(setBenzerHaberler)
  }, [haber, id])

  useEffect(() => {
    eserYorumlariGetir('haber', id).then(setYorumlar)
  }, [id])

  async function yorumGonder(e) {
    e.preventDefault()
    if (!yeniYorum.trim() || !kullanici) return
    setGonderiliyor(true)
    try {
      await eserYorumEkle('haber', id, kullanici, gorunenAdGetir(profil, kullanici.displayName), yeniYorum, {
        eserBaslik: haber.baslik,
        eserPosterUrl: haber.gorselUrl || haber.ilgiliPosterUrl,
      })
      setYeniYorum('')
      eserYorumlariGetir('haber', id).then(setYorumlar)
    } finally {
      setGonderiliyor(false)
    }
  }

  async function yorumSilTiklandi(yorumId) {
    if (!window.confirm('Bu yorumu silmek istediğine emin misin?')) return
    await yorumSil(yorumId)
    setYorumlar((liste) => liste.filter((y) => y.id !== yorumId))
  }

  async function begenTiklandi(yorum) {
    if (!kullanici) return
    const begeniyorMu = (yorum.begenenler || []).includes(kullanici.uid)
    setYorumlar((liste) =>
      liste.map((y) =>
        y.id === yorum.id
          ? { ...y, begenenler: begeniyorMu ? y.begenenler.filter((u) => u !== kullanici.uid) : [...(y.begenenler || []), kullanici.uid] }
          : y
      )
    )
    await yorumBegenDegistir(yorum.id, kullanici.uid, begeniyorMu)
  }

  async function haberSilTiklandi() {
    if (!window.confirm('Bu haberi silmek istediğine emin misin?')) return
    await haberSil(id)
    window.history.back()
  }

  function duzenleyiAc() {
    setDuzenleBaslik(haber.baslik)
    setDuzenleIcerik(haber.icerik || '')
    setDuzenleGorselUrl(haber.gorselUrl || '')
    setDuzenleFragman(haber.fragmanId || '')
    setDuzenleAcik(true)
  }

  async function duzenleyiKaydet(e) {
    e.preventDefault()
    if (!duzenleBaslik.trim()) return
    setDuzenleKaydediliyor(true)
    try {
      const yeniFragmanId = youtubeIdCikar(duzenleFragman)
      await haberDuzenle(id, { baslik: duzenleBaslik.trim(), icerik: duzenleIcerik, gorselUrl: duzenleGorselUrl, fragmanId: yeniFragmanId })
      setHaber((h) => ({ ...h, baslik: duzenleBaslik.trim(), icerik: duzenleIcerik, gorselUrl: duzenleGorselUrl, fragmanId: yeniFragmanId }))
      setDuzenleAcik(false)
    } finally {
      setDuzenleKaydediliyor(false)
    }
  }

  const gerisayfa = haber?.kategori === 'dizi' ? '/diziler' : haber?.kategori === 'kitap' ? '/kitaplar' : haber?.kategori === 'kisi' ? '/oyuncular' : '/filmler'

  if (haber === undefined) return <p className="text-sm text-kraft">Yükleniyor...</p>
  if (haber === null) return <p className="text-sm text-kraft">Bu haber bulunamadı.</p>

  return (
    <div>
      <Link to={gerisayfa} className="text-xs text-kraft hover:text-deniz">
        ← Haberler
      </Link>

      <p className="mt-2 text-[11px] uppercase tracking-widest text-gise">{KATEGORI_ETIKETI[haber.kategori] || '📰 Haber'}</p>

      {duzenleAcik ? (
        <form onSubmit={duzenleyiKaydet} className="mt-2 mb-4 max-w-2xl space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <input
            type="text"
            value={duzenleBaslik}
            onChange={(e) => setDuzenleBaslik(e.target.value)}
            required
            placeholder="Haber başlığı"
            className="w-full rounded-sm bg-kagit px-3 py-2.5 text-base text-murekkep ring-1 ring-cizgi"
          />
          <textarea
            value={duzenleIcerik}
            onChange={(e) => setDuzenleIcerik(e.target.value)}
            rows={6}
            placeholder="İçerik"
            className="w-full rounded-sm bg-kagit px-3 py-2.5 text-sm text-murekkep ring-1 ring-cizgi"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-kraft">Görsel URL</label>
              <input
                type="text"
                value={duzenleGorselUrl}
                onChange={(e) => setDuzenleGorselUrl(e.target.value)}
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-kraft">Fragman linki/ID</label>
              <input
                type="text"
                value={duzenleFragman}
                onChange={(e) => setDuzenleFragman(e.target.value)}
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={duzenleKaydediliyor} className="rounded-sm bg-muhur px-4 py-2 font-govde text-xs text-kagit disabled:opacity-40">
              {duzenleKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button type="button" onClick={() => setDuzenleAcik(false)} className="rounded-sm bg-kagit px-4 py-2 text-xs text-kraft ring-1 ring-cizgi">
              Vazgeç
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="mt-1 mb-1 flex items-start justify-between gap-3">
            <h1 className="font-baslik text-2xl text-murekkep">{haber.baslik}</h1>
            <PaylasButonu baslik={haber.baslik} url={`/haber/${id}`} boyut="kucuk" />
          </div>
          <p className="mb-4 text-xs text-kraft">
            {haber.ekleyenAdi} · {tarihGoster(haber.tarih)}
          </p>

          {haber.gorselUrl && (
            <img src={haber.gorselUrl} alt="" className="mb-4 max-h-96 w-full rounded-sm object-cover shadow-lg ring-1 ring-cizgi" />
          )}

          {haber.icerik && (
            <div className="space-y-3">
              {haber.icerik
                .split('\n')
                .filter((satir) => satir.trim())
                .map((satir, i) => (
                  <p key={i} className="text-sm leading-relaxed text-murekkep">
                    {satir}
                  </p>
                ))}
            </div>
          )}
        </>
      )}

      {haber.ilgiliBaslik && (
        <div className="mt-5">
          <p className="mb-1.5 text-[11px] uppercase tracking-widest text-kraft">
            {haber.ilgiliTur === 'dizi' ? '📺 İlgili Dizi' : haber.ilgiliTur === 'kitap' ? '📚 İlgili Kitap' : haber.ilgiliTur === 'kisi' ? '🎭 İlgili Kişi' : '🎬 İlgili Film'}
          </p>
          <Link to={eserLink(haber.ilgiliTur, haber.ilgiliDisId)} className="block w-28 transition hover:opacity-90">
            <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
              {haber.ilgiliPosterUrl ? (
                <img src={haber.ilgiliPosterUrl} alt={haber.ilgiliBaslik} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">🎬</div>
              )}
            </div>
            <p className="mt-1 truncate text-xs text-murekkep">{haber.ilgiliBaslik}</p>
          </Link>
        </div>
      )}

      {haber.fragmanId && (
        <div className="mt-4 aspect-video max-w-md overflow-hidden rounded-sm ring-1 ring-cizgi">
          <iframe
            src={`https://www.youtube.com/embed/${haber.fragmanId}`}
            title="Fragman"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {kullanici?.uid === haber.ekleyenId && !duzenleAcik && (
        <div className="mt-4 flex gap-3 text-xs">
          <button onClick={duzenleyiAc} className="text-deniz hover:underline">
            ✏️ Düzenle
          </button>
          <button onClick={haberSilTiklandi} className="text-kraft hover:text-muhur">
            Sil
          </button>
        </div>
      )}

      {benzerHaberler && benzerHaberler.length > 0 && (
        <div className="mt-8 border-t border-cizgi pt-6">
          <h2 className="mb-3 font-baslik text-lg text-murekkep">İlgili Haberler</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {benzerHaberler.map((h) => {
              const gorsel = h.gorselUrl || h.ilgiliPosterUrl
              return (
                <Link key={h.id} to={`/haber/${h.id}`} className="shrink-0" style={{ width: 140 }}>
                  <div className="aspect-video overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                    {gorsel ? (
                      <img src={gorsel} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl opacity-40">📰</div>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-murekkep">{h.baslik}</p>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-8 border-t border-cizgi pt-6">
        <h2 className="mb-3 font-baslik text-lg text-murekkep">Yorumlar</h2>

        {kullanici && (
          <form onSubmit={yorumGonder} className="mb-4 flex gap-2">
            <input
              type="text"
              value={yeniYorum}
              onChange={(e) => setYeniYorum(e.target.value)}
              placeholder="Bir yorum yaz..."
              className="flex-1 rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
            <button type="submit" disabled={gonderiliyor} className="rounded-sm bg-deniz px-4 py-2 text-xs text-kagit disabled:opacity-40">
              Gönder
            </button>
          </form>
        )}
        {!kullanici && (
          <p className="mb-4 text-xs text-kraft">
            Yorum yapmak için{' '}
            <Link to={`/giris?donus=${encodeURIComponent(`/haber/${id}`)}`} className="text-deniz hover:underline">
              giriş yap
            </Link>
            .
          </p>
        )}

        {yorumlar === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
        {yorumlar?.length === 0 && <p className="text-sm text-kraft">Henüz yorum yok — ilk yorumu sen yaz.</p>}

        <div className="space-y-3">
          {yorumlar?.map((y) => {
            const begendimMi = (y.begenenler || []).includes(kullanici?.uid)
            return (
              <div key={y.id} className="flex items-start gap-2">
                <Avatar adSoyad={y.yazarAdi} boyut="h-7 w-7" />
                <div className="min-w-0 flex-1 rounded-sm bg-kagitKoyu p-2.5 ring-1 ring-cizgi">
                  <p className="text-xs font-medium text-murekkep">{y.yazarAdi}</p>
                  <p className="mt-0.5 text-sm text-murekkep/90">{y.metin}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-kraft">
                    <button onClick={() => begenTiklandi(y)} className={begendimMi ? 'text-muhur' : 'hover:text-murekkep'}>
                      {begendimMi ? '♥' : '♡'} {(y.begenenler || []).length > 0 && y.begenenler.length}
                    </button>
                    <span>{tarihGoster(y.tarih)}</span>
                    {kullanici?.uid === y.yazarId && (
                      <button onClick={() => yorumSilTiklandi(y.id)} className="hover:text-muhur">
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

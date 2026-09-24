import { gorunenAdGetir } from '../utils/gorunenAd.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  haberGetir,
  haberSil,
  haberDuzenle,
  benzerHaberleriGetir,
  haberGoruntulendi,
  haberBegenDegistir,
  haberOnayla,
  haberReddet,
  haberOneCikarDegistir,
} from '../utils/haber.js'
import { eserYorumlariGetir, eserYorumEkle, yorumSil, yorumBegenDegistir } from '../utils/yorum.js'
import { eserReferanslariniBul } from '../utils/icerikAyristir.js'
import PaylasButonu from '../components/PaylasButonu.jsx'
import Avatar from '../components/Avatar.jsx'
import MedyaGomulusu from '../components/MedyaGomulusu.jsx'
import GonderiIcerik from '../components/GonderiIcerik.jsx'
import EserSecici from '../components/EserSecici.jsx'

const eserLink = (tur, disId) => (tur === 'dizi' ? `/dizi/${disId}` : tur === 'kitap' ? `/kitap/${disId}` : tur === 'kisi' ? `/kisi/${disId}` : `/film/${disId}`)

const KATEGORI_ETIKETI = {
  sinema: '🎬 Film Haberi',
  dizi: '📺 Dizi Haberi',
  kitap: '📚 Kitap Haberi',
  kisi: '🎭 Oyuncu Haberi',
  'kultur-sanat': '🎨 Kültür-Sanat Haberi',
}

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
  const [duzenleInstagramUrl, setDuzenleInstagramUrl] = useState('')
  const [duzenleKaydediliyor, setDuzenleKaydediliyor] = useState(false)

  // Düzenlerken de içeriğe film/dizi/kitap şeridi eklenip çıkarılabilsin diye
  // — HaberBolumu'ndaki "🎬📚 Ekle" akışının aynısı, sadece duzenleIcerik'e yazıyor.
  const [gomuluEserAcik, setGomuluEserAcik] = useState(false)
  const [gomuluEserKategori, setGomuluEserKategori] = useState('Film')
  const [gomuluEserDuzeni, setGomuluEserDuzeni] = useState('yatay')
  const duzenleIcerikRef = useRef(null)

  function imlecKonumunaMetinEkle(eklenecek) {
    const ta = duzenleIcerikRef.current
    const imlecKonumu = ta ? ta.selectionStart : duzenleIcerik.length
    const eklenecekBlok = `\n\n${eklenecek}\n\n`
    const yeniMetin = duzenleIcerik.slice(0, imlecKonumu) + eklenecekBlok + duzenleIcerik.slice(imlecKonumu)
    setDuzenleIcerik(yeniMetin)
    const yeniKonum = imlecKonumu + eklenecekBlok.length
    setTimeout(() => {
      if (ta) {
        ta.focus()
        ta.setSelectionRange(yeniKonum, yeniKonum)
      }
    }, 0)
  }

  function gomuluEserEklendi(secim) {
    imlecKonumunaMetinEkle(`@@eser:${JSON.stringify({ ...secim, duzen: gomuluEserDuzeni })}`)
  }

  const gomuluEserler = useMemo(() => eserReferanslariniBul(duzenleIcerik), [duzenleIcerik])

  function gomuluEseriKaldir(indeks) {
    const hedef = gomuluEserler[indeks]
    if (!hedef) return
    setDuzenleIcerik((duzenleIcerik.slice(0, hedef.index) + duzenleIcerik.slice(hedef.index + hedef.tamMetin.length)).replace(/\n{3,}/g, '\n\n'))
  }

  function gomuluEseriTasi(indeks, yon) {
    const hedefIndeks = indeks + yon
    const a = gomuluEserler[indeks]
    const b = gomuluEserler[hedefIndeks]
    if (!a || !b) return
    const [ilk, ikinci] = a.index < b.index ? [a, b] : [b, a]
    setDuzenleIcerik(
      duzenleIcerik.slice(0, ilk.index) +
        ikinci.tamMetin +
        duzenleIcerik.slice(ilk.index + ilk.tamMetin.length, ikinci.index) +
        ilk.tamMetin +
        duzenleIcerik.slice(ikinci.index + ikinci.tamMetin.length)
    )
  }

  useEffect(() => {
    haberGetir(id).then(setHaber)
    haberGoruntulendi(id)
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

  async function begenTiklandiHaber() {
    if (!kullanici) return
    const begeniyorMu = (haber.begenenler || []).includes(kullanici.uid)
    setHaber((h) => ({
      ...h,
      begenenler: begeniyorMu ? h.begenenler.filter((u) => u !== kullanici.uid) : [...(h.begenenler || []), kullanici.uid],
    }))
    await haberBegenDegistir(id, kullanici.uid, begeniyorMu)
  }

  async function onaylaTiklandi() {
    await haberOnayla(id)
    setHaber((h) => ({ ...h, onayli: true }))
  }

  async function reddetTiklandi() {
    if (!window.confirm('Bu haberi reddedip kalıcı olarak silmek istediğine emin misin?')) return
    await haberReddet(id)
    window.history.back()
  }

  async function oneCikarTiklandiHaber() {
    const yeni = !haber.oneCikan
    await haberOneCikarDegistir(id, yeni)
    setHaber((h) => ({ ...h, oneCikan: yeni }))
  }

  function duzenleyiAc() {
    setDuzenleBaslik(haber.baslik)
    setDuzenleIcerik(haber.icerik || '')
    setDuzenleGorselUrl(haber.gorselUrl || '')
    setDuzenleFragman(haber.fragmanId || '')
    setDuzenleInstagramUrl(haber.instagramUrl || '')
    setDuzenleAcik(true)
  }

  async function duzenleyiKaydet(e) {
    e.preventDefault()
    if (!duzenleBaslik.trim()) return
    setDuzenleKaydediliyor(true)
    try {
      const yeniFragmanId = youtubeIdCikar(duzenleFragman)
      const yeniInstagramUrl = duzenleInstagramUrl.trim()
      await haberDuzenle(id, {
        baslik: duzenleBaslik.trim(),
        icerik: duzenleIcerik,
        gorselUrl: duzenleGorselUrl,
        fragmanId: yeniFragmanId,
        instagramUrl: yeniInstagramUrl,
      })
      setHaber((h) => ({
        ...h,
        baslik: duzenleBaslik.trim(),
        icerik: duzenleIcerik,
        gorselUrl: duzenleGorselUrl,
        fragmanId: yeniFragmanId,
        instagramUrl: yeniInstagramUrl,
      }))
      setDuzenleAcik(false)
    } finally {
      setDuzenleKaydediliyor(false)
    }
  }

  const gerisayfa =
    haber?.kategori === 'dizi'
      ? '/diziler'
      : haber?.kategori === 'kitap'
        ? '/kitaplar'
        : haber?.kategori === 'kisi'
          ? '/oyuncular'
          : haber?.kategori === 'sinema'
            ? '/filmler'
            : '/haberler'

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
            ref={duzenleIcerikRef}
            value={duzenleIcerik}
            onChange={(e) => setDuzenleIcerik(e.target.value)}
            rows={6}
            placeholder="İçerik"
            className="w-full rounded-sm bg-kagit px-3 py-2.5 text-sm text-murekkep ring-1 ring-cizgi"
          />

          <div>
            <button
              type="button"
              onClick={() => setGomuluEserAcik((a) => !a)}
              className="rounded-sm bg-kagit px-3 py-1 font-govde text-xs text-kraft ring-1 ring-cizgi hover:ring-deniz/50"
            >
              🎬📚 İçeriğe Film/Dizi/Kitap Şeridi Ekle
            </button>

            {gomuluEserAcik && (
              <div className="mt-2 rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {['Film', 'Dizi', 'Kitap', 'Oyuncu'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setGomuluEserKategori(k)}
                      className={`rounded-full px-2.5 py-1 text-[11px] ${
                        gomuluEserKategori === k ? 'bg-gise text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setGomuluEserAcik(false)}
                    className="ml-auto rounded-full px-2.5 py-1 text-[11px] text-kraft hover:text-muhur"
                  >
                    ✕ Kapat
                  </button>
                </div>
                <div className="mb-2 flex items-center gap-2 text-[11px] text-kraft">
                  <span>2+ eser eklersen görünüm:</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setGomuluEserDuzeni('yatay')}
                      className={`rounded-full px-2 py-0.5 ${
                        gomuluEserDuzeni === 'yatay' ? 'bg-gise text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
                      }`}
                    >
                      ↔ Şerit
                    </button>
                    <button
                      type="button"
                      onClick={() => setGomuluEserDuzeni('dikey')}
                      className={`rounded-full px-2 py-0.5 ${
                        gomuluEserDuzeni === 'dikey' ? 'bg-gise text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
                      }`}
                    >
                      ☰ Liste
                    </button>
                  </div>
                </div>
                <EserSecici kategori={gomuluEserKategori} secili={null} onSecim={gomuluEserEklendi} onTemizle={() => {}} />
              </div>
            )}

            {gomuluEserler.length > 0 && (
              <div className="mt-2 rounded-sm bg-kagit p-2.5 ring-1 ring-cizgi">
                <p className="mb-1.5 text-[11px] text-kraft">İçeriğe eklenen eserler ({gomuluEserler.length}):</p>
                <ul className="space-y-1">
                  {gomuluEserler.map((oge, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-sm bg-kagitKoyu px-2 py-1">
                      <div className="h-8 w-6 shrink-0 overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                        {oge.veri.posterUrl && <img src={oge.veri.posterUrl} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-xs text-murekkep">{oge.veri.baslik}</span>
                      <button
                        type="button"
                        onClick={() => gomuluEseriTasi(i, -1)}
                        disabled={i === 0}
                        className="text-xs text-kraft hover:text-deniz disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => gomuluEseriTasi(i, 1)}
                        disabled={i === gomuluEserler.length - 1}
                        className="text-xs text-kraft hover:text-deniz disabled:opacity-30"
                      >
                        ▼
                      </button>
                      <button type="button" onClick={() => gomuluEseriKaldir(i)} className="text-xs text-kraft hover:text-muhur">
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

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
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-kraft">Sosyal Medya Linki</label>
              <input
                type="text"
                value={duzenleInstagramUrl}
                onChange={(e) => setDuzenleInstagramUrl(e.target.value)}
                placeholder="Instagram, YouTube ya da X linki"
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
          {haber.onayli === false && (
            <p className="mb-2 inline-block rounded-full bg-muhur px-3 py-1 text-[11px] text-kagit">⏳ Onay bekliyor — henüz yayında değil</p>
          )}
          <div className="mt-1 mb-1 flex items-start justify-between gap-3">
            <h1 className="font-baslik text-2xl text-murekkep">
              {haber.oneCikan && <span title="Öne çıkan">⭐ </span>}
              {haber.baslik}
            </h1>
            <PaylasButonu baslik={haber.baslik} url={`/haber/${id}`} boyut="kucuk" />
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-kraft">
            <span>
              {haber.ekleyenAdi} · {tarihGoster(haber.tarih)}
            </span>
            {kullanici && (
              <button onClick={begenTiklandiHaber} className={(haber.begenenler || []).includes(kullanici.uid) ? 'text-muhur' : 'hover:text-murekkep'}>
                {(haber.begenenler || []).includes(kullanici.uid) ? '♥' : '♡'} {haber.begenenler?.length > 0 && haber.begenenler.length}
              </button>
            )}
          </div>

          {profil?.yonetici && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
              {haber.onayli === false ? (
                <>
                  <button onClick={onaylaTiklandi} className="rounded-sm bg-gise px-3 py-1 text-xs text-kagit">
                    ✓ Onayla
                  </button>
                  <button onClick={reddetTiklandi} className="rounded-sm bg-kagit px-3 py-1 text-xs text-kraft ring-1 ring-cizgi hover:text-muhur">
                    ✕ Reddet
                  </button>
                </>
              ) : (
                <button
                  onClick={oneCikarTiklandiHaber}
                  className={`rounded-full px-3 py-1 text-xs ${haber.oneCikan ? 'bg-gise text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
                >
                  {haber.oneCikan ? '⭐ Öne Çıkan' : '☆ Öne Çıkar'}
                </button>
              )}
            </div>
          )}

          {haber.gorselUrl && (
            <img src={haber.gorselUrl} alt="" className="mb-4 max-h-96 w-full rounded-sm object-cover shadow-lg ring-1 ring-cizgi" />
          )}

          {haber.icerik && <GonderiIcerik metin={haber.icerik} tam={true} />}

          {haber.instagramUrl && (
            <div className="mt-4">
              <MedyaGomulusu url={haber.instagramUrl} paylasanAdi={haber.ekleyenAdi} />
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

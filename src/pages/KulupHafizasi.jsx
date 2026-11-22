import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { INCELEME_BOLUMLERI, SAHNE_ALANLARI, incelemeBolumleriniGetir, sahneNotlariniGetir } from '../utils/incelemeDefteri.js'

// Kulüp Hafızası: topluluğun geçmiş film incelemeleri (afiş, tarih, defter ve özet bağlantıları)
// ve tüm defter notlarında tam metin arama. Notlar sadece "Notlarda ara"ya basılınca bir kez
// okunur (küçük kulüp için birkaç düzine okuma) — her sayfa açılışında okunmaz.

const kucuk = (t) => (t || '').toLocaleLowerCase('tr-TR')

function parca(metin, aranan) {
  // Aranan kelimenin etrafından kısa bir alıntı, kelime vurgulu.
  const i = kucuk(metin).indexOf(aranan)
  if (i < 0) return null
  const bas = Math.max(0, i - 50)
  const son = Math.min(metin.length, i + aranan.length + 80)
  return (
    <>
      {bas > 0 && '…'}
      {metin.slice(bas, i)}
      <mark className="bg-gise/50 text-murekkep">{metin.slice(i, i + aranan.length)}</mark>
      {metin.slice(i + aranan.length, son)}
      {son < metin.length && '…'}
    </>
  )
}

export default function KulupHafizasi() {
  const { id } = useParams()
  const { kullanici } = useAuth()
  const [topluluk, setTopluluk] = useState(null)
  const [uyeMi, setUyeMi] = useState(null)
  const [etkinlikler, setEtkinlikler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')
  const [arama, setArama] = useState('')
  const [indeks, setIndeks] = useState(null) // null = notlar henüz okunmadı
  const [indeksYukleniyor, setIndeksYukleniyor] = useState(false)

  useEffect(() => {
    if (!kullanici) return
    let iptal = false
    async function yukle() {
      const [tSnap, uyeSnap] = await Promise.all([getDoc(doc(db, 'topluluklar', id)), getDoc(doc(db, 'topluluklar', id, 'uyeler', kullanici.uid))])
      if (iptal) return
      setTopluluk(tSnap.exists() ? { id: tSnap.id, ...tSnap.data() } : null)
      setUyeMi(uyeSnap.exists())
      if (!uyeSnap.exists()) return
      // Sadece eşitlik filtresi: bileşik indeks gerekmez; sıralama istemci tarafında.
      const snap = await getDocs(query(collection(db, 'gelecekEtkinlikler'), where('topluluklId', '==', id)))
      const simdi = Date.now()
      const liste = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((e) => e.eserBaslik && e.eserTur === 'sinema' && e.tarih && new Date(e.tarih).getTime() < simdi)
        .sort((a, b) => (a.tarih < b.tarih ? 1 : -1))
      if (!iptal) setEtkinlikler(liste)
    }
    yukle()
      .catch((err) => setHata(`Yüklenemedi: ${err.message}`))
      .finally(() => !iptal && setYukleniyor(false))
    return () => {
      iptal = true
    }
  }, [id, kullanici])

  async function notlariOku() {
    setIndeksYukleniyor(true)
    try {
      const sonuc = await Promise.all(
        etkinlikler.map(async (e) => {
          const [bolumler, sahneler] = await Promise.all([incelemeBolumleriniGetir(e.id).catch(() => ({})), sahneNotlariniGetir(e.id).catch(() => [])])
          const satirlar = []
          INCELEME_BOLUMLERI.forEach((b) => {
            const m = bolumler[b.id]?.metin
            if (m?.trim()) satirlar.push({ etkinlik: e, kaynak: `${b.ikon} ${b.baslik}`, metin: m })
          })
          sahneler.forEach((k) =>
            SAHNE_ALANLARI.forEach((a) => {
              if (k[a.id]?.trim()) satirlar.push({ etkinlik: e, kaynak: `🎞️ ${k.kullaniciAdi || 'Üye'} · ${a.etiket}`, metin: k[a.id] })
            })
          )
          return satirlar
        })
      )
      setIndeks(sonuc.flat())
    } catch (err) {
      setHata(`Notlar okunamadı: ${err.message}`)
    } finally {
      setIndeksYukleniyor(false)
    }
  }

  const aranan = kucuk(arama.trim())
  const filmEslesen = useMemo(
    () => (aranan ? etkinlikler.filter((e) => kucuk(e.eserBaslik).includes(aranan)) : etkinlikler),
    [etkinlikler, aranan]
  )
  const notEslesen = useMemo(
    () => (aranan.length >= 2 && indeks ? indeks.filter((r) => kucuk(r.metin).includes(aranan)).slice(0, 60) : []),
    [indeks, aranan]
  )

  if (hata) return <p className="text-sm text-muhur">{hata}</p>
  if (yukleniyor) return <p className="text-sm text-kraft">Yükleniyor…</p>
  if (uyeMi === false) return <p className="text-sm text-kraft">Kulüp Hafızası yalnızca topluluk üyelerine açık.</p>

  return (
    <div>
      <Link to={`/topluluk/${id}`} className="mb-2 inline-block text-xs text-kraft hover:text-deniz">
        ← {topluluk?.ad || 'Topluluk'}
      </Link>
      <h1 className="font-baslik text-2xl text-murekkep">📚 Kulüp Hafızası</h1>
      <p className="mb-4 text-xs text-kraft">Konuştuğumuz filmler, defterlerimiz ve özetlerimiz. {etkinlikler.length} film.</p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder={indeks ? 'Film adında veya notlarda ara…' : 'Film adında ara…'}
          className="min-w-[14rem] flex-1 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
        />
        {!indeks && (
          <button
            onClick={notlariOku}
            disabled={indeksYukleniyor || etkinlikler.length === 0}
            className="rounded-full bg-gise px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {indeksYukleniyor ? 'Notlar okunuyor…' : '🔎 Notlarda da ara'}
          </button>
        )}
      </div>

      {notEslesen.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 font-baslik text-lg text-murekkep">📝 Notlarda bulunanlar ({notEslesen.length})</h2>
          <ul className="space-y-2">
            {notEslesen.map((r, i) => (
              <li key={i} className="rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
                <Link to={`/inceleme/${r.etkinlik.id}`} className="text-xs font-bold text-deniz hover:underline">
                  {r.etkinlik.eserBaslik}
                </Link>
                <span className="text-[11px] text-kraft"> · {r.kaynak}</span>
                <p className="mt-1 text-sm text-murekkep">{parca(r.metin, aranan)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {indeks && aranan.length >= 2 && notEslesen.length === 0 && filmEslesen.length === 0 && (
        <p className="mb-4 text-sm text-kraft">Eşleşen film ya da not bulunamadı.</p>
      )}

      {filmEslesen.length === 0 && !aranan ? (
        <p className="text-sm text-kraft">Henüz geçmiş bir film etkinliği yok.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {filmEslesen.map((e) => (
            <div key={e.id} className="overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
              {e.eserPosterUrl ? (
                <img src={e.eserPosterUrl} alt={e.eserBaslik} className="aspect-[2/3] w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex aspect-[2/3] w-full items-center justify-center bg-kagit text-3xl">🎬</div>
              )}
              <div className="p-2">
                <p className="line-clamp-2 font-baslik text-sm leading-tight text-murekkep">{e.eserBaslik}</p>
                <p className="text-[11px] text-kraft">
                  {new Date(e.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                {e.kulupOrtalamasi?.puan != null && (
                  <p className="text-[11px] font-bold text-murekkep" title={`${e.kulupOrtalamasi.oySayisi || 0} oy · Sinema Odası puanlama töreni`}>
                    ⭐ Kulüp: {Number(e.kulupOrtalamasi.puan).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}/10
                  </p>
                )}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <Link to={`/inceleme/${e.id}`} className="rounded-full bg-gise px-2 py-0.5 text-[10px] text-kagit">
                    📓 Defter
                  </Link>
                  <Link to={`/inceleme/${e.id}/ozet`} className="rounded-full bg-kagit px-2 py-0.5 text-[10px] text-murekkep ring-1 ring-cizgi">
                    📄 Özet
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

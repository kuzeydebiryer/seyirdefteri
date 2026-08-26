import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { haberGetir, haberSil } from '../utils/haber.js'
import { eserYorumlariGetir, eserYorumEkle, yorumSil, yorumBegenDegistir } from '../utils/yorum.js'
import PaylasButonu from '../components/PaylasButonu.jsx'
import Avatar from '../components/Avatar.jsx'

const eserLink = (tur, disId) => (tur === 'dizi' ? `/dizi/${disId}` : tur === 'kitap' ? `/kitap/${disId}` : tur === 'kisi' ? `/kisi/${disId}` : `/film/${disId}`)

function tarihGoster(deger) {
  if (!deger) return ''
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Haberler önceden Film/Dizi/Oyuncu/Kitap sayfalarında sadece tıkla-genişlet
// olarak (sayfa içinde) açılıyordu — yorum yazılamıyor, paylaşılamıyordu.
// Artık her haberin kendi sayfası var (bu bileşen) — üst menüye eklenmedi
// (kasıtlı, menü şişmesin diye), sadece HaberBolumu'ndaki satırlar buraya
// yönlendiriyor. Yorumlar, yorum.js'in {tur, disId} genel sözleşmesini
// "haber" + haberin kendi doküman ID'siyle kullanıyor — yeni bir yorum
// sistemi kurmaya gerek kalmadı.
export default function HaberDetay() {
  const { id } = useParams()
  const { kullanici, profil } = useAuth()
  const [haber, setHaber] = useState(undefined) // undefined: yükleniyor, null: bulunamadı
  const [yorumlar, setYorumlar] = useState(null)
  const [yeniYorum, setYeniYorum] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)

  useEffect(() => {
    haberGetir(id).then(setHaber)
  }, [id])

  useEffect(() => {
    eserYorumlariGetir('haber', id).then(setYorumlar)
  }, [id])

  async function yorumGonder(e) {
    e.preventDefault()
    if (!yeniYorum.trim() || !kullanici) return
    setGonderiliyor(true)
    try {
      await eserYorumEkle('haber', id, kullanici, profil?.adSoyad, yeniYorum, {
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

  const gerisayfa = haber?.kategori === 'dizi' ? '/diziler' : haber?.kategori === 'kitap' ? '/kitaplar' : haber?.kategori === 'kisi' ? '/oyuncular' : '/filmler'

  if (haber === undefined) return <p className="text-sm text-kraft">Yükleniyor...</p>
  if (haber === null) return <p className="text-sm text-kraft">Bu haber bulunamadı.</p>

  return (
    <div>
      <Link to={gerisayfa} className="text-xs text-kraft hover:text-deniz">
        ← Haberler
      </Link>

      <div className="mt-2 mb-1 flex items-start justify-between gap-3">
        <h1 className="font-baslik text-2xl text-murekkep">{haber.baslik}</h1>
        <PaylasButonu baslik={haber.baslik} url={`/haber/${id}`} boyut="kucuk" />
      </div>
      <p className="mb-4 text-xs text-kraft">
        {haber.ekleyenAdi} · {tarihGoster(haber.tarih)}
      </p>

      {haber.gorselUrl && <img src={haber.gorselUrl} alt="" className="mb-4 max-h-96 w-full rounded-sm object-cover ring-1 ring-cizgi" />}

      {haber.icerik && <p className="whitespace-pre-line text-sm leading-relaxed text-murekkep">{haber.icerik}</p>}

      {haber.ilgiliBaslik && (
        <Link
          to={eserLink(haber.ilgiliTur, haber.ilgiliDisId)}
          className="mt-4 flex w-fit items-center gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi hover:ring-deniz/50"
        >
          {haber.ilgiliPosterUrl && <img src={haber.ilgiliPosterUrl} alt="" className="h-20 w-14 rounded-sm object-cover" />}
          <span className="text-sm text-murekkep">{haber.ilgiliBaslik}</span>
        </Link>
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

      {kullanici?.uid === haber.ekleyenId && (
        <button onClick={haberSilTiklandi} className="mt-4 text-xs text-kraft hover:text-muhur">
          Haberi Sil
        </button>
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

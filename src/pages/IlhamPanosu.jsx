import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ILHAM_KATEGORILERI, ilhamEkle, ilhamlariGetir, ilhamSil } from '../utils/ilhamPanosu.js'
import { kitapIcVeriTabanindaAra } from '../utils/kitapKatalog.js'
import { turkceKitaptanKaydet } from '../utils/turkceKitapVeriTabani.js'
import InstagramGomulusu from '../components/InstagramGomulusu.jsx'
import Avatar from '../components/Avatar.jsx'

const KATEGORI_IKONU = { Film: '🎬', Dizi: '📺', Kitap: '📖', Oyuncu: '🎭', Gezi: '🧳', Etkinlik: '🎟️', Sanat: '🎨' }
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w300'
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

// Bu kategoriler için "hangi film/dizi/kitap/oyuncu ile ilgili" araması
// gösteriliyor — seçilirse paylaşım o eser/kişinin KENDİ sayfasına da
// (IlgiliIlhamPanosu bileşeni) otomatik düşüyor. Seçilmezse eskisi gibi
// sadece genel panoda, kategori etiketiyle kalıyor.
const ESER_ARAMALI_KATEGORILER = { Film: 'sinema', Dizi: 'dizi', Kitap: 'kitap', Oyuncu: 'kisi' }

export default function IlhamPanosu() {
  const { kullanici, profil } = useAuth()
  const [aramaParametreleri] = useSearchParams()
  const [kategoriFiltre, setKategoriFiltre] = useState(aramaParametreleri.get('kategori') || '')
  const [ilhamlar, setIlhamlar] = useState(null)
  const [formAcik, setFormAcik] = useState(false)
  const [url, setUrl] = useState('')
  const [kategori, setKategori] = useState('Film')
  const [not_, setNot_] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)

  const [eserArama, setEserArama] = useState('')
  const [eserSonuclari, setEserSonuclari] = useState([])
  const [seciliEser, setSeciliEser] = useState(null)
  const [eserAraniyor, setEserAraniyor] = useState(false)

  useEffect(() => {
    setIlhamlar(null)
    ilhamlariGetir(kategoriFiltre || undefined).then(setIlhamlar)
  }, [kategoriFiltre])

  // Kategori değişince, önceki kategoriden kalan eser seçimi/arama sonucu
  // geçerliliğini yitiriyor — temizliyoruz.
  useEffect(() => {
    setSeciliEser(null)
    setEserArama('')
    setEserSonuclari([])
  }, [kategori])

  async function eserAraTiklandi(e) {
    e.preventDefault()
    if (!eserArama.trim()) return
    setEserAraniyor(true)
    try {
      if (kategori === 'Kitap') {
        const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(eserArama)}&maxResults=10${anahtarParcasi}`
        const [icSonuclar, googleSonuc] = await Promise.all([
          kitapIcVeriTabanindaAra(eserArama, 8),
          fetch(url).then((res) => res.json()).then((data) => data.items || []).catch(() => []),
        ])
        setEserSonuclari([...icSonuclar.map((k) => ({ ...k, _kaynak: 'ic' })), ...googleSonuc])
        return
      }
      if (!TMDB_API_KEY) return
      const yol = kategori === 'Film' ? 'movie' : kategori === 'Dizi' ? 'tv' : 'person'
      const url = `https://api.themoviedb.org/3/search/${yol}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(eserArama)}`
      const res = await fetch(url)
      const data = await res.json()
      setEserSonuclari(data.results || [])
    } finally {
      setEserAraniyor(false)
    }
  }

  async function eserSecTiklandi(item) {
    if (kategori === 'Kitap') {
      if (item._kaynak === 'ic') {
        const kayit = item.id?.startsWith('tr_') ? await turkceKitaptanKaydet(item) : item
        setSeciliEser({ tur: 'kitap', disId: kayit.id, baslik: kayit.baslik || '', posterUrl: kayit.posterUrl || '' })
      } else {
        const v = item.volumeInfo || {}
        setSeciliEser({
          tur: 'kitap',
          disId: item.id,
          baslik: v.title || '',
          posterUrl: (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://'),
        })
      }
    } else if (kategori === 'Oyuncu') {
      setSeciliEser({
        tur: 'kisi',
        disId: item.id,
        baslik: item.name,
        posterUrl: item.profile_path ? `${TMDB_POSTER}${item.profile_path}` : '',
      })
    } else {
      setSeciliEser({
        tur: kategori === 'Dizi' ? 'dizi' : 'sinema',
        disId: item.id,
        baslik: kategori === 'Dizi' ? item.name : item.title,
        posterUrl: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '',
      })
    }
    setEserSonuclari([])
    setEserArama('')
  }

  async function ekleTiklandi(e) {
    e.preventDefault()
    if (!url.trim() || !kullanici) return
    setGonderiliyor(true)
    try {
      await ilhamEkle(kullanici, profil, {
        url: url.trim(),
        kategori,
        not: not_,
        iliskiliTur: seciliEser?.tur || null,
        iliskiliDisId: seciliEser?.disId ?? null,
        iliskiliBaslik: seciliEser?.baslik || '',
        iliskiliPosterUrl: seciliEser?.posterUrl || '',
      })
      setUrl('')
      setNot_('')
      setSeciliEser(null)
      setFormAcik(false)
      ilhamlariGetir(kategoriFiltre || undefined).then(setIlhamlar)
    } finally {
      setGonderiliyor(false)
    }
  }

  async function silTiklandi(id) {
    if (!window.confirm('Bu paylaşımı kaldırmak istediğine emin misin?')) return
    await ilhamSil(id)
    setIlhamlar((liste) => liste.filter((i) => i.id !== id))
  }

  return (
    <div>
      <Link to="/" className="text-xs text-kraft hover:text-deniz">
        ← Anasayfa
      </Link>
      <div className="mt-1 mb-1 flex items-center justify-between">
        <h1 className="font-baslik text-2xl text-murekkep">📌 İlham Panosu</h1>
        {kullanici && (
          <button
            onClick={() => setFormAcik((a) => !a)}
            className="rounded-full bg-gise px-3 py-1.5 font-govde text-xs text-kagit"
          >
            {formAcik ? 'Vazgeç' : '+ Paylaş'}
          </button>
        )}
      </div>
      <p className="mb-6 text-sm text-kraft">
        Sinema, kitap, gezi ve kültür üzerine sosyal medyada gördüğünüz ilginç paylaşımları buraya bırakın.
      </p>

      {formAcik && (
        <form onSubmit={ekleTiklandi} className="mb-6 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <div>
            <label className="mb-1 block text-[11px] text-kraft">Sosyal Medya Gönderi Linki</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://www.instagram.com/p/..."
              className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-kraft">Kategori</label>
            <div className="flex flex-wrap gap-2">
              {ILHAM_KATEGORILERI.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKategori(k)}
                  className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
                    kategori === k ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagit text-kraft ring-cizgi'
                  }`}
                >
                  {KATEGORI_IKONU[k]} {k}
                </button>
              ))}
            </div>
          </div>

          {ESER_ARAMALI_KATEGORILER[kategori] && (
            <div>
              <label className="mb-1 block text-[11px] text-kraft">
                Hangi {kategori.toLowerCase()} ile ilgili? (opsiyonel — seçersen o {kategori === 'Oyuncu' ? 'kişinin' : 'esere ait'} sayfasında da görünür)
              </label>
              {seciliEser ? (
                <div className="flex items-center gap-2 rounded-sm bg-kagit px-3 py-2 ring-1 ring-cizgi">
                  {seciliEser.posterUrl && <img src={seciliEser.posterUrl} alt="" className="h-10 w-7 rounded-sm object-cover" />}
                  <span className="flex-1 text-sm text-murekkep">{seciliEser.baslik}</span>
                  <button type="button" onClick={() => setSeciliEser(null)} className="text-xs text-kraft hover:text-muhur">
                    Kaldır
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={eserArama}
                      onChange={(e) => setEserArama(e.target.value)}
                      placeholder={`${kategori} ara...`}
                      className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                    />
                    <button
                      type="button"
                      onClick={eserAraTiklandi}
                      disabled={eserAraniyor}
                      className="shrink-0 rounded-sm bg-deniz px-3 py-1.5 text-xs text-kagit disabled:opacity-40"
                    >
                      {eserAraniyor ? '...' : 'Ara'}
                    </button>
                  </div>
                  {eserSonuclari.length > 0 && (
                    <div className="mt-2 grid grid-cols-5 gap-2">
                      {eserSonuclari.slice(0, 10).map((item) => {
                        const posterUrl =
                          kategori === 'Kitap'
                            ? item._kaynak === 'ic'
                              ? item.posterUrl || ''
                              : (item.volumeInfo?.imageLinks?.thumbnail || '').replace('http://', 'https://')
                            : item.poster_path || item.profile_path
                              ? `${TMDB_POSTER}${item.poster_path || item.profile_path}`
                              : ''
                        const baslik =
                          kategori === 'Kitap'
                            ? item._kaynak === 'ic'
                              ? item.baslik
                              : item.volumeInfo?.title
                            : kategori === 'Dizi'
                              ? item.name
                              : kategori === 'Oyuncu'
                                ? item.name
                                : item.title
                        return (
                          <button key={item.id} type="button" onClick={() => eserSecTiklandi(item)} className="text-left" title={baslik}>
                            <div className="flex aspect-[2/3] items-center justify-center overflow-hidden rounded-sm bg-kagit p-1 ring-1 ring-cizgi">
                              {posterUrl ? (
                                <img src={posterUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="line-clamp-5 text-center text-[9px] leading-tight text-kraft">{baslik || 'Kapak yok'}</span>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px] text-kraft">Neden paylaştın? (opsiyonel)</label>
            <textarea
              value={not_}
              onChange={(e) => setNot_(e.target.value)}
              rows={2}
              className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
          </div>
          <button
            type="submit"
            disabled={gonderiliyor}
            className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
          >
            {gonderiliyor ? 'Ekleniyor...' : 'Panoya Ekle'}
          </button>
        </form>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setKategoriFiltre('')}
          className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
            kategoriFiltre === '' ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagitKoyu text-kraft ring-cizgi'
          }`}
        >
          Tümü
        </button>
        {ILHAM_KATEGORILERI.map((k) => (
          <button
            key={k}
            onClick={() => setKategoriFiltre(k)}
            className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
              kategoriFiltre === k ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagitKoyu text-kraft ring-cizgi'
            }`}
          >
            {KATEGORI_IKONU[k]} {k}
          </button>
        ))}
      </div>

      {ilhamlar === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {ilhamlar?.length === 0 && <p className="text-sm text-kraft">Henüz bir paylaşım yok — ilkini sen ekle.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {ilhamlar?.map((i) => (
          <div key={i.id} className="rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-gise">
                {KATEGORI_IKONU[i.kategori]} {i.kategori}
                {i.iliskiliBaslik && <span className="text-kraft"> — {i.iliskiliBaslik}</span>}
              </span>
              {kullanici?.uid === i.paylasanId && (
                <button onClick={() => silTiklandi(i.id)} className="text-[11px] text-kraft hover:text-muhur">
                  Sil
                </button>
              )}
            </div>
            <InstagramGomulusu url={i.url} />
            {i.not && <p className="mt-2 text-sm text-murekkep">{i.not}</p>}
            <div className="mt-2 flex items-center gap-1.5">
              <Avatar adSoyad={i.paylasanAdi} boyut="h-5 w-5" />
              <span className="text-xs text-kraft">{i.paylasanAdi} paylaştı</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

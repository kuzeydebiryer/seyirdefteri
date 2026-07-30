import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { topluluğaKatil, topluluktanAyril } from '../utils/topluluk.js'
import { useListeler } from '../hooks/useListeler.js'
import { listeOlustur } from '../utils/liste.js'
import { useGelecekEtkinlikler } from '../hooks/useGelecekEtkinlikler.js'
import { gelecekEtkinlikOlustur } from '../utils/gelecekEtkinlik.js'
import Avatar from '../components/Avatar.jsx'
import GelecekEtkinlikKarti from '../components/GelecekEtkinlikKarti.jsx'
import ListeOnizleme from '../components/ListeOnizleme.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'
const TURLER = ['Sinema', 'Kitap', 'Genel']

export default function TopluluklarDetay() {
  const { id } = useParams()
  const { kullanici } = useAuth()
  const { listeler, yukleniyor: listelerYukleniyor, yenidenYukle: listeleriYenile } = useListeler(id)
  const { etkinlikler, yukleniyor: etkinliklerYukleniyor, yenidenYukle: etkinlikleriYenile } = useGelecekEtkinlikler(id)

  const [listeFormuAcik, setListeFormuAcik] = useState(false)
  const [listeBaslik, setListeBaslik] = useState('')
  const [listeAciklama, setListeAciklama] = useState('')
  const [listeKaydediliyor, setListeKaydediliyor] = useState(false)

  const [etkinlikFormuAcik, setEtkinlikFormuAcik] = useState(false)
  const [etkinlikBaslik, setEtkinlikBaslik] = useState('')
  const [etkinlikAciklama, setEtkinlikAciklama] = useState('')
  const [etkinlikTarihi, setEtkinlikTarihi] = useState('')
  const [eserKategori, setEserKategori] = useState('sinema')
  const [eserArama, setEserArama] = useState('')
  const [eserSonuclari, setEserSonuclari] = useState([])
  const [seciliEser, setSeciliEser] = useState(null)
  const [etkinlikKaydediliyor, setEtkinlikKaydediliyor] = useState(false)

  const [duzenlemeAcik, setDuzenlemeAcik] = useState(false)
  const [dAd, setDAd] = useState('')
  const [dAciklama, setDAciklama] = useState('')
  const [dTur, setDTur] = useState('Sinema')
  const [dKapakUrl, setDKapakUrl] = useState('')
  const [dKaydediliyor, setDKaydediliyor] = useState(false)

  const [topluluk, setTopluluk] = useState(null)
  const [uyeler, setUyeler] = useState([])
  const [uyeMi, setUyeMi] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [isleniyor, setIsleniyor] = useState(false)

  useEffect(() => {
    let iptal = false
    async function getir() {
      setYukleniyor(true)
      const snap = await getDoc(doc(db, 'topluluklar', id))
      if (!iptal && snap.exists()) {
        const veri = snap.data()
        setTopluluk({ id: snap.id, ...veri })
        setDAd(veri.ad)
        setDAciklama(veri.aciklama || '')
        setDTur(veri.tur)
        setDKapakUrl(veri.kapakUrl || '')
      }

      const uyelerSnap = await getDocs(collection(db, 'topluluklar', id, 'uyeler'))
      if (iptal) return
      const uyeIdler = uyelerSnap.docs.map((d) => d.id)
      setUyeMi(kullanici ? uyeIdler.includes(kullanici.uid) : false)

      const profiller = await Promise.all(
        uyeIdler.map(async (uyeId) => {
          const pSnap = await getDoc(doc(db, 'kullanicilar', uyeId))
          return pSnap.exists() ? { id: uyeId, ...pSnap.data() } : { id: uyeId, adSoyad: 'Bilinmeyen' }
        })
      )
      if (!iptal) {
        setUyeler(profiller)
        setYukleniyor(false)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [id, kullanici])

  async function degistir() {
    if (!kullanici) return
    setIsleniyor(true)
    try {
      if (uyeMi) {
        await topluluktanAyril(id, kullanici.uid)
        setUyeler((onceki) => onceki.filter((u) => u.id !== kullanici.uid))
      } else {
        await topluluğaKatil(id, kullanici.uid)
        setUyeler((onceki) => [...onceki, { id: kullanici.uid, adSoyad: 'Sen' }])
      }
      setUyeMi(!uyeMi)
      setTopluluk((onceki) => ({ ...onceki, uyeSayisi: (onceki.uyeSayisi || 0) + (uyeMi ? -1 : 1) }))
    } finally {
      setIsleniyor(false)
    }
  }

  async function duzenlemeyiKaydet(e) {
    e.preventDefault()
    setDKaydediliyor(true)
    try {
      await updateDoc(doc(db, 'topluluklar', id), { ad: dAd.trim(), aciklama: dAciklama, tur: dTur, kapakUrl: dKapakUrl })
      setTopluluk((onceki) => ({ ...onceki, ad: dAd.trim(), aciklama: dAciklama, tur: dTur, kapakUrl: dKapakUrl }))
      setDuzenlemeAcik(false)
    } finally {
      setDKaydediliyor(false)
    }
  }

  async function listeOlusturTiklandi(e) {
    e.preventDefault()
    if (!listeBaslik.trim() || !kullanici) return
    setListeKaydediliyor(true)
    try {
      await listeOlustur(id, { baslik: listeBaslik.trim(), aciklama: listeAciklama, kullanici })
      setListeBaslik('')
      setListeAciklama('')
      setListeFormuAcik(false)
      listeleriYenile()
    } finally {
      setListeKaydediliyor(false)
    }
  }

  async function eserAra(e) {
    e.preventDefault()
    if (!eserArama.trim() || !TMDB_API_KEY) return
    const uc = eserKategori === 'sinema' ? 'movie' : 'tv'
    const url = `https://api.themoviedb.org/3/search/${uc}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(eserArama)}`
    const res = await fetch(url)
    const data = await res.json()
    setEserSonuclari(data.results || [])
  }

  async function eserSec(item) {
    const baslik = eserKategori === 'sinema' ? item.title : item.name
    const yil = (eserKategori === 'sinema' ? item.release_date : item.first_air_date)?.slice(0, 4)
    const posterUrl = item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : ''
    let yonetmen = '', oyuncular = ''
    if (TMDB_API_KEY) {
      try {
        const uc = eserKategori === 'sinema' ? 'movie' : 'tv'
        const url = `https://api.themoviedb.org/3/${uc}/${item.id}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=credits`
        const res = await fetch(url)
        const detay = await res.json()
        yonetmen =
          eserKategori === 'sinema'
            ? (detay.credits?.crew || []).filter((k) => k.job === 'Director').map((k) => k.name).join(', ')
            : (detay.created_by || []).map((k) => k.name).join(', ')
        oyuncular = (detay.credits?.cast || []).slice(0, 5).map((k) => k.name).join(', ')
      } catch {
        // sessizce geç
      }
    }
    setSeciliEser({ eserTur: eserKategori, eserTmdbId: item.id, eserBaslik: baslik, eserYil: yil, eserPosterUrl: posterUrl, yonetmen, oyuncular })
    setEserSonuclari([])
    setEserArama('')
  }

  async function etkinlikOlusturTiklandi(e) {
    e.preventDefault()
    if (!etkinlikBaslik.trim() || !etkinlikTarihi || !kullanici) return
    setEtkinlikKaydediliyor(true)
    try {
      await gelecekEtkinlikOlustur(id, {
        baslik: etkinlikBaslik.trim(),
        aciklama: etkinlikAciklama,
        tarih: etkinlikTarihi,
        eser: seciliEser,
        topluluk,
        kullanici,
      })
      setEtkinlikBaslik('')
      setEtkinlikAciklama('')
      setEtkinlikTarihi('')
      setSeciliEser(null)
      setEtkinlikFormuAcik(false)
      etkinlikleriYenile()
    } finally {
      setEtkinlikKaydediliyor(false)
    }
  }

  if (yukleniyor) return <p className="text-kraft text-sm">Yükleniyor...</p>
  if (!topluluk) return <p className="text-kraft text-sm">Topluluk bulunamadı.</p>

  const benimTopluluğumMu = kullanici?.uid === topluluk.kurucuId

  return (
    <div>
      {topluluk.kapakUrl && (
        <div className="mb-4 h-40 w-full overflow-hidden rounded-sm ring-1 ring-cizgi">
          <img src={topluluk.kapakUrl} alt={topluluk.ad} className="h-full w-full object-cover" />
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <span className="rounded-full bg-kagitKoyu px-2 py-0.5 text-[10px] uppercase tracking-wide text-kraft ring-1 ring-cizgi">
            {topluluk.tur}
          </span>
          <h1 className="font-baslik text-2xl text-murekkep mt-2">{topluluk.ad}</h1>
          <p className="text-xs text-kraft mt-1">
            {topluluk.kurucuAdi} tarafından kuruldu · {topluluk.uyeSayisi || 0} üye
          </p>
          {topluluk.aciklama && <p className="mt-2 text-sm text-murekkep">{topluluk.aciklama}</p>}
          {benimTopluluğumMu && (
            <button onClick={() => setDuzenlemeAcik((a) => !a)} className="mt-2 text-xs text-kraft hover:text-murekkep">
              {duzenlemeAcik ? 'Vazgeç' : 'Topluluğu Düzenle'}
            </button>
          )}
          {duzenlemeAcik && (
            <form onSubmit={duzenlemeyiKaydet} className="mt-3 max-w-sm space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
              <div>
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Topluluk Adı</label>
                <input
                  type="text"
                  value={dAd}
                  onChange={(e) => setDAd(e.target.value)}
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Tür</label>
                <select
                  value={dTur}
                  onChange={(e) => setDTur(e.target.value)}
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                >
                  {TURLER.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Açıklama</label>
                <textarea
                  value={dAciklama}
                  onChange={(e) => setDAciklama(e.target.value)}
                  rows={2}
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Kapak Görsel URL</label>
                <input
                  type="text"
                  value={dKapakUrl}
                  onChange={(e) => setDKapakUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <button
                type="submit"
                disabled={dKaydediliyor}
                className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
              >
                {dKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </form>
          )}
        </div>
        <button
          onClick={degistir}
          disabled={isleniyor}
          className={`shrink-0 rounded-sm px-3 py-1.5 font-govde text-xs ${
            uyeMi ? 'bg-kagitKoyu text-kraft ring-1 ring-cizgi' : 'bg-muhur text-kagit'
          } disabled:opacity-40`}
        >
          {uyeMi ? 'Üyesin' : 'Katıl'}
        </button>
      </div>

      <div className="defter-cizgi my-6" />

      {/* Gelecek Etkinlikler */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-baslik text-lg text-murekkep">Gelecek Etkinlikler</h2>
          {kullanici && (
            <button
              onClick={() => setEtkinlikFormuAcik((a) => !a)}
              className="rounded-sm bg-kagitKoyu px-3 py-1 font-govde text-xs text-kraft ring-1 ring-cizgi"
            >
              {etkinlikFormuAcik ? 'Vazgeç' : '+ Etkinlik Ekle'}
            </button>
          )}
        </div>

        {etkinlikFormuAcik && (
          <form onSubmit={etkinlikOlusturTiklandi} className="mb-4 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
            <div>
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Etkinlik Başlığı</label>
              <input
                type="text"
                value={etkinlikBaslik}
                onChange={(e) => setEtkinlikBaslik(e.target.value)}
                required
                placeholder="Örn. Aylık film gecesi"
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Tarih ve Saat</label>
              <input
                type="datetime-local"
                value={etkinlikTarihi}
                onChange={(e) => setEtkinlikTarihi(e.target.value)}
                required
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Açıklama</label>
              <textarea
                value={etkinlikAciklama}
                onChange={(e) => setEtkinlikAciklama(e.target.value)}
                rows={2}
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">
                İlgili Film/Dizi (opsiyonel)
              </label>
              {seciliEser ? (
                <div className="flex items-center gap-2 rounded-sm bg-kagit p-2 ring-1 ring-cizgi">
                  {seciliEser.eserPosterUrl && (
                    <img src={seciliEser.eserPosterUrl} alt="" className="h-14 w-10 rounded-sm object-cover" />
                  )}
                  <p className="flex-1 text-xs text-murekkep">
                    {seciliEser.eserBaslik} {seciliEser.eserYil && `(${seciliEser.eserYil})`}
                  </p>
                  <button type="button" onClick={() => setSeciliEser(null)} className="text-[11px] text-kraft hover:text-muhur">
                    Kaldır
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEserKategori('sinema')}
                      className={`rounded-sm px-2 py-1 text-xs ${eserKategori === 'sinema' ? 'bg-deniz text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
                    >
                      Film
                    </button>
                    <button
                      type="button"
                      onClick={() => setEserKategori('dizi')}
                      className={`rounded-sm px-2 py-1 text-xs ${eserKategori === 'dizi' ? 'bg-deniz text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
                    >
                      Dizi
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={eserArama}
                      onChange={(e) => setEserArama(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          eserAra(e)
                        }
                      }}
                      placeholder="Film/dizi ara..."
                      className="flex-1 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                    />
                    <button onClick={eserAra} type="button" className="rounded-sm bg-deniz px-3 py-2 text-xs text-kagit">
                      Ara
                    </button>
                  </div>
                  {eserSonuclari.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                      {eserSonuclari.slice(0, 16).map((item) => (
                        <button key={item.id} type="button" onClick={() => eserSec(item)} className="text-left">
                          <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                            {item.poster_path && (
                              <img src={`${TMDB_POSTER}${item.poster_path}`} alt="" className="h-full w-full object-cover" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={etkinlikKaydediliyor}
              className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
            >
              {etkinlikKaydediliyor ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
          </form>
        )}

        {etkinliklerYukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
        {!etkinliklerYukleniyor && etkinlikler.length === 0 && <p className="text-sm text-kraft">Planlanmış bir etkinlik yok.</p>}

        <div className="space-y-3">
          {etkinlikler.map((e) => (
            <GelecekEtkinlikKarti key={e.id} topluluklId={id} etkinlik={e} />
          ))}
        </div>
      </div>

      <div className="defter-cizgi my-6" />

      {/* Geçmiş Etkinlikler (Listeler) */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-baslik text-lg text-murekkep">Geçmiş Etkinlikler</h2>
          {kullanici && (
            <button
              onClick={() => setListeFormuAcik((a) => !a)}
              className="rounded-sm bg-kagitKoyu px-3 py-1 font-govde text-xs text-kraft ring-1 ring-cizgi"
            >
              {listeFormuAcik ? 'Vazgeç' : '+ Liste Oluştur'}
            </button>
          )}
        </div>

        {listeFormuAcik && (
          <form onSubmit={listeOlusturTiklandi} className="mb-4 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
            <div>
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Liste Başlığı</label>
              <input
                type="text"
                value={listeBaslik}
                onChange={(e) => setListeBaslik(e.target.value)}
                required
                placeholder="Örn. 200 Film Serüveni"
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Açıklama</label>
              <textarea
                value={listeAciklama}
                onChange={(e) => setListeAciklama(e.target.value)}
                rows={2}
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
            </div>
            <button
              type="submit"
              disabled={listeKaydediliyor}
              className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
            >
              {listeKaydediliyor ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
          </form>
        )}

        {listelerYukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
        {!listelerYukleniyor && listeler.length === 0 && <p className="text-sm text-kraft">Henüz bir liste yok.</p>}

        <ul className="space-y-2">
          {listeler.map((l) => (
            <li key={l.id}>
              <Link
                to={`/topluluk/${id}/liste/${l.id}`}
                className="block rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi hover:ring-muhur"
              >
                <p className="font-govde text-sm text-murekkep">{l.baslik}</p>
                {l.aciklama && <p className="text-xs text-kraft">{l.aciklama}</p>}
                <p className="mt-1 text-xs text-kraft">{l.ogeSayisi || 0} eser</p>
                <ListeOnizleme topluluklId={id} listeId={l.id} adet={10} />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="defter-cizgi my-6" />

      <h2 className="font-baslik text-lg text-murekkep mb-3">Üyeler</h2>
      <ul className="space-y-2">
        {uyeler.map((u) => (
          <li key={u.id}>
            <Link to={`/profil/${u.id}`} className="flex items-center gap-3 rounded-sm bg-kagitKoyu p-2 ring-1 ring-cizgi">
              <Avatar adSoyad={u.adSoyad} avatarUrl={u.avatarUrl} boyut="h-8 w-8" />
              <div>
                <p className="text-sm text-murekkep">{u.adSoyad}</p>
                {u.kullaniciAdi && <p className="text-xs text-kraft">@{u.kullaniciAdi}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

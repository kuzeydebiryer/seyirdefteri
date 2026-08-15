import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import {
  topluluğaKatil,
  topluluktanAyril,
  rolDegistir,
  katilmaIstegiGonder,
  katilmaIstegiIptalEt,
  katilmaIstegiVarMi,
  katilmaIstekleriGetir,
  katilmaIstegiOnayla,
  katilmaIstegiReddet,
} from '../utils/topluluk.js'
import { useListeler } from '../hooks/useListeler.js'
import { listeOlustur } from '../utils/liste.js'
import { useGelecekEtkinlikler } from '../hooks/useGelecekEtkinlikler.js'
import { gelecekEtkinlikOlustur } from '../utils/gelecekEtkinlik.js'
import Avatar from '../components/Avatar.jsx'
import GelecekEtkinlikKarti from '../components/GelecekEtkinlikKarti.jsx'
import EtkinlikOnerileriBolumu from '../components/EtkinlikOnerileriBolumu.jsx'
import ListeOnizleme from '../components/ListeOnizleme.jsx'
import SohbetPaneli from '../components/SohbetPaneli.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
const TURLER = ['Sinema', 'Kitap', 'Genel']
const TEKRAR_SECENEKLERI = [
  { id: 'yok', etiket: 'Tekrarlama' },
  { id: 'haftalik', etiket: 'Her hafta' },
  { id: 'aylik', etiket: 'Her ay' },
]

// "Her ayın ilk salısı" gibi manuel tekrar hesaplamak yerine basitçe N gün/ay
// ekleyerek bir sonraki tekrarı üretir — pratikte "her hafta aynı gün" veya
// "her ay aynı gün" beklentisini karşılıyor.
function tekrarTarihiEkle(isoTarih, tur, kacinciTekrar) {
  const d = new Date(isoTarih)
  if (tur === 'haftalik') d.setDate(d.getDate() + 7 * kacinciTekrar)
  else if (tur === 'aylik') d.setMonth(d.getMonth() + kacinciTekrar)
  // datetime-local input'un beklediği "YYYY-MM-DDTHH:mm" biçimine geri çevir
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function TopluluklarDetay() {
  const { id } = useParams()
  const { kullanici } = useAuth()
  const { listeler, yukleniyor: listelerYukleniyor, yenidenYukle: listeleriYenile } = useListeler(id)
  const { etkinlikler, yukleniyor: etkinliklerYukleniyor, hata: etkinliklerHatasi, yenidenYukle: etkinlikleriYenile } = useGelecekEtkinlikler(id)

  const [listeFormuAcik, setListeFormuAcik] = useState(false)
  const [listeBaslik, setListeBaslik] = useState('')
  const [listeAciklama, setListeAciklama] = useState('')
  const [listeKapakUrl, setListeKapakUrl] = useState('')
  const [listeKaydediliyor, setListeKaydediliyor] = useState(false)

  const [etkinlikFormuAcik, setEtkinlikFormuAcik] = useState(false)
  const [etkinlikBaslik, setEtkinlikBaslik] = useState('')
  const [etkinlikAciklama, setEtkinlikAciklama] = useState('')
  const [etkinlikTarihi, setEtkinlikTarihi] = useState('')
  const [etkinlikZoomLinki, setEtkinlikZoomLinki] = useState('')
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
  const [dGizli, setDGizli] = useState(false)
  const [dKaydediliyor, setDKaydediliyor] = useState(false)

  const [tekrarTur, setTekrarTur] = useState('yok')
  const [tekrarSayisi, setTekrarSayisi] = useState(4)

  const [topluluk, setTopluluk] = useState(null)
  const [uyeler, setUyeler] = useState([])
  const [uyeMi, setUyeMi] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [isleniyor, setIsleniyor] = useState(false)
  const [gecmisAcik, setGecmisAcik] = useState(false)
  const [istekVarMi, setIstekVarMi] = useState(false)
  const [istekler, setIstekler] = useState([])
  const [istekIsleniyor, setIstekIsleniyor] = useState(null) // işlenen istek uid'i

  // "Gelecek Etkinlikler" sorgusu tarihe göre filtrelemeden hepsini getiriyor
  // (bkz. useGelecekEtkinlikler.js) — geçmiş/gelecek ayrımını burada, istemci
  // tarafında yapıyoruz. Böylece geçmiş buluşmalar sonsuza dek "planlanan"
  // listesinde birikmek yerine ayrı, katlanabilir bir arşive düşüyor.
  const simdi = Date.now()
  const gelecekOlanlar = etkinlikler.filter((e) => !e.tarih || new Date(e.tarih).getTime() >= simdi)
  const gecmisOlanlar = etkinlikler.filter((e) => e.tarih && new Date(e.tarih).getTime() < simdi).reverse()

  // "Bu ayki eser" vitrini: en yakın gelecek etkinliğin eseri, yoksa en son
  // geçmiş etkinliğin eseri ("son konuştuğumuz") — hiçbiri eser içermiyorsa
  // vitrin hiç gösterilmiyor.
  const vitrinEtkinlik = gelecekOlanlar.find((e) => e.eserBaslik) || gecmisOlanlar.find((e) => e.eserBaslik)
  const benimRolum = kullanici
    ? kullanici.uid === topluluk?.kurucuId
      ? 'kurucu'
      : uyeler.find((u) => u.id === kullanici.uid)?.rol || (uyeMi ? 'uye' : null)
    : null
  const yoneticiMiyim = benimRolum === 'kurucu' || benimRolum === 'moderator'

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
        setDGizli(!!veri.gizli)
      }

      const uyelerSnap = await getDocs(collection(db, 'topluluklar', id, 'uyeler'))
      if (iptal) return
      const uyeKayitlari = uyelerSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const uyeIdler = uyeKayitlari.map((u) => u.id)
      setUyeMi(kullanici ? uyeIdler.includes(kullanici.uid) : false)

      const profiller = await Promise.all(
        uyeKayitlari.map(async (uyeKaydi) => {
          const pSnap = await getDoc(doc(db, 'kullanicilar', uyeKaydi.id))
          const profil = pSnap.exists() ? pSnap.data() : { adSoyad: 'Bilinmeyen' }
          return { id: uyeKaydi.id, rol: uyeKaydi.rol, ...profil }
        })
      )
      if (!iptal) {
        setUyeler(profiller)
        setYukleniyor(false)
      }

      // Kapalı topluluk: benim bekleyen bir isteğim var mı?
      if (kullanici && !uyeIdler.includes(kullanici.uid)) {
        katilmaIstegiVarMi(id, kullanici.uid).then((v) => !iptal && setIstekVarMi(v))
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [id, kullanici])

  // Yönetici isem bekleyen istekleri ayrıca çekiyorum (herkes bunları görmemeli).
  useEffect(() => {
    if (!yoneticiMiyim || !topluluk?.gizli) {
      setIstekler([])
      return
    }
    let iptal = false
    katilmaIstekleriGetir(id).then((liste) => !iptal && setIstekler(liste))
    return () => {
      iptal = true
    }
  }, [id, yoneticiMiyim, topluluk?.gizli])

  async function degistir() {
    if (!kullanici) return
    setIsleniyor(true)
    try {
      if (uyeMi) {
        await topluluktanAyril(id, kullanici.uid)
        setUyeler((onceki) => onceki.filter((u) => u.id !== kullanici.uid))
        setUyeMi(false)
        setTopluluk((onceki) => ({ ...onceki, uyeSayisi: (onceki.uyeSayisi || 0) - 1 }))
      } else if (topluluk.gizli) {
        // Kapalı topluluk: doğrudan üye olmak yerine istek gönderiliyor,
        // yönetici onaylayana kadar bekliyor.
        if (istekVarMi) {
          await katilmaIstegiIptalEt(id, kullanici.uid)
          setIstekVarMi(false)
        } else {
          await katilmaIstegiGonder(id, kullanici)
          setIstekVarMi(true)
        }
      } else {
        await topluluğaKatil(id, kullanici.uid)
        setUyeler((onceki) => [...onceki, { id: kullanici.uid, adSoyad: 'Sen' }])
        setUyeMi(true)
        setTopluluk((onceki) => ({ ...onceki, uyeSayisi: (onceki.uyeSayisi || 0) + 1 }))
      }
    } finally {
      setIsleniyor(false)
    }
  }

  async function istegiOnayla(istekUid) {
    setIstekIsleniyor(istekUid)
    try {
      await katilmaIstegiOnayla(id, istekUid)
      const istek = istekler.find((i) => i.id === istekUid)
      setIstekler((onceki) => onceki.filter((i) => i.id !== istekUid))
      setUyeler((onceki) => [...onceki, { id: istekUid, adSoyad: istek?.adSoyad || 'Bilinmeyen' }])
      setTopluluk((onceki) => ({ ...onceki, uyeSayisi: (onceki.uyeSayisi || 0) + 1 }))
    } finally {
      setIstekIsleniyor(null)
    }
  }

  async function istegiReddet(istekUid) {
    setIstekIsleniyor(istekUid)
    try {
      await katilmaIstegiReddet(id, istekUid)
      setIstekler((onceki) => onceki.filter((i) => i.id !== istekUid))
    } finally {
      setIstekIsleniyor(null)
    }
  }

  async function uyeRolunuDegistir(uyeId, yeniRol) {
    await rolDegistir(id, uyeId, yeniRol)
    setUyeler((onceki) => onceki.map((u) => (u.id === uyeId ? { ...u, rol: yeniRol } : u)))
  }

  async function duzenlemeyiKaydet(e) {
    e.preventDefault()
    setDKaydediliyor(true)
    try {
      await updateDoc(doc(db, 'topluluklar', id), { ad: dAd.trim(), aciklama: dAciklama, tur: dTur, kapakUrl: dKapakUrl, gizli: dGizli })
      setTopluluk((onceki) => ({ ...onceki, ad: dAd.trim(), aciklama: dAciklama, tur: dTur, kapakUrl: dKapakUrl, gizli: dGizli }))
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
      await listeOlustur(id, { baslik: listeBaslik.trim(), aciklama: listeAciklama, kapakUrl: listeKapakUrl, kullanici })
      setListeBaslik('')
      setListeAciklama('')
      setListeKapakUrl('')
      setListeFormuAcik(false)
      listeleriYenile()
    } finally {
      setListeKaydediliyor(false)
    }
  }

  async function eserAra(e) {
    e.preventDefault()
    if (!eserArama.trim()) return
    if (eserKategori === 'kitap') {
      const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(eserArama)}&maxResults=16${anahtarParcasi}`
      const res = await fetch(url)
      const data = await res.json()
      setEserSonuclari(data.items || [])
      return
    }
    if (!TMDB_API_KEY) return
    const uc = eserKategori === 'sinema' ? 'movie' : 'tv'
    const url = `https://api.themoviedb.org/3/search/${uc}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(eserArama)}`
    const res = await fetch(url)
    const data = await res.json()
    setEserSonuclari(data.results || [])
  }

  async function eserSec(item) {
    if (eserKategori === 'kitap') {
      const v = item.volumeInfo || {}
      setSeciliEser({
        eserTur: 'kitap',
        eserGoogleBooksId: item.id,
        eserBaslik: v.title || '',
        eserYazar: (v.authors || []).join(', '),
        eserYil: (v.publishedDate || '').slice(0, 4),
        eserPosterUrl: (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://'),
      })
      setEserSonuclari([])
      setEserArama('')
      return
    }
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
      const tekrarSeriId = tekrarTur !== 'yok' ? `${id}_${Date.now()}` : null
      const kacKez = tekrarTur === 'yok' ? 1 : Math.min(Math.max(Number(tekrarSayisi) || 1, 1), 24)
      for (let i = 0; i < kacKez; i++) {
        const tarih = i === 0 ? etkinlikTarihi : tekrarTarihiEkle(etkinlikTarihi, tekrarTur, i)
        await gelecekEtkinlikOlustur(id, {
          baslik: etkinlikBaslik.trim(),
          aciklama: etkinlikAciklama,
          tarih,
          eser: seciliEser,
          topluluk,
          kullanici,
          tekrarSeriId,
          zoomLinki: etkinlikZoomLinki.trim(),
        })
      }
      setEtkinlikBaslik('')
      setEtkinlikAciklama('')
      setEtkinlikTarihi('')
      setEtkinlikZoomLinki('')
      setSeciliEser(null)
      setTekrarTur('yok')
      setTekrarSayisi(4)
      setEtkinlikFormuAcik(false)
      etkinlikleriYenile()
    } finally {
      setEtkinlikKaydediliyor(false)
    }
  }

  if (yukleniyor) return <p className="text-kraft text-sm">Yükleniyor...</p>
  if (!topluluk) return <p className="text-kraft text-sm">Topluluk bulunamadı.</p>

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
          {yoneticiMiyim && (
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
              <label className="flex items-center gap-2 text-xs text-murekkep">
                <input type="checkbox" checked={dGizli} onChange={(e) => setDGizli(e.target.checked)} />
                🔒 Kapalı topluluk — katılım isteği onayımdan geçsin
              </label>
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
            uyeMi || istekVarMi ? 'bg-kagitKoyu text-kraft ring-1 ring-cizgi' : 'bg-muhur text-kagit'
          } disabled:opacity-40`}
        >
          {uyeMi ? 'Üyesin' : istekVarMi ? 'İsteğin Bekliyor (İptal Et)' : topluluk.gizli ? '🔒 Katılma İsteği Gönder' : 'Katıl'}
        </button>
      </div>

      {vitrinEtkinlik && (
        <div className="mt-4 flex gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
          {vitrinEtkinlik.eserPosterUrl && (
            <img src={vitrinEtkinlik.eserPosterUrl} alt={vitrinEtkinlik.eserBaslik} className="h-24 w-16 shrink-0 rounded-sm object-cover ring-1 ring-cizgi" />
          )}
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-gise">
              {gelecekOlanlar.includes(vitrinEtkinlik) ? 'Şu An Bunu Konuşuyoruz' : 'Son Konuştuğumuz'}
            </p>
            <p className="mt-1 font-baslik text-base text-murekkep">
              {vitrinEtkinlik.eserBaslik} {vitrinEtkinlik.eserYil && `(${vitrinEtkinlik.eserYil})`}
            </p>
            {(vitrinEtkinlik.yonetmen || vitrinEtkinlik.eserYazar) && (
              <p className="text-xs text-kraft">{vitrinEtkinlik.yonetmen || vitrinEtkinlik.eserYazar}</p>
            )}
          </div>
        </div>
      )}

      {yoneticiMiyim && topluluk.gizli && istekler.length > 0 && (
        <div className="mt-4 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
          <p className="mb-2 font-baslik text-sm text-murekkep">Bekleyen İstekler ({istekler.length})</p>
          <ul className="space-y-2">
            {istekler.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2">
                <span className="text-sm text-murekkep">{i.adSoyad}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => istegiOnayla(i.id)}
                    disabled={istekIsleniyor === i.id}
                    className="rounded-sm bg-muhur px-2 py-1 text-[11px] text-kagit disabled:opacity-40"
                  >
                    Onayla
                  </button>
                  <button
                    onClick={() => istegiReddet(i.id)}
                    disabled={istekIsleniyor === i.id}
                    className="rounded-sm bg-kagit px-2 py-1 text-[11px] text-kraft ring-1 ring-cizgi disabled:opacity-40"
                  >
                    Reddet
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="defter-cizgi my-6" />

      {uyeMi && <SohbetPaneli konumId={`topluluk_${id}`} baslik="💬 Topluluk Sohbeti" />}

      {/* Gelecek Etkinlikler */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-baslik text-lg text-murekkep">Gelecek Etkinlikler</h2>
          {uyeMi && (
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
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Zoom/Toplantı Linki (opsiyonel)</label>
              <input
                type="text"
                value={etkinlikZoomLinki}
                onChange={(e) => setEtkinlikZoomLinki(e.target.value)}
                placeholder="https://zoom.us/j/..."
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
                İlgili Film/Dizi/Kitap (opsiyonel)
              </label>
              {seciliEser ? (
                <div className="flex items-center gap-2 rounded-sm bg-kagit p-2 ring-1 ring-cizgi">
                  {seciliEser.eserPosterUrl && (
                    <img src={seciliEser.eserPosterUrl} alt="" className="h-14 w-10 rounded-sm object-cover" />
                  )}
                  <p className="flex-1 text-xs text-murekkep">
                    {seciliEser.eserBaslik} {seciliEser.eserYil && `(${seciliEser.eserYil})`}
                    {seciliEser.eserYazar && ` — ${seciliEser.eserYazar}`}
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
                    <button
                      type="button"
                      onClick={() => setEserKategori('kitap')}
                      className={`rounded-sm px-2 py-1 text-xs ${eserKategori === 'kitap' ? 'bg-deniz text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
                    >
                      Kitap
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
                      placeholder={eserKategori === 'kitap' ? 'Kitap ara...' : 'Film/dizi ara...'}
                      className="flex-1 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                    />
                    <button onClick={eserAra} type="button" className="rounded-sm bg-deniz px-3 py-2 text-xs text-kagit">
                      Ara
                    </button>
                  </div>
                  {eserSonuclari.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                      {eserSonuclari.slice(0, 16).map((item) => {
                        const posterUrl =
                          eserKategori === 'kitap'
                            ? (item.volumeInfo?.imageLinks?.thumbnail || '').replace('http://', 'https://')
                            : item.poster_path && `${TMDB_POSTER}${item.poster_path}`
                        return (
                          <button key={item.id} type="button" onClick={() => eserSec(item)} className="text-left">
                            <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                              {posterUrl && <img src={posterUrl} alt="" className="h-full w-full object-cover" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Tekrarla (opsiyonel)</label>
              <div className="flex items-center gap-2">
                <select
                  value={tekrarTur}
                  onChange={(e) => setTekrarTur(e.target.value)}
                  className="rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                >
                  {TEKRAR_SECENEKLERI.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.etiket}
                    </option>
                  ))}
                </select>
                {tekrarTur !== 'yok' && (
                  <>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={tekrarSayisi}
                      onChange={(e) => setTekrarSayisi(e.target.value)}
                      className="w-16 rounded-sm bg-kagit px-2 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                    />
                    <span className="text-xs text-kraft">kez</span>
                  </>
                )}
              </div>
              {tekrarTur !== 'yok' && (
                <p className="mt-1 text-[11px] text-kraft">
                  {tekrarSayisi} ayrı etkinlik oluşturulacak, hepsi aynı başlık/eserle.
                </p>
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
        {etkinliklerHatasi && (
          <p className="text-sm text-muhur">
            Gelecek etkinlikler yüklenemedi: {etkinliklerHatasi}
            {etkinliklerHatasi.includes('index') && ' — F12 konsolundaki linke tıklayarak indeksi oluşturabilirsin.'}
          </p>
        )}
        {!etkinliklerYukleniyor && !etkinliklerHatasi && gelecekOlanlar.length === 0 && (
          <p className="text-sm text-kraft">Planlanmış bir etkinlik yok.</p>
        )}

        <div className="space-y-3">
          {gelecekOlanlar.map((e) => (
            <GelecekEtkinlikKarti key={e.id} etkinlik={e} />
          ))}
        </div>

        {gecmisOlanlar.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setGecmisAcik((a) => !a)}
              className="text-xs text-kraft hover:text-murekkep"
            >
              {gecmisAcik ? '▾' : '▸'} Geçmiş Etkinlikler ({gecmisOlanlar.length})
            </button>
            {gecmisAcik && (
              <div className="mt-3 space-y-3 opacity-70">
                {gecmisOlanlar.map((e) => (
                  <GelecekEtkinlikKarti key={e.id} etkinlik={e} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="defter-cizgi my-6" />

      <EtkinlikOnerileriBolumu topluluklId={id} topluluk={topluluk} uyeMi={uyeMi} yoneticiMiyim={yoneticiMiyim} />

      <div className="defter-cizgi my-6" />

      {/* Topluluk Listeleri */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-baslik text-lg text-murekkep">Topluluk Listeleri</h2>
          {uyeMi && (
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
            <div>
              <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Kapak Görsel URL (opsiyonel)</label>
              <input
                type="text"
                value={listeKapakUrl}
                onChange={(e) => setListeKapakUrl(e.target.value)}
                placeholder="https://..."
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
                {l.kapakUrl && (
                  <div className="mb-2 h-24 w-full overflow-hidden rounded-sm ring-1 ring-cizgi">
                    <img src={l.kapakUrl} alt={l.baslik} className="h-full w-full object-cover" />
                  </div>
                )}
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
        {uyeler.map((u) => {
          const uRol = u.id === topluluk.kurucuId ? 'kurucu' : u.rol
          return (
            <li key={u.id} className="flex items-center gap-3 rounded-sm bg-kagitKoyu p-2 ring-1 ring-cizgi">
              <Link to={`/profil/${u.id}`} className="flex flex-1 items-center gap-3 min-w-0">
                <Avatar adSoyad={u.adSoyad} avatarUrl={u.avatarUrl} boyut="h-8 w-8" />
                <div className="min-w-0">
                  <p className="text-sm text-murekkep">
                    {u.adSoyad}
                    {uRol === 'kurucu' && <span className="ml-1.5 text-[10px] text-gise">👑 Kurucu</span>}
                    {uRol === 'moderator' && <span className="ml-1.5 text-[10px] text-deniz">🛡️ Moderatör</span>}
                  </p>
                  {u.kullaniciAdi && <p className="text-xs text-kraft">@{u.kullaniciAdi}</p>}
                </div>
              </Link>
              {benimRolum === 'kurucu' && u.id !== kullanici?.uid && (
                <button
                  onClick={() => uyeRolunuDegistir(u.id, uRol === 'moderator' ? 'uye' : 'moderator')}
                  className="shrink-0 text-[11px] text-kraft hover:text-deniz"
                >
                  {uRol === 'moderator' ? 'Moderatörlükten Al' : 'Moderatör Yap'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

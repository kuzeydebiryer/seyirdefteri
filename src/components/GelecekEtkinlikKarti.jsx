import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { katilacagimDegistir, kaynakEkle, gelecekEtkinlikGuncelle } from '../utils/gelecekEtkinlik.js'
import { useKaynaklar } from '../hooks/useKaynaklar.js'
import { kulupIlerlemeGetir } from '../utils/kulupIstatistik.js'
import { kitapIcVeriTabanindaAra } from '../utils/kitapKatalog.js'
import { turkceKitaptanKaydet } from '../utils/turkceKitapVeriTabani.js'
import MedyaGomulusu from './MedyaGomulusu.jsx'
import Avatar from './Avatar.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY

// Oyuncu listesi kartı gereksiz uzatıyordu (mobilde 5+ isim birkaç satıra
// taşabiliyordu) — artık yönetmenle birlikte TEK satırda, ilk 2 isim + kalan
// sayı olarak özetleniyor. Film/kitap etkinlikleri artık birbirine yakın
// bir yükseklikte kalıyor.
function oyuncuOzeti(oyuncularStr) {
  const isimler = (oyuncularStr || '').split(',').map((s) => s.trim()).filter(Boolean)
  if (isimler.length === 0) return ''
  if (isimler.length <= 2) return isimler.join(', ')
  return `${isimler.slice(0, 2).join(', ')} +${isimler.length - 2}`
}
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

const KAYNAK_TURLERI = [
  { id: 'yazi', etiket: 'Yazı', ikon: '📄' },
  { id: 'video', etiket: 'Video', ikon: '▶️' },
  { id: 'makale', etiket: 'Makale', ikon: '📰' },
  { id: 'kitap', etiket: 'Kitap', ikon: '📚' },
  { id: 'diger', etiket: 'Diğer', ikon: '🔗' },
]

function tarihSaatGoster(iso) {
  if (!iso) return 'Tarih belirlenmedi'
  const d = new Date(iso)
  return d.toLocaleString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

export default function GelecekEtkinlikKarti({ etkinlik }) {
  const { kullanici } = useAuth()
  const [katilacaklar, setKatilacaklar] = useState(etkinlik.katilacaklar || [])
  const [kulupIlerleme, setKulupIlerleme] = useState(null)
  const [canliKitapVerisi, setCanliKitapVerisi] = useState(null)
  const [kaynaklarAcik, setKaynaklarAcik] = useState(false)
  const [kaynakFormuAcik, setKaynakFormuAcik] = useState(false)
  const [kaynakTur, setKaynakTur] = useState('yazi')
  const [kaynakBaslik, setKaynakBaslik] = useState('')
  const [kaynakUrl, setKaynakUrl] = useState('')
  const [kitapArama, setKitapArama] = useState('')
  const [kitapSonuclari, setKitapSonuclari] = useState([])
  const [seciliKitap, setSeciliKitap] = useState(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  // Düzenleme modu
  const [duzenlemeAcik, setDuzenlemeAcik] = useState(false)
  const [dBaslik, setDBaslik] = useState(etkinlik.baslik)
  const [dAciklama, setDAciklama] = useState(etkinlik.aciklama || '')
  const [dTarih, setDTarih] = useState(etkinlik.tarih || '')
  const [dZoomLinki, setDZoomLinki] = useState(etkinlik.zoomLinki || '')
  const [dEserArama, setDEserArama] = useState('')
  const [dEserSonuclari, setDEserSonuclari] = useState([])
  const [dEserKategori, setDEserKategori] = useState('sinema')
  const [dEser, setDEser] = useState(
    etkinlik.eserBaslik
      ? {
          eserBaslik: etkinlik.eserBaslik,
          eserYil: etkinlik.eserYil,
          eserPosterUrl: etkinlik.eserPosterUrl,
          eserTur: etkinlik.eserTur,
          eserTmdbId: etkinlik.eserTmdbId,
          eserGoogleBooksId: etkinlik.eserGoogleBooksId,
          eserYazar: etkinlik.eserYazar,
          yonetmen: etkinlik.yonetmen,
          oyuncular: etkinlik.oyuncular,
        }
      : null
  )
  const [dKaydediliyor, setDKaydediliyor] = useState(false)

  const { kaynaklar, yenidenYukle } = useKaynaklar(etkinlik.id)
  const katiliyorMu = kullanici && katilacaklar.includes(kullanici.uid)
  const benimEtkinliğimMi = kullanici?.uid === etkinlik.olusturanId

  // Katılımcı avatarları — sadece isim/görsel gerektiğinden ilk birkaç kişiyi
  // çözüp geri kalanı "+N" olarak özetliyoruz, katılımcı sayısı ne olursa olsun
  // okuma maliyeti sabit kalsın diye.
  const GOSTERILECEK_AVATAR_SAYISI = 6
  const [katilimciProfilleri, setKatilimciProfilleri] = useState([])

  // Kulüp içi ilerleme/ortalama — sadece bu etkinliğin topluluğuna üye
  // kişiler arasında, o eser için "kaç kişi başladı / kulübün ortalama
  // puanı ne" (site geneli istatistiklerden bilerek ayrı).
  useEffect(() => {
    const eserTur = etkinlik.eserTur
    const eserDisId = etkinlik.eserTmdbId ?? etkinlik.eserGoogleBooksId
    if (!eserTur || !eserDisId || !etkinlik.topluluklId) return
    let iptal = false
    getDocs(collection(db, 'topluluklar', etkinlik.topluluklId, 'uyeler')).then((uyelerSnap) => {
      if (iptal) return
      const uyeUidleri = uyelerSnap.docs.map((d) => d.id)
      kulupIlerlemeGetir(uyeUidleri, eserTur, eserDisId).then((sonuc) => {
        if (!iptal) setKulupIlerleme(sonuc)
      })
    })
    return () => {
      iptal = true
    }
  }, [etkinlik.eserTur, etkinlik.eserTmdbId, etkinlik.eserGoogleBooksId, etkinlik.topluluklId])

  // Kitap bilgisi (poster/başlık) etkinlik oluşturulurken bir "anlık görüntü"
  // olarak kopyalanıyor — kitap sayfası SONRADAN düzenlenip kapak eklense
  // bile bu kopya güncellenmiyordu ("kapak eklendi ama kulüp kartına
  // gelmedi" sorununun kaynağı buydu). Kitap kendi Firestore koleksiyonumuzda
  // olduğu için ucuz bir canlı okuma ile her zaman GÜNCEL veriyi gösteriyoruz.
  useEffect(() => {
    if (etkinlik.eserTur !== 'kitap' || !etkinlik.eserGoogleBooksId) return
    let iptal = false
    getDoc(doc(db, 'kitaplar', etkinlik.eserGoogleBooksId)).then((snap) => {
      if (!iptal && snap.exists()) setCanliKitapVerisi(snap.data())
    })
    return () => {
      iptal = true
    }
  }, [etkinlik.eserTur, etkinlik.eserGoogleBooksId])

  useEffect(() => {
    let iptal = false
    const gosterilecekler = katilacaklar.slice(0, GOSTERILECEK_AVATAR_SAYISI)
    if (gosterilecekler.length === 0) {
      setKatilimciProfilleri([])
      return
    }
    Promise.all(
      gosterilecekler.map(async (uid) => {
        const snap = await getDoc(doc(db, 'kullanicilar', uid))
        return snap.exists() ? { id: uid, ...snap.data() } : { id: uid, adSoyad: 'Bilinmeyen' }
      })
    ).then((profiller) => {
      if (!iptal) setKatilimciProfilleri(profiller)
    })
    return () => {
      iptal = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [katilacaklar.join(',')])

  const yaziVideoMakaleKaynaklari = kaynaklar.filter((k) => k.tur !== 'kitap')
  const kitapKaynaklari = kaynaklar.filter((k) => k.tur === 'kitap')

  async function katilDegistir() {
    if (!kullanici) return
    const yeni = katiliyorMu ? katilacaklar.filter((u) => u !== kullanici.uid) : [...katilacaklar, kullanici.uid]
    setKatilacaklar(yeni)
    await katilacagimDegistir(etkinlik.id, kullanici.uid, katiliyorMu)
  }

  async function kaynakGonder(e) {
    e.preventDefault()
    if (!kullanici) return
    if (kaynakTur === 'kitap') {
      if (!seciliKitap) return
      setKaydediliyor(true)
      try {
        await kaynakEkle(etkinlik.id, {
          tur: 'kitap',
          baslik: seciliKitap.baslik,
          url: '',
          googleBooksId: seciliKitap.googleBooksId,
          yazar: seciliKitap.yazar,
          posterUrl: seciliKitap.posterUrl,
          kullanici,
        })
        setSeciliKitap(null)
        setKitapArama('')
        setKitapSonuclari([])
        setKaynakFormuAcik(false)
        yenidenYukle()
      } finally {
        setKaydediliyor(false)
      }
      return
    }
    if (!kaynakBaslik.trim() || !kaynakUrl.trim()) return
    setKaydediliyor(true)
    try {
      await kaynakEkle(etkinlik.id, { tur: kaynakTur, baslik: kaynakBaslik.trim(), url: kaynakUrl.trim(), kullanici })
      setKaynakBaslik('')
      setKaynakUrl('')
      setKaynakFormuAcik(false)
      yenidenYukle()
    } finally {
      setKaydediliyor(false)
    }
  }

  async function kitapAra(e) {
    e.preventDefault()
    if (!kitapArama.trim()) return
    const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(kitapArama)}&maxResults=8${anahtarParcasi}`
    const [icSonuclar, googleSonuc] = await Promise.all([
      kitapIcVeriTabanindaAra(kitapArama, 8),
      fetch(url)
        .then((res) => res.json())
        .then((data) => data.items || [])
        .catch(() => []),
    ])
    setKitapSonuclari([...icSonuclar.map((k) => ({ ...k, _kaynak: 'ic' })), ...googleSonuc])
  }

  async function kitapSec(item) {
    if (item._kaynak === 'ic') {
      const kayit = item.id?.startsWith('tr_') ? await turkceKitaptanKaydet(item) : item
      setSeciliKitap({
        googleBooksId: kayit.id,
        baslik: kayit.baslik || '',
        yazar: kayit.yazar || '',
        posterUrl: kayit.posterUrl || '',
      })
      return
    }
    const v = item.volumeInfo || {}
    setSeciliKitap({
      googleBooksId: item.id,
      baslik: v.title || '',
      yazar: (v.authors || []).join(', '),
      posterUrl: (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://'),
    })
  }

  async function dEserAra(e) {
    e.preventDefault()
    if (!dEserArama.trim()) return
    if (dEserKategori === 'kitap') {
      // KÖKTEN ÇÖZÜM: bu arama sadece Google Books'a gidiyordu, bizim iç
      // veritabanımıza (statik veri seti + canlı katalog) hiç bakmıyordu —
      // "aynı kitabın farklı edisyonu bulunamıyor" sorununun bir parçası.
      const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(dEserArama)}&maxResults=16${anahtarParcasi}`
      const [icSonuclar, googleSonuc] = await Promise.all([
        kitapIcVeriTabanindaAra(dEserArama, 10),
        fetch(url)
          .then((res) => res.json())
          .then((data) => data.items || [])
          .catch(() => []),
      ])
      setDEserSonuclari([...icSonuclar.map((k) => ({ ...k, _kaynak: 'ic' })), ...googleSonuc])
      return
    }
    if (!TMDB_API_KEY) return
    const uc = dEserKategori === 'sinema' ? 'movie' : 'tv'
    const url = `https://api.themoviedb.org/3/search/${uc}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(dEserArama)}`
    const res = await fetch(url)
    const data = await res.json()
    setDEserSonuclari(data.results || [])
  }

  async function dEserSec(item) {
    if (dEserKategori === 'kitap') {
      if (item._kaynak === 'ic') {
        const kayit = item.id?.startsWith('tr_') ? await turkceKitaptanKaydet(item) : item
        setDEser({
          eserTur: 'kitap',
          eserGoogleBooksId: kayit.id,
          eserBaslik: kayit.baslik || '',
          eserYazar: kayit.yazar || '',
          eserYil: kayit.yil || '',
          eserPosterUrl: kayit.posterUrl || '',
        })
        setDEserSonuclari([])
        setDEserArama('')
        return
      }
      const v = item.volumeInfo || {}
      setDEser({
        eserTur: 'kitap',
        eserGoogleBooksId: item.id,
        eserBaslik: v.title || '',
        eserYazar: (v.authors || []).join(', '),
        eserYil: (v.publishedDate || '').slice(0, 4),
        eserPosterUrl: (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://'),
      })
      setDEserSonuclari([])
      setDEserArama('')
      return
    }
    const baslik = dEserKategori === 'sinema' ? item.title : item.name
    const yil = (dEserKategori === 'sinema' ? item.release_date : item.first_air_date)?.slice(0, 4)
    const posterUrl = item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : ''
    let yonetmen = '', oyuncular = ''
    if (TMDB_API_KEY) {
      try {
        const uc = dEserKategori === 'sinema' ? 'movie' : 'tv'
        const url = `https://api.themoviedb.org/3/${uc}/${item.id}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=credits`
        const res = await fetch(url)
        const detay = await res.json()
        yonetmen =
          dEserKategori === 'sinema'
            ? (detay.credits?.crew || []).filter((k) => k.job === 'Director').map((k) => k.name).join(', ')
            : (detay.created_by || []).map((k) => k.name).join(', ')
        oyuncular = (detay.credits?.cast || []).slice(0, 5).map((k) => k.name).join(', ')
      } catch {
        // sessizce geç, temel bilgiler yine de kaydedilir
      }
    }
    setDEser({ eserTur: dEserKategori, eserTmdbId: item.id, eserBaslik: baslik, eserYil: yil, eserPosterUrl: posterUrl, yonetmen, oyuncular })
    setDEserSonuclari([])
    setDEserArama('')
  }

  async function duzenlemeyiKaydet(e) {
    e.preventDefault()
    setDKaydediliyor(true)
    try {
      await gelecekEtkinlikGuncelle(etkinlik.id, { baslik: dBaslik, aciklama: dAciklama, tarih: dTarih, eser: dEser, zoomLinki: dZoomLinki })
      etkinlik.baslik = dBaslik
      etkinlik.aciklama = dAciklama
      etkinlik.tarih = dTarih
      etkinlik.zoomLinki = dZoomLinki
      Object.assign(etkinlik, dEser)
      setDuzenlemeAcik(false)
    } finally {
      setDKaydediliyor(false)
    }
  }

  const eserSayfasiLinki =
    (etkinlik.eserTmdbId && (etkinlik.eserTur === 'dizi' ? `/dizi/${etkinlik.eserTmdbId}` : `/film/${etkinlik.eserTmdbId}`)) ||
    (etkinlik.eserGoogleBooksId && `/kitap/${etkinlik.eserGoogleBooksId}`)

  // Etkinlik geçtiyse ve bir eser bağlıysa, "bu eser hakkında günce yaz" CTA'sı
  // için GonderiEkle'nin zaten desteklediği ?tur=&disId= prefill'ini kullanıyoruz.
  const gectiMi = etkinlik.tarih && new Date(etkinlik.tarih).getTime() < Date.now()
  const gunceYazLinki =
    gectiMi &&
    (etkinlik.eserTmdbId
      ? `/gonderi-ekle?tur=${etkinlik.eserTur}&disId=${etkinlik.eserTmdbId}`
      : etkinlik.eserGoogleBooksId
      ? `/gonderi-ekle?tur=kitap&disId=${etkinlik.eserGoogleBooksId}`
      : null)

  return (
    <div className="rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          {(canliKitapVerisi?.posterUrl || etkinlik.eserPosterUrl) && (
            <img
              src={canliKitapVerisi?.posterUrl || etkinlik.eserPosterUrl}
              alt={etkinlik.eserBaslik}
              className="h-24 w-16 shrink-0 rounded-sm object-cover ring-1 ring-cizgi"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-govde text-sm text-murekkep">
              {etkinlik.baslik}
              {etkinlik.tekrarSeriId && <span title="Tekrarlayan etkinlik"> 🔁</span>}
            </p>
            {etkinlik.topluluklAd && (
              <Link to={`/topluluk/${etkinlik.topluluklId}`} className="text-[11px] text-deniz hover:underline">
                🏛 {etkinlik.topluluklAd}
              </Link>
            )}
            {etkinlik.eserBaslik && (
              <p className="text-xs text-kraft">
                {eserSayfasiLinki ? (
                  <Link to={eserSayfasiLinki} className="hover:underline">
                    {etkinlik.eserBaslik} {etkinlik.eserYil && `(${etkinlik.eserYil})`}
                  </Link>
                ) : (
                  <>
                    {etkinlik.eserBaslik} {etkinlik.eserYil && `(${etkinlik.eserYil})`}
                  </>
                )}
              </p>
            )}
            {(etkinlik.yonetmen || etkinlik.oyuncular) && (
              <p className="truncate text-[11px] text-kraft">
                {etkinlik.yonetmen}
                {etkinlik.yonetmen && etkinlik.oyuncular && ' · '}
                {oyuncuOzeti(etkinlik.oyuncular)}
              </p>
            )}
            {etkinlik.eserYazar && <p className="truncate text-[11px] text-kraft">{etkinlik.eserYazar}</p>}
            {kulupIlerleme && (kulupIlerleme.baslayanSayisi > 0 || kulupIlerleme.ortalamaPuan != null) && (
              <p className="text-[11px] text-deniz">
                {kulupIlerleme.baslayanSayisi > 0 && `👥 ${kulupIlerleme.baslayanSayisi} kişi başladı`}
                {kulupIlerleme.baslayanSayisi > 0 && kulupIlerleme.ortalamaPuan != null && ' · '}
                {kulupIlerleme.ortalamaPuan != null &&
                  `⭐ Kulüp ortalaması ${kulupIlerleme.ortalamaPuan.toFixed(1)} (${kulupIlerleme.puanlayanSayisi} puan)`}
              </p>
            )}
            <p className="text-xs text-kraft mt-0.5">{tarihSaatGoster(etkinlik.tarih)}</p>
            {etkinlik.aciklama && <p className="mt-1 text-xs text-murekkep/90">{etkinlik.aciklama}</p>}
            {etkinlik.instagramUrl && <MedyaGomulusu url={etkinlik.instagramUrl} paylasanAdi={etkinlik.olusturanAdi} />}
            {katilacaklar.length > 0 ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="flex -space-x-2">
                  {katilimciProfilleri.map((p) => (
                    <Link key={p.id} to={`/profil/${p.id}`} title={p.adSoyad}>
                      <Avatar adSoyad={p.adSoyad} avatarUrl={p.avatarUrl} boyut="h-6 w-6" />
                    </Link>
                  ))}
                </div>
                {katilacaklar.length > GOSTERILECEK_AVATAR_SAYISI && (
                  <span className="text-xs text-kraft">+{katilacaklar.length - GOSTERILECEK_AVATAR_SAYISI}</span>
                )}
              </div>
            ) : (
              <p className="mt-1 text-xs text-kraft">Henüz katılımcı yok</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {etkinlik.zoomLinki && !gectiMi && (
            <a
              href={etkinlik.zoomLinki}
              target="_blank"
              rel="noreferrer"
              className="rounded-sm bg-murekkep px-3 py-1.5 font-govde text-xs text-kagit"
            >
              🔗 Toplantıya Katıl
            </a>
          )}
          {gunceYazLinki && (
            <Link to={gunceYazLinki} className="rounded-sm bg-deniz px-3 py-1.5 font-govde text-xs text-kagit">
              ✎ Günce Yaz
            </Link>
          )}
          <button
            onClick={katilDegistir}
            disabled={!kullanici}
            className={`rounded-sm px-3 py-1.5 font-govde text-xs ${
              katiliyorMu ? 'bg-kagit text-kraft ring-1 ring-cizgi' : 'bg-muhur text-kagit'
            } disabled:opacity-40`}
          >
            {katiliyorMu ? 'Katılacaksın' : 'Katılacağım'}
          </button>
          {benimEtkinliğimMi && (
            <button onClick={() => setDuzenlemeAcik((a) => !a)} className="text-[11px] text-kraft hover:text-murekkep">
              {duzenlemeAcik ? 'Vazgeç' : 'Düzenle'}
            </button>
          )}
        </div>
      </div>

      {duzenlemeAcik && (
        <form onSubmit={duzenlemeyiKaydet} className="mt-3 space-y-2 border-t border-cizgi pt-3">
          <input
            type="text"
            value={dBaslik}
            onChange={(e) => setDBaslik(e.target.value)}
            className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
          />
          <input
            type="datetime-local"
            value={dTarih}
            onChange={(e) => setDTarih(e.target.value)}
            className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
          />
          <textarea
            value={dAciklama}
            onChange={(e) => setDAciklama(e.target.value)}
            rows={2}
            className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
          />
          <input
            type="text"
            value={dZoomLinki}
            onChange={(e) => setDZoomLinki(e.target.value)}
            placeholder="Zoom/Toplantı Linki (opsiyonel)"
            className="w-full rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
          />

          {dEser ? (
            <div className="flex items-center gap-2 rounded-sm bg-kagit p-2 ring-1 ring-cizgi">
              {dEser.eserPosterUrl && <img src={dEser.eserPosterUrl} alt="" className="h-12 w-8 rounded-sm object-cover" />}
              <p className="flex-1 text-xs text-murekkep">
                {dEser.eserBaslik} {dEser.eserYil && `(${dEser.eserYil})`}
                {dEser.eserYazar && ` — ${dEser.eserYazar}`}
              </p>
              <button type="button" onClick={() => setDEser(null)} className="text-[11px] text-kraft hover:text-muhur">
                Kaldır
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDEserKategori('sinema')}
                  className={`rounded-sm px-2 py-1 text-[11px] ${dEserKategori === 'sinema' ? 'bg-deniz text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
                >
                  Film
                </button>
                <button
                  type="button"
                  onClick={() => setDEserKategori('dizi')}
                  className={`rounded-sm px-2 py-1 text-[11px] ${dEserKategori === 'dizi' ? 'bg-deniz text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
                >
                  Dizi
                </button>
                <button
                  type="button"
                  onClick={() => setDEserKategori('kitap')}
                  className={`rounded-sm px-2 py-1 text-[11px] ${dEserKategori === 'kitap' ? 'bg-deniz text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'}`}
                >
                  Kitap
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={dEserArama}
                  onChange={(e) => setDEserArama(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      dEserAra(e)
                    }
                  }}
                  placeholder={dEserKategori === 'kitap' ? 'Kitap ara (opsiyonel)...' : 'Film/dizi ara (opsiyonel)...'}
                  className="flex-1 rounded-sm bg-kagit px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                />
                <button onClick={dEserAra} type="button" className="rounded-sm bg-deniz px-2 py-1 text-[11px] text-kagit">
                  Ara
                </button>
              </div>
              {dEserSonuclari.length > 0 && (
                <div className="grid grid-cols-5 gap-1">
                  {dEserSonuclari.slice(0, 10).map((item) => {
                    const posterUrl =
                      dEserKategori === 'kitap'
                        ? item._kaynak === 'ic'
                          ? item.posterUrl || ''
                          : (item.volumeInfo?.imageLinks?.thumbnail || '').replace('http://', 'https://')
                        : item.poster_path && `${TMDB_POSTER}${item.poster_path}`
                    const baslik =
                      dEserKategori === 'sinema'
                        ? item.title
                        : dEserKategori === 'dizi'
                          ? item.name
                          : item._kaynak === 'ic'
                            ? item.baslik
                            : item.volumeInfo?.title
                    return (
                      <button key={item.id} type="button" onClick={() => dEserSec(item)} className="text-left" title={baslik}>
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
            </div>
          )}

          <button
            type="submit"
            disabled={dKaydediliyor}
            className="rounded-sm bg-muhur px-3 py-1 font-govde text-[11px] text-kagit disabled:opacity-40"
          >
            {dKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </form>
      )}

      <button onClick={() => setKaynaklarAcik((a) => !a)} className="mt-3 text-xs text-deniz hover:underline">
        {kaynaklarAcik ? 'Kaynakları gizle' : `Bunlara göz at (${kaynaklar.length})`}
      </button>

      {kaynaklarAcik && (
        <div className="mt-2 space-y-3 border-t border-cizgi pt-3">
          {yaziVideoMakaleKaynaklari.length === 0 && kitapKaynaklari.length === 0 && (
            <p className="text-xs text-kraft">Henüz kaynak eklenmedi.</p>
          )}

          {yaziVideoMakaleKaynaklari.length > 0 && (
            <div className="space-y-1">
              {yaziVideoMakaleKaynaklari.map((k) => (
                <a key={k.id} href={k.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-murekkep hover:underline">
                  <span>{KAYNAK_TURLERI.find((t) => t.id === k.tur)?.ikon || '🔗'}</span>
                  {k.baslik}
                </a>
              ))}
            </div>
          )}

          {kitapKaynaklari.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-kraft mb-1">İlgili Kitaplar</p>
              <div className="flex flex-wrap gap-2">
                {kitapKaynaklari.map((k) => (
                  <div key={k.id} className="flex w-24 flex-col items-center text-center">
                    {k.posterUrl && <img src={k.posterUrl} alt={k.baslik} className="h-20 w-14 rounded-sm object-cover ring-1 ring-cizgi" />}
                    <p className="mt-1 text-[10px] text-murekkep leading-tight">{k.baslik}</p>
                    {k.yazar && <p className="text-[9px] text-kraft leading-tight">{k.yazar}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {kullanici && !kaynakFormuAcik && (
            <button onClick={() => setKaynakFormuAcik(true)} className="text-xs text-kraft hover:text-murekkep">
              + Kaynak Ekle
            </button>
          )}

          {kaynakFormuAcik && (
            <form onSubmit={kaynakGonder} className="space-y-2 rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
              <div className="flex flex-wrap gap-2">
                {KAYNAK_TURLERI.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setKaynakTur(t.id)
                      setSeciliKitap(null)
                    }}
                    className={`rounded-sm px-2 py-1 text-[11px] ${
                      kaynakTur === t.id ? 'bg-deniz text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
                    }`}
                  >
                    {t.ikon} {t.etiket}
                  </button>
                ))}
              </div>

              {kaynakTur === 'kitap' ? (
                seciliKitap ? (
                  <div className="flex items-center gap-2 rounded-sm bg-kagitKoyu p-2 ring-1 ring-cizgi">
                    {seciliKitap.posterUrl && <img src={seciliKitap.posterUrl} alt="" className="h-12 w-8 rounded-sm object-cover" />}
                    <p className="flex-1 text-xs text-murekkep">{seciliKitap.baslik}</p>
                    <button type="button" onClick={() => setSeciliKitap(null)} className="text-[11px] text-kraft hover:text-muhur">
                      Kaldır
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={kitapArama}
                        onChange={(e) => setKitapArama(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            kitapAra(e)
                          }
                        }}
                        placeholder="Kitap ara..."
                        className="flex-1 rounded-sm bg-kagitKoyu px-2 py-1 text-xs text-murekkep ring-1 ring-cizgi"
                      />
                      <button onClick={kitapAra} type="button" className="rounded-sm bg-deniz px-2 py-1 text-[11px] text-kagit">
                        Ara
                      </button>
                    </div>
                    {kitapSonuclari.length > 0 && (
                      <div className="grid grid-cols-5 gap-1">
                        {kitapSonuclari.map((item) => {
                          const url = item._kaynak === 'ic' ? item.posterUrl || '' : (item.volumeInfo?.imageLinks?.thumbnail || '').replace('http://', 'https://')
                          const baslik = item._kaynak === 'ic' ? item.baslik : item.volumeInfo?.title
                          return (
                            <button key={item.id} type="button" onClick={() => kitapSec(item)} className="text-left" title={baslik}>
                              <div className="flex aspect-[2/3] items-center justify-center overflow-hidden rounded-sm bg-kagitKoyu p-1 ring-1 ring-cizgi">
                                {url ? (
                                  <img src={url} alt="" className="h-full w-full object-cover" />
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
                )
              ) : (
                <>
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
                </>
              )}

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

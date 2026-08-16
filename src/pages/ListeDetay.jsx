import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useListeOgeleri } from '../hooks/useListeOgeleri.js'
import { uyeMi as uyelikKontrolEt } from '../hooks/useTopluluklar.js'
import { ogeEkle, listeGuncelle, listeSil } from '../utils/liste.js'
import ListeOgesi from '../components/ListeOgesi.jsx'

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500'
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

export default function ListeDetay() {
  const { topluluklId, listeId } = useParams()
  const { kullanici } = useAuth()
  const { ogeler, yukleniyor, hata, yenidenYukle } = useListeOgeleri(topluluklId, listeId)

  const [liste, setListe] = useState(null)
  const [topluluk, setTopluluk] = useState(null)
  const [uyeMi, setUyeMi] = useState(false)
  const [rolum, setRolum] = useState(null)

  const [formuAcik, setFormuAcik] = useState(false)
  const [kategori, setKategori] = useState('sinema')
  const [arama, setArama] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [aramaYukleniyor, setAramaYukleniyor] = useState(false)
  const [secili, setSecili] = useState(null)
  const [etkinlikTarihi, setEtkinlikTarihi] = useState('')
  const [ekleniyor, setEkleniyor] = useState(false)

  const [duzenlemeAcik, setDuzenlemeAcik] = useState(false)
  const [dBaslik, setDBaslik] = useState('')
  const [dAciklama, setDAciklama] = useState('')
  const [dKapakUrl, setDKapakUrl] = useState('')
  const [dKaydediliyor, setDKaydediliyor] = useState(false)

  useEffect(() => {
    let iptal = false
    async function getir() {
      const listeSnap = await getDoc(doc(db, 'topluluklar', topluluklId, 'listeler', listeId))
      if (iptal) return
      if (listeSnap.exists()) {
        const veri = listeSnap.data()
        setListe({ id: listeSnap.id, ...veri })
        setDBaslik(veri.baslik)
        setDAciklama(veri.aciklama || '')
        setDKapakUrl(veri.kapakUrl || '')
      }

      const topluklukSnap = await getDoc(doc(db, 'topluluklar', topluluklId))
      if (!iptal && topluklukSnap.exists()) setTopluluk({ id: topluklukSnap.id, ...topluklukSnap.data() })

      if (kullanici) {
        const [uyelik, uyelikBelgesi] = await Promise.all([
          uyelikKontrolEt(topluluklId, kullanici.uid),
          getDoc(doc(db, 'topluluklar', topluluklId, 'uyeler', kullanici.uid)),
        ])
        if (iptal) return
        setUyeMi(uyelik)
        setRolum(uyelikBelgesi.exists() ? uyelikBelgesi.data().rol : null)
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [topluluklId, listeId, kullanici])

  const yoneticiMiyim = kullanici && topluluk && (kullanici.uid === topluluk.kurucuId || rolum === 'moderator')

  // Eskiden burada, "sira" alanı eklendiğinde eski öğeleri onarmak için
  // yönetici her ziyaret ettiğinde OTOMATİK çalışan bir kontrol vardı — ama
  // bu, düzeltilecek bir şey kalmasa bile HER ZİYARETTE listenin tamamını
  // okuyordu (Blaze planında bu, gereksiz sürekli bir maliyet). Artık manuel
  // bir buton: sadece gerektiğinde, tek tıkla çalıştırılıyor (bkz. aşağıdaki
  // "sıraOnar" fonksiyonu ve "🔧 Sırayı Onar" butonu).
  const [siraOnariliyor, setSiraOnariliyor] = useState(false)
  async function siraOnar() {
    setSiraOnariliyor(true)
    try {
      const q = query(collection(db, 'listeOgeleri'), where('topluluklId', '==', topluluklId), where('listeId', '==', listeId))
      const snap = await getDocs(q)
      const eksikOlanlar = snap.docs.filter((d) => d.data().sira === undefined)
      if (eksikOlanlar.length === 0) {
        window.alert('Eksik sıra bulunamadı, hepsi zaten sıralı.')
        return
      }
      const mevcutSiralar = snap.docs.map((d) => d.data().sira).filter((s) => s !== undefined)
      const enYuksekSira = mevcutSiralar.length > 0 ? Math.max(...mevcutSiralar) : -1
      const siraliEksikler = [...eksikOlanlar].sort(
        (a, b) => (a.data().eklemeTarihi?.toMillis?.() || 0) - (b.data().eklemeTarihi?.toMillis?.() || 0)
      )
      await Promise.all(siraliEksikler.map((d, i) => updateDoc(d.ref, { sira: enYuksekSira + 1 + i })))
      yenidenYukle()
      window.alert(`${eksikOlanlar.length} öğenin sırası dolduruldu.`)
    } finally {
      setSiraOnariliyor(false)
    }
  }

  // Kendiliğinden onarım: "sira" alanı bu güncellemeden önce yoktu. Firestore'un
  // orderBy('sira') sorgusu, alanı hiç olmayan belgeleri sonuçtan tamamen düşürür
  // (null değil, YOK sayar) — yani eski öğeler useListeOgeleri'nden hiç dönmüyor
  // olabilir. Yönetici sayfayı ilk ziyaret ettiğinde, orderBy KULLANMADAN ham bir
  // sorguyla tüm öğeleri çekip eksik olanlara eklenme tarihine göre sıra atıyoruz.
  // Bir öğe zaten sira'ya sahipse dokunmuyoruz; hepsi doldurulunca bu bir daha
  // hiç çalışmaz (idempotent).

  async function ara(e) {
    e.preventDefault()
    if (!arama.trim()) return
    setAramaYukleniyor(true)
    setSonuclar([])
    try {
      if (kategori === 'sinema' || kategori === 'dizi') {
        if (!TMDB_API_KEY) return
        const uc = kategori === 'sinema' ? 'movie' : 'tv'
        const url = `https://api.themoviedb.org/3/search/${uc}?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(arama)}`
        const res = await fetch(url)
        const data = await res.json()
        setSonuclar(data.results || [])
      } else {
        const anahtarParcasi = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(arama)}&maxResults=10${anahtarParcasi}`
        const res = await fetch(url)
        const data = await res.json()
        setSonuclar(data.items || [])
      }
    } finally {
      setAramaYukleniyor(false)
    }
  }

  function sec(item) {
    if (kategori === 'sinema') {
      setSecili({
        tmdbId: item.id,
        baslik: item.title,
        yil: item.release_date ? item.release_date.slice(0, 4) : null,
        posterUrl: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '',
      })
    } else if (kategori === 'dizi') {
      setSecili({
        tmdbId: item.id,
        baslik: item.name,
        yil: item.first_air_date ? item.first_air_date.slice(0, 4) : null,
        posterUrl: item.poster_path ? `${TMDB_POSTER}${item.poster_path}` : '',
      })
    } else {
      const v = item.volumeInfo || {}
      setSecili({
        googleBooksId: item.id,
        baslik: v.title || '',
        yazar: (v.authors || []).join(', '),
        yil: v.publishedDate ? v.publishedDate.slice(0, 4) : null,
        posterUrl: (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://'),
      })
    }
  }

  async function ekle(e) {
    e.preventDefault()
    if (!secili || !kullanici) return
    setEkleniyor(true)
    try {
      await ogeEkle(
        topluluklId,
        listeId,
        { tur: kategori, ...secili, etkinlikTarihi: etkinlikTarihi || null, ekleyenId: kullanici.uid },
        kullanici,
        liste.ogeSayisi
      )
      setSecili(null)
      setArama('')
      setSonuclar([])
      setEtkinlikTarihi('')
      setFormuAcik(false)
      setListe((onceki) => ({ ...onceki, ogeSayisi: (onceki.ogeSayisi || 0) + 1 }))
      yenidenYukle()
    } finally {
      setEkleniyor(false)
    }
  }

  async function duzenlemeyiKaydet(e) {
    e.preventDefault()
    setDKaydediliyor(true)
    try {
      await listeGuncelle(topluluklId, listeId, { baslik: dBaslik.trim(), aciklama: dAciklama, kapakUrl: dKapakUrl })
      setListe((onceki) => ({ ...onceki, baslik: dBaslik.trim(), aciklama: dAciklama, kapakUrl: dKapakUrl }))
      setDuzenlemeAcik(false)
    } finally {
      setDKaydediliyor(false)
    }
  }

  async function listeyiSilTiklandi() {
    if (!window.confirm(`"${liste.baslik}" listesini kalıcı olarak silmek istediğine emin misin?`)) return
    await listeSil(topluluklId, listeId)
    window.location.href = `/topluluk/${topluluklId}`
  }

  if (!liste) return <p className="text-sm text-kraft">Yükleniyor...</p>

  const benTamamladiklarim = kullanici ? ogeler.filter((o) => (o.tamamlayanlar || []).includes(kullanici.uid)).length : 0

  return (
    <div>
      {liste.kapakUrl && (
        <div className="mb-4 h-40 w-full overflow-hidden rounded-sm ring-1 ring-cizgi">
          <img src={liste.kapakUrl} alt={liste.baslik} className="h-full w-full object-cover" />
        </div>
      )}

      <Link to={`/topluluk/${topluluklId}`} className="text-xs text-kraft hover:text-murekkep">
        ← {topluluk?.ad || 'Topluluğa dön'}
      </Link>

      <h1 className="font-baslik text-2xl text-murekkep mt-1">{liste.baslik}</h1>
      {liste.aciklama && <p className="mt-1 text-sm text-kraft">{liste.aciklama}</p>}
      <p className="mt-1 text-xs text-kraft">
        {liste.olusturanAdi && `${liste.olusturanAdi} tarafından oluşturuldu · `}
        {ogeler.length} eser
      </p>

      {kullanici && ogeler.length > 0 && (
        <div className="mt-3 max-w-xs">
          <div className="h-2 w-full overflow-hidden rounded-full bg-kagit ring-1 ring-cizgi">
            <div className="h-full bg-deniz" style={{ width: `${Math.round((benTamamladiklarim / ogeler.length) * 100)}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-kraft">
            {benTamamladiklarim}/{ogeler.length} tamamladın
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-3">
        {uyeMi && (
          <button onClick={() => setFormuAcik((a) => !a)} className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-sm text-kagit">
            {formuAcik ? 'Vazgeç' : '+ Eser Ekle'}
          </button>
        )}
        {(kullanici?.uid === liste.olusturanId || yoneticiMiyim) && (
          <>
            <button
              onClick={() => setDuzenlemeAcik((a) => !a)}
              className="rounded-sm bg-kagitKoyu px-3 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi"
            >
              {duzenlemeAcik ? 'Vazgeç' : 'Listeyi Düzenle'}
            </button>
            <button onClick={listeyiSilTiklandi} className="rounded-sm px-3 py-1.5 font-govde text-xs text-kraft hover:text-muhur">
              Listeyi Sil
            </button>
            <button
              onClick={siraOnar}
              disabled={siraOnariliyor}
              title="Eski öğelerde sıra numarası eksikse doldurur — normalde gerek duymazsın"
              className="rounded-sm px-3 py-1.5 font-govde text-xs text-kraft hover:text-deniz disabled:opacity-40"
            >
              {siraOnariliyor ? 'Kontrol ediliyor...' : '🔧 Sırayı Onar'}
            </button>
          </>
        )}
      </div>

      {duzenlemeAcik && (
        <form onSubmit={duzenlemeyiKaydet} className="mt-3 max-w-sm space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <div>
            <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Liste Başlığı</label>
            <input
              type="text"
              value={dBaslik}
              onChange={(e) => setDBaslik(e.target.value)}
              className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
            />
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

      {formuAcik && (
        <div className="mt-4 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <div className="flex gap-2">
            {[
              { id: 'sinema', etiket: 'Film' },
              { id: 'dizi', etiket: 'Dizi' },
              { id: 'kitap', etiket: 'Kitap' },
            ].map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => {
                  setKategori(k.id)
                  setSecili(null)
                  setSonuclar([])
                }}
                className={`rounded-sm px-3 py-1 font-govde text-xs ${
                  kategori === k.id ? 'bg-murekkep text-kagit' : 'bg-kagit text-kraft ring-1 ring-cizgi'
                }`}
              >
                {k.etiket}
              </button>
            ))}
          </div>

          {!secili ? (
            <>
              <form onSubmit={ara} className="flex gap-2">
                <input
                  type="text"
                  value={arama}
                  onChange={(e) => setArama(e.target.value)}
                  placeholder="Ara..."
                  className="flex-1 rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
                <button type="submit" className="rounded-sm bg-deniz px-3 py-2 font-govde text-xs text-kagit">
                  {aramaYukleniyor ? 'Aranıyor...' : 'Ara'}
                </button>
              </form>
              {sonuclar.length > 0 && (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {sonuclar.slice(0, 12).map((item) => {
                    const ad = kategori === 'sinema' ? item.title : kategori === 'dizi' ? item.name : item.volumeInfo?.title
                    const url =
                      kategori === 'kitap'
                        ? (item.volumeInfo?.imageLinks?.thumbnail || '').replace('http://', 'https://')
                        : item.poster_path
                          ? `${TMDB_POSTER}${item.poster_path}`
                          : ''
                    return (
                      <button key={item.id} type="button" onClick={() => sec(item)} className="text-left">
                        <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi">
                          {url && <img src={url} alt={ad} className="h-full w-full object-cover" />}
                        </div>
                        <p className="mt-1 truncate text-[11px] text-murekkep">{ad}</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={ekle} className="space-y-3">
              <div className="flex items-center gap-3">
                {secili.posterUrl && <img src={secili.posterUrl} alt={secili.baslik} className="h-16 w-11 rounded-sm object-cover" />}
                <div className="flex-1">
                  <p className="text-sm text-murekkep">{secili.baslik}</p>
                  <button type="button" onClick={() => setSecili(null)} className="text-xs text-kraft hover:text-muhur">
                    Değiştir
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">
                  Kapak/Afiş URL {!secili.posterUrl && '(bulunamadı, elle ekleyebilirsin)'}
                </label>
                <input
                  type="text"
                  value={secili.posterUrl || ''}
                  onChange={(e) => setSecili((onceki) => ({ ...onceki, posterUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Etkinlik Tarihi (opsiyonel)</label>
                <input
                  type="date"
                  value={etkinlikTarihi}
                  onChange={(e) => setEtkinlikTarihi(e.target.value)}
                  className="rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <button
                type="submit"
                disabled={ekleniyor}
                className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
              >
                {ekleniyor ? 'Ekleniyor...' : 'Listeye Ekle'}
              </button>
            </form>
          )}
        </div>
      )}

      <div className="defter-cizgi my-6" />

      {yukleniyor && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {hata && (
        <p className="text-sm text-muhur">
          Eserler yüklenemedi: {hata}
          {hata.includes('index') && ' — F12 konsolundaki linke tıklayarak indeksi oluşturabilirsin.'}
        </p>
      )}
      {!yukleniyor && !hata && ogeler.length === 0 && <p className="text-sm text-kraft">Bu listede henüz eser yok.</p>}

      <div className="space-y-2">
        {ogeler.map((oge, i) => (
          <ListeOgesi
            key={oge.id}
            topluluklId={topluluklId}
            listeId={listeId}
            oge={oge}
            sirano={i + 1}
            uyeMi={uyeMi}
            yoneticiMiyim={yoneticiMiyim}
            oncekiOge={i > 0 ? ogeler[i - 1] : null}
            sonrakiOge={i < ogeler.length - 1 ? ogeler[i + 1] : null}
            onDegisti={yenidenYukle}
          />
        ))}
      </div>
    </div>
  )
}

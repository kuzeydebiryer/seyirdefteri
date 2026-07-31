import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { begeniDegistir } from '../utils/begeni.js'
import { useTartismaEtkinlikleri } from '../hooks/useTartismaEtkinlikleri.js'
import YildizPuan from '../components/YildizPuan.jsx'
import EtkinlikKarti from '../components/EtkinlikKarti.jsx'
import GonderiIcerik from '../components/GonderiIcerik.jsx'

function tarihGoster(deger) {
  if (!deger) return ''
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function GonderiDetay() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { kullanici, profil } = useAuth()
  const [siliniyor, setSiliniyor] = useState(false)
  const { etkinlikler, yenidenYukle } = useTartismaEtkinlikleri({ gonderiId: id })
  const [etkinlikFormuAcik, setEtkinlikFormuAcik] = useState(false)
  const [etkinlikTarihi, setEtkinlikTarihi] = useState('')
  const [etkinlikAciklama, setEtkinlikAciklama] = useState('')
  const [etkinlikKaydediliyor, setEtkinlikKaydediliyor] = useState(false)

  const [gonderi, setGonderi] = useState(null)
  const [yorumlar, setYorumlar] = useState([])
  const [yeniYorum, setYeniYorum] = useState('')
  const [yukleniyor, setYukleniyor] = useState(true)
  const [gonderiliyor, setGonderiliyor] = useState(false)

  useEffect(() => {
    let iptal = false
    async function getir() {
      const snap = await getDoc(doc(db, 'gonderiler', id))
      if (!iptal && snap.exists()) setGonderi({ id: snap.id, ...snap.data() })

      const yq = query(collection(db, 'gonderiler', id, 'yorumlar'), orderBy('tarih', 'asc'))
      const ysnap = await getDocs(yq)
      if (!iptal) setYorumlar(ysnap.docs.map((d) => ({ id: d.id, ...d.data() })))
      if (!iptal) setYukleniyor(false)
    }
    getir()
    return () => {
      iptal = true
    }
  }, [id])

  async function begenTiklandi() {
    if (!kullanici || !gonderi) return
    const suAnBegeniyorMu = (gonderi.begenenler || []).includes(kullanici.uid)
    const yeni = suAnBegeniyorMu
      ? gonderi.begenenler.filter((u) => u !== kullanici.uid)
      : [...(gonderi.begenenler || []), kullanici.uid]
    setGonderi({ ...gonderi, begenenler: yeni })
    await begeniDegistir(gonderi.id, kullanici.uid, suAnBegeniyorMu)
  }

  async function yorumGonder(e) {
    e.preventDefault()
    if (!yeniYorum.trim() || !kullanici) return
    setGonderiliyor(true)
    try {
      const yeniYorumRef = await addDoc(collection(db, 'gonderiler', id, 'yorumlar'), {
        yazarId: kullanici.uid,
        yazarAdi: profil?.adSoyad || kullanici.displayName || 'İsimsiz',
        metin: yeniYorum.trim(),
        tarih: serverTimestamp(),
      })
      await updateDoc(doc(db, 'gonderiler', id), { yorumSayisi: increment(1) })
      setYorumlar((onceki) => [...onceki, { id: yeniYorumRef.id, yazarAdi: profil?.adSoyad, metin: yeniYorum.trim() }])
      setYeniYorum('')
    } finally {
      setGonderiliyor(false)
    }
  }

  async function gonderiyiSil() {
    if (!window.confirm('Bu güncenizi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return
    setSiliniyor(true)
    try {
      await deleteDoc(doc(db, 'gonderiler', id))
      navigate(`/profil/${kullanici.uid}`)
    } catch (err) {
      alert('Silinemedi: ' + err.message)
      setSiliniyor(false)
    }
  }

  async function etkinlikOlustur(e) {
    e.preventDefault()
    if (!etkinlikTarihi || !kullanici || !gonderi) return
    setEtkinlikKaydediliyor(true)
    try {
      await addDoc(collection(db, 'tartismaEtkinlikleri'), {
        baslik: `${gonderi.baslik} hakkında konuşalım`,
        gonderiId: gonderi.id,
        gonderiBasligi: gonderi.baslik,
        gonderiTuru: gonderi.tur,
        topluluklId: null,
        olusturanId: kullanici.uid,
        olusturanAdi: profil?.adSoyad || kullanici.displayName || 'İsimsiz',
        tarih: etkinlikTarihi,
        aciklama: etkinlikAciklama,
        olusturmaTarihi: serverTimestamp(),
        katilimcilar: [kullanici.uid],
      })
      setEtkinlikTarihi('')
      setEtkinlikAciklama('')
      setEtkinlikFormuAcik(false)
      yenidenYukle()
    } finally {
      setEtkinlikKaydediliyor(false)
    }
  }

  if (yukleniyor) return <p className="text-kraft text-sm">Yükleniyor...</p>
  if (!gonderi) return <p className="text-kraft text-sm">Günce bulunamadı.</p>

  const benBegendimMi = kullanici && (gonderi.begenenler || []).includes(kullanici.uid)

  return (
    <div>
      <div className="flex items-start justify-between">
        <div className="flex gap-5">
          {(gonderi.posterUrl || gonderi.ilgiliPosterUrl) && (
            <img
              src={gonderi.posterUrl || gonderi.ilgiliPosterUrl}
              alt={gonderi.baslik}
              className="h-44 w-32 rounded-sm object-cover ring-1 ring-cizgi"
            />
          )}
          <div>
            <div className="flex items-center gap-2 text-xs text-kraft">
              <Link to={`/profil/${gonderi.yazarId}`} className="font-medium text-murekkep hover:underline">
                {gonderi.yazarAdi}
              </Link>
              <span>·</span>
              <span>{tarihGoster(gonderi.tarih)}</span>
            </div>
            <h1 className="font-baslik text-2xl text-murekkep mt-1">
              {gonderi.baslik} {gonderi.yil && <span className="text-kraft text-lg">({gonderi.yil})</span>}
            </h1>
            {gonderi.tur === 'kitap' && gonderi.yazar && <p className="text-sm text-kraft">{gonderi.yazar}</p>}
            {gonderi.tur === 'yazi' && (
              <p className="text-xs uppercase tracking-widest text-deniz">
                {{ deneme: 'Deneme', 'film-incelemesi': 'Film İncelemesi', 'kitap-incelemesi': 'Kitap İncelemesi' }[gonderi.altTur]}
              </p>
            )}
            {gonderi.tur === 'yazi' && gonderi.ilgiliBaslik && (
              <p className="text-sm text-kraft">
                {gonderi.ilgiliBaslik} {gonderi.ilgiliYil && `(${gonderi.ilgiliYil})`}
                {gonderi.ilgiliYazar && ` · ${gonderi.ilgiliYazar}`}
              </p>
            )}
            {(gonderi.tur === 'gezi' || gonderi.tur === 'etkinlik') && (
              <p className="text-sm text-kraft">
                {gonderi.tur === 'etkinlik' && gonderi.turler && `${gonderi.turler} · `}
                {gonderi.konum}
                {gonderi.etkinlikTarihi && ` · ${new Date(gonderi.etkinlikTarihi).toLocaleDateString('tr-TR')}`}
              </p>
            )}

            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-kraft">
              {gonderi.turler && <span>{gonderi.turler}</span>}
              {gonderi.tur === 'sinema' && gonderi.sureDk && <span>⏱ {gonderi.sureDk} dk</span>}
              {gonderi.tur === 'dizi' && gonderi.sezonSayisi && <span>📺 {gonderi.sezonSayisi} sezon</span>}
              {gonderi.tur === 'dizi' && gonderi.bolumSayisi && <span>{gonderi.bolumSayisi} bölüm</span>}
              {gonderi.tur === 'kitap' && gonderi.sayfaSayisi && <span>📄 {gonderi.sayfaSayisi} sayfa</span>}
              {gonderi.tur === 'kitap' && gonderi.yayinevi && <span>{gonderi.yayinevi}</span>}
              {gonderi.dbPuan && <span>{gonderi.tur === 'kitap' ? 'Google' : 'TMDB'} {gonderi.dbPuan}</span>}
            </div>

            {(gonderi.tur === 'sinema' || gonderi.tur === 'dizi') && gonderi.yonetmen && (
              <p className="mt-1 text-xs text-murekkep">
                <span className="text-kraft">{gonderi.tur === 'dizi' ? 'Yaratıcı: ' : 'Yönetmen: '}</span>
                {gonderi.yonetmenListesi?.length > 0
                  ? gonderi.yonetmenListesi.map((k, i) => (
                      <span key={k.id}>
                        <Link to={`/kisi/${k.id}`} className="hover:underline hover:text-deniz">
                          {k.name}
                        </Link>
                        {i < gonderi.yonetmenListesi.length - 1 && ', '}
                      </span>
                    ))
                  : gonderi.yonetmen}
              </p>
            )}
            {(gonderi.tur === 'sinema' || gonderi.tur === 'dizi') && gonderi.oyuncular && (
              <p className="text-xs text-murekkep">
                <span className="text-kraft">Oyuncular: </span>
                {gonderi.oyuncularListesi?.length > 0
                  ? gonderi.oyuncularListesi.map((k, i) => (
                      <span key={k.id}>
                        <Link to={`/kisi/${k.id}`} className="hover:underline hover:text-deniz">
                          {k.name}
                        </Link>
                        {i < gonderi.oyuncularListesi.length - 1 && ', '}
                      </span>
                    ))
                  : gonderi.oyuncular}
              </p>
            )}

            {gonderi.kullaniciPuani && (
              <div className="mt-2">
                <YildizPuan puan={gonderi.kullaniciPuani} />
              </div>
            )}

            {(gonderi.tmdbId || gonderi.googleBooksId) && (
              <Link
                to={`/${gonderi.tur === 'kitap' ? 'kitap' : gonderi.tur === 'dizi' ? 'dizi' : 'film'}/${gonderi.tmdbId || gonderi.googleBooksId}`}
                className="mt-2 inline-block text-xs text-deniz hover:underline"
              >
                Bu {gonderi.tur === 'kitap' ? 'kitabın' : gonderi.tur === 'dizi' ? 'dizinin' : 'filmin'} sayfasına git
                (topluluk ortalamasını gör) →
              </Link>
            )}
          </div>
        </div>

        {kullanici?.uid === gonderi.yazarId && (
          <button
            onClick={gonderiyiSil}
            disabled={siliniyor}
            className="shrink-0 text-xs text-kraft hover:text-muhur disabled:opacity-40"
          >
            {siliniyor ? 'Siliniyor...' : 'Sil'}
          </button>
        )}
      </div>

      {gonderi.ozet && <p className="mt-4 text-xs text-kraft leading-relaxed">{gonderi.ozet}</p>}

      {gonderi.gunce && (
        <div className="mt-4">
          <GonderiIcerik metin={gonderi.gunce} tam={true} />
        </div>
      )}

      <button
        onClick={begenTiklandi}
        disabled={!kullanici}
        className={`mt-4 text-sm ${benBegendimMi ? 'text-muhur font-medium' : 'text-kraft hover:text-murekkep'}`}
      >
        {benBegendimMi ? '♥ Beğenildi' : '♡ Beğen'} {gonderi.begenenler?.length > 0 && `(${gonderi.begenenler.length})`}
      </button>

      <div className="defter-cizgi my-6" />

      {(gonderi.tur === 'sinema' || gonderi.tur === 'dizi' || gonderi.tur === 'kitap') && (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-baslik text-lg text-murekkep">
                Bu {gonderi.tur === 'kitap' ? 'kitap' : gonderi.tur === 'dizi' ? 'dizi' : 'film'} hakkında konuşalım
              </h2>
              {kullanici && (
                <button
                  onClick={() => setEtkinlikFormuAcik((a) => !a)}
                  className="rounded-sm bg-kagitKoyu px-3 py-1 font-govde text-xs text-kraft ring-1 ring-cizgi"
                >
                  {etkinlikFormuAcik ? 'Vazgeç' : '+ Etkinlik Oluştur'}
                </button>
              )}
            </div>

            {etkinlikFormuAcik && (
              <form onSubmit={etkinlikOlustur} className="mb-4 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
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
                  <label className="block text-xs uppercase tracking-widest text-kraft mb-1">
                    Açıklama (buluşma linki vb.)
                  </label>
                  <textarea
                    value={etkinlikAciklama}
                    onChange={(e) => setEtkinlikAciklama(e.target.value)}
                    rows={2}
                    className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                  />
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

            <div className="space-y-3">
              {etkinlikler.map((e) => (
                <EtkinlikKarti key={e.id} etkinlik={e} />
              ))}
              {etkinlikler.length === 0 && !etkinlikFormuAcik && (
                <p className="text-sm text-kraft">Henüz bir tartışma etkinliği yok. İlkini sen oluşturabilirsin.</p>
              )}
            </div>
          </div>

          <div className="defter-cizgi my-6" />
        </>
      )}

      <h2 className="font-baslik text-lg text-murekkep mb-3">Yorumlar</h2>
      <ul className="space-y-3 mb-6">
        {yorumlar.map((y) => (
          <li key={y.id} className="text-sm">
            <span className="font-medium text-murekkep">{y.yazarAdi}</span>{' '}
            <span className="text-murekkep/90">{y.metin}</span>
          </li>
        ))}
        {yorumlar.length === 0 && <p className="text-sm text-kraft">Henüz yorum yok.</p>}
      </ul>

      <form onSubmit={yorumGonder} className="flex gap-2">
        <input
          type="text"
          value={yeniYorum}
          onChange={(e) => setYeniYorum(e.target.value)}
          placeholder={kullanici ? 'Bir yorum yaz...' : 'Yorum yapmak için giriş yap'}
          disabled={!kullanici}
          className="flex-1 rounded-sm bg-kagitKoyu px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
        />
        <button
          type="submit"
          disabled={!kullanici || gonderiliyor}
          className="rounded-sm bg-muhur px-4 py-2 font-govde text-sm text-kagit disabled:opacity-40"
        >
          Gönder
        </button>
      </form>
    </div>
  )
}

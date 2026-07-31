import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useGonderiler } from '../hooks/useGonderiler.js'
import { useTakip } from '../hooks/useTakip.js'
import { useFavoriler } from '../hooks/useFavoriler.js'
import { useIzlenecekler } from '../hooks/useIzlenecekler.js'
import { useYorumlarim } from '../hooks/useYorumlarim.js'
import { useRaflar } from '../hooks/useRaflar.js'
import { rafOlustur, rafSil } from '../utils/raf.js'
import { takipEt, takipBirak } from '../utils/takip.js'
import { favoriKaldir } from '../utils/favori.js'
import { izlenecekKaldir } from '../utils/izlenecek.js'
import { uretDavetKodu } from '../utils/davetKodu.js'
import GonderiKarti from '../components/GonderiKarti.jsx'
import Avatar from '../components/Avatar.jsx'

const FAVORI_TURLERI = [
  { id: 'sinema', etiket: 'Filmler' },
  { id: 'dizi', etiket: 'Diziler' },
  { id: 'kitap', etiket: 'Kitaplar' },
  { id: 'yazar', etiket: 'Yazarlar' },
  { id: 'kisi', etiket: 'Oyuncular/Yönetmenler' },
]

function esereLink(tur, disId) {
  if (tur === 'kisi') return `/kisi/${disId}`
  if (tur === 'yazar') return `/yazar/${disId}`
  if (tur === 'kitap') return `/kitap/${disId}`
  if (tur === 'dizi') return `/dizi/${disId}`
  return `/film/${disId}`
}

function PosterKart({ baslik, alt, posterUrl, link }) {
  return (
    <Link to={link} className="block">
      <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
        {posterUrl && <img src={posterUrl} alt={baslik} className="h-full w-full object-cover" />}
      </div>
      <p className="mt-1 truncate text-xs text-murekkep">{baslik}</p>
      {alt && <p className="truncate text-[11px] text-kraft">{alt}</p>}
    </Link>
  )
}

export default function Profil() {
  const { uid } = useParams()
  const { kullanici, profil: kendiProfilim, profilGuncelle } = useAuth()
  const benimProfilimMi = kullanici?.uid === uid

  const [hedefProfil, setHedefProfil] = useState(benimProfilimMi ? kendiProfilim : null)
  const { gonderiler, hata: gonderilerHatasi } = useGonderiler({ yazarId: uid })
  const { takipEdiyorMu, setTakipEdiyorMu, takipciSayisi, takipEdilenSayisi } = useTakip(uid, kullanici?.uid)
  const [takipIsleniyor, setTakipIsleniyor] = useState(false)

  const [sekme, setSekme] = useState('izlediklerim')
  const [favoriSekmesi, setFavoriSekmesi] = useState('sinema')
  const { favoriler, yenidenYukle: favorileriYenile } = useFavoriler(uid, favoriSekmesi)
  const { izlenecekler, yenidenYukle: izlenecekleriYenile } = useIzlenecekler(uid)
  const { raflar, yenidenYukle: raflariYenile } = useRaflar(uid)
  const [rafFormuAcik, setRafFormuAcik] = useState(false)
  const [rafBaslik, setRafBaslik] = useState('')
  const [rafAciklama, setRafAciklama] = useState('')
  const [rafKaydediliyor, setRafKaydediliyor] = useState(false)
  const { yorumlar: yorumlarim } = useYorumlarim(uid)

  const [davetKodlari, setDavetKodlari] = useState([])
  const [uretiliyor, setUretiliyor] = useState(false)

  const [duzenlemeAcik, setDuzenlemeAcik] = useState(false)
  const [bioTaslak, setBioTaslak] = useState('')
  const [avatarTaslak, setAvatarTaslak] = useState('')
  const [hedefTaslak, setHedefTaslak] = useState(0)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  useEffect(() => {
    if (benimProfilimMi) {
      setHedefProfil(kendiProfilim)
      return
    }
    getDoc(doc(db, 'kullanicilar', uid)).then((snap) => {
      if (snap.exists()) setHedefProfil({ id: uid, ...snap.data() })
    })
  }, [uid, benimProfilimMi, kendiProfilim])

  useEffect(() => {
    if (!benimProfilimMi) return
    const q = query(collection(db, 'davetKodlari'), where('olusturanId', '==', uid))
    getDocs(q).then((snap) => setDavetKodlari(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [uid, benimProfilimMi, uretiliyor])

  useEffect(() => {
    if (hedefProfil && benimProfilimMi) {
      setBioTaslak(hedefProfil.bio || '')
      setAvatarTaslak(hedefProfil.avatarUrl || '')
      setHedefTaslak(hedefProfil.yillikOkumaHedefi || 0)
    }
  }, [hedefProfil, benimProfilimMi])

  async function profiliKaydet(e) {
    e.preventDefault()
    setKaydediliyor(true)
    try {
      await profilGuncelle({ bio: bioTaslak, avatarUrl: avatarTaslak, yillikOkumaHedefi: Number(hedefTaslak) || 0 })
      setHedefProfil((onceki) => ({ ...onceki, bio: bioTaslak, avatarUrl: avatarTaslak, yillikOkumaHedefi: Number(hedefTaslak) || 0 }))
      setDuzenlemeAcik(false)
    } finally {
      setKaydediliyor(false)
    }
  }

  async function takipDegistir() {
    if (!kullanici || takipIsleniyor) return
    setTakipIsleniyor(true)
    try {
      if (takipEdiyorMu) {
        await takipBirak(kullanici.uid, uid)
      } else {
        await takipEt(kullanici.uid, uid)
      }
      setTakipEdiyorMu(!takipEdiyorMu)
    } finally {
      setTakipIsleniyor(false)
    }
  }

  async function davetKoduOlustur() {
    if (!hedefProfil || hedefProfil.kalanDavetHakki <= 0) return
    setUretiliyor(true)
    try {
      const kod = uretDavetKodu()
      await setDoc(doc(db, 'davetKodlari', kod), {
        olusturanId: kullanici.uid,
        kullanildiMi: false,
        olusturmaTarihi: serverTimestamp(),
      })
      await updateDoc(doc(db, 'kullanicilar', kullanici.uid), {
        kalanDavetHakki: hedefProfil.kalanDavetHakki - 1,
      })
      setHedefProfil({ ...hedefProfil, kalanDavetHakki: hedefProfil.kalanDavetHakki - 1 })
    } finally {
      setUretiliyor(false)
    }
  }

  async function favoriSil(f) {
    await favoriKaldir(uid, f.tur, f.disId)
    favorileriYenile()
  }

  async function izlenecekSil(i) {
    await izlenecekKaldir(uid, i.tur, i.disId)
    izlenecekleriYenile()
  }

  if (!hedefProfil) return <p className="text-kraft text-sm">Yükleniyor...</p>

  const SEKMELER = [
    { id: 'izlediklerim', etiket: 'İzlediklerim' },
    { id: 'suanda', etiket: 'Şu An Okuduklarım' },
    { id: 'izleyecegim', etiket: 'İzleyeceklerim' },
    { id: 'favoriler', etiket: 'Favoriler' },
    { id: 'raflarim', etiket: 'Raflarım' },
    { id: 'yorumlarim', etiket: 'Yorumlarım' },
  ]

  async function rafOlusturTiklandi(e) {
    e.preventDefault()
    if (!rafBaslik.trim() || !kullanici) return
    setRafKaydediliyor(true)
    try {
      await rafOlustur(kullanici, rafBaslik.trim(), rafAciklama)
      setRafBaslik('')
      setRafAciklama('')
      setRafFormuAcik(false)
      raflariYenile()
    } finally {
      setRafKaydediliyor(false)
    }
  }

  async function rafiSil(rafId) {
    if (!window.confirm('Bu rafı silmek istediğine emin misin?')) return
    await rafSil(rafId)
    raflariYenile()
  }

  return (
    <div>
      <div className="mb-6 flex items-start gap-4">
        <Avatar adSoyad={hedefProfil.adSoyad} avatarUrl={hedefProfil.avatarUrl} boyut="h-16 w-16" />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-baslik text-2xl text-murekkep">{hedefProfil.adSoyad}</h1>
            {benimProfilimMi && (
              <button
                onClick={() => setDuzenlemeAcik((a) => !a)}
                className="rounded-sm bg-kagitKoyu px-2 py-1 font-govde text-xs text-kraft ring-1 ring-cizgi"
              >
                {duzenlemeAcik ? 'Vazgeç' : 'Profili Düzenle'}
              </button>
            )}
            <Link to="/kullanicilar" className="text-xs text-deniz hover:underline">
              Kişileri Keşfet →
            </Link>
          </div>
          <p className="text-sm text-kraft">@{hedefProfil.kullaniciAdi}</p>
          {!duzenlemeAcik && hedefProfil.bio && <p className="mt-2 text-sm text-murekkep">{hedefProfil.bio}</p>}

          {duzenlemeAcik && (
            <form onSubmit={profiliKaydet} className="mt-3 space-y-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
              <div>
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Avatar Görsel URL</label>
                <input
                  type="text"
                  value={avatarTaslak}
                  onChange={(e) => setAvatarTaslak(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">Bio</label>
                <textarea
                  value={bioTaslak}
                  onChange={(e) => setBioTaslak(e.target.value)}
                  rows={3}
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-kraft mb-1">
                  Yıllık Okuma Hedefi (kitap sayısı)
                </label>
                <input
                  type="number"
                  min="0"
                  value={hedefTaslak}
                  onChange={(e) => setHedefTaslak(e.target.value)}
                  className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
                />
              </div>
              <button
                type="submit"
                disabled={kaydediliyor}
                className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
              >
                {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </form>
          )}

          <div className="mt-3 flex items-center gap-4">
            <p className="text-xs text-kraft">
              <span className="font-medium text-murekkep">{takipEdilenSayisi}</span> takip ·{' '}
              <span className="font-medium text-murekkep">{takipciSayisi}</span> takipçi
            </p>
            {!benimProfilimMi && (
              <button
                onClick={takipDegistir}
                disabled={takipIsleniyor}
                className={`rounded-sm px-3 py-1 font-govde text-xs ${
                  takipEdiyorMu ? 'bg-kagitKoyu text-kraft ring-1 ring-cizgi' : 'bg-muhur text-kagit'
                } disabled:opacity-40`}
              >
                {takipEdiyorMu ? 'Takip Ediliyor' : 'Takip Et'}
              </button>
            )}
          </div>
        </div>
      </div>

      {benimProfilimMi && (
        <div className="mb-8 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
          <div className="flex items-center justify-between">
            <p className="text-sm text-murekkep">
              Kalan davet hakkın: <span className="font-medium">{hedefProfil.kalanDavetHakki}</span>
            </p>
            <button
              onClick={davetKoduOlustur}
              disabled={hedefProfil.kalanDavetHakki <= 0 || uretiliyor}
              className="rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
            >
              {uretiliyor ? 'Oluşturuluyor...' : 'Davet Kodu Oluştur'}
            </button>
          </div>
          {davetKodlari.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-kraft">
              {davetKodlari.map((k) => (
                <li key={k.id} className="flex items-center justify-between">
                  <span className="font-mono tracking-widest text-murekkep">{k.id}</span>
                  <span>{k.kullanildiMi ? 'Kullanıldı' : 'Kullanılmadı'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Sekmeler */}
      <div className="mb-6 flex flex-wrap gap-2">
        {SEKMELER.map((s) => (
          <button
            key={s.id}
            onClick={() => setSekme(s.id)}
            className={`rounded-sm px-3 py-1.5 font-govde text-sm transition ${
              sekme === s.id
                ? 'bg-murekkep text-kagit font-medium ring-2 ring-murekkep'
                : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi hover:ring-murekkep/50'
            }`}
          >
            {s.etiket}
          </button>
        ))}
      </div>

      {/* İzlediklerim */}
      {sekme === 'izlediklerim' && (
        <>
          {(() => {
            const kitapGonderileri = gonderiler.filter((g) => g.tur === 'kitap')
            if (kitapGonderileri.length === 0) return null
            const buYil = new Date().getFullYear()
            const buYilOkunan = kitapGonderileri.filter((g) => {
              const t = g.tarih?.toDate?.() || new Date(g.tarih)
              return !isNaN(t.getTime()) && t.getFullYear() === buYil
            }).length
            const turSayaci = {}
            kitapGonderileri.forEach((g) => {
              ;(g.turler || '').split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => {
                turSayaci[t] = (turSayaci[t] || 0) + 1
              })
            })
            const enCokTur = Object.entries(turSayaci).sort((a, b) => b[1] - a[1])[0]?.[0]
            const hedef = hedefProfil.yillikOkumaHedefi || 0

            return (
              <div className="mb-8 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
                <p className="text-xs uppercase tracking-widest text-gise mb-2">Okuma Özeti — {buYil}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-murekkep">
                  <p>
                    <span className="font-medium">{buYilOkunan}</span> kitap okudun
                    {hedef > 0 && <span className="text-kraft"> / hedefin {hedef}</span>}
                  </p>
                  {enCokTur && (
                    <p>
                      En çok okuduğun tür: <span className="font-medium">{enCokTur}</span>
                    </p>
                  )}
                  <p>
                    Toplam <span className="font-medium">{kitapGonderileri.length}</span> kitap
                  </p>
                </div>
                {hedef > 0 && (
                  <div className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-kagit ring-1 ring-cizgi">
                    <div className="h-full bg-deniz" style={{ width: `${Math.min(100, Math.round((buYilOkunan / hedef) * 100))}%` }} />
                  </div>
                )}
              </div>
            )
          })()}

          {gonderiler.some((g) => (g.tur === 'sinema' || g.tur === 'dizi' || g.tur === 'kitap') && (g.posterUrl || g.ilgiliPosterUrl)) && (
            <>
              <h2 className="font-baslik text-lg text-murekkep mb-3">Poster Duvarı</h2>
              <div className="mb-8 grid grid-cols-5 gap-2 sm:grid-cols-7">
                {gonderiler
                  .filter((g) => (g.tur === 'sinema' || g.tur === 'dizi' || g.tur === 'kitap') && (g.posterUrl || g.ilgiliPosterUrl))
                  .map((g) => (
                    <Link key={g.id} to={`/gonderi/${g.id}`} className="block">
                      <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                        <img src={g.posterUrl || g.ilgiliPosterUrl} alt={g.baslik} className="h-full w-full object-cover" />
                      </div>
                    </Link>
                  ))}
              </div>
            </>
          )}

          <h2 className="font-baslik text-lg text-murekkep mb-3">Güncesi</h2>
          {gonderilerHatasi && (
            <p className="mb-3 text-xs text-muhur">
              Güncelerin yüklenirken hata oldu: {gonderilerHatasi}. Muhtemelen Firestore'da eksik bir indeks var —
              tarayıcı konsolundaki (F12) linke tıklayarak oluşturabilirsin.
            </p>
          )}
          <div className="space-y-4">
            {gonderiler.map((g, i) => (
              <div key={g.id}>
                <GonderiKarti gonderi={g} />
                {i < gonderiler.length - 1 && <div className="defter-cizgi mt-4" />}
              </div>
            ))}
            {gonderiler.length === 0 && <p className="text-sm text-kraft">Henüz paylaşım yok.</p>}
          </div>
        </>
      )}

      {/* Şu An Okuduklarım */}
      {sekme === 'suanda' && (
        <div>
          {izlenecekler.filter((i) => i.durum === 'okunuyor').length === 0 && (
            <p className="text-sm text-kraft">Şu an okunan/izlenen bir şey yok.</p>
          )}
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
            {izlenecekler
              .filter((i) => i.durum === 'okunuyor')
              .map((i) => (
                <div key={i.id}>
                  <PosterKart baslik={i.baslik} alt={i.alt} posterUrl={i.posterUrl} link={esereLink(i.tur, i.disId)} />
                  {i.toplamSayfa ? (
                    <>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-kagitKoyu ring-1 ring-cizgi">
                        <div
                          className="h-full bg-deniz"
                          style={{ width: `${Math.min(100, Math.round(((i.suankiSayfa || 0) / i.toplamSayfa) * 100))}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-[11px] text-kraft">
                        {i.suankiSayfa || 0} / {i.toplamSayfa} sayfa
                      </p>
                    </>
                  ) : null}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* İzleyeceklerim */}
      {sekme === 'izleyecegim' && (
        <div>
          {izlenecekler.filter((i) => i.durum !== 'okunuyor').length === 0 && (
            <p className="text-sm text-kraft">İzleyecekler listesi boş.</p>
          )}
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
            {izlenecekler
              .filter((i) => i.durum !== 'okunuyor')
              .map((i) => (
                <div key={i.id} className="relative">
                  <PosterKart baslik={i.baslik} alt={i.alt} posterUrl={i.posterUrl} link={esereLink(i.tur, i.disId)} />
                  {benimProfilimMi && (
                    <button
                      onClick={() => izlenecekSil(i)}
                      className="absolute right-1 top-1 rounded-full bg-kagit/90 px-1.5 py-0.5 text-[10px] text-kraft ring-1 ring-cizgi hover:text-muhur"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Favoriler */}
      {sekme === 'favoriler' && (
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            {FAVORI_TURLERI.map((t) => (
              <button
                key={t.id}
                onClick={() => setFavoriSekmesi(t.id)}
                className={`rounded-sm px-3 py-1 font-govde text-xs ${
                  favoriSekmesi === t.id ? 'bg-deniz text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'
                }`}
              >
                {t.etiket}
              </button>
            ))}
          </div>
          {favoriler.length === 0 && <p className="text-sm text-kraft">Bu kategoride favori yok.</p>}
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
            {favoriler.map((f) => (
              <div key={f.id} className="relative">
                <PosterKart baslik={f.baslik} alt={f.alt} posterUrl={f.posterUrl} link={esereLink(f.tur, f.disId)} />
                {benimProfilimMi && (
                  <button
                    onClick={() => favoriSil(f)}
                    className="absolute right-1 top-1 rounded-full bg-kagit/90 px-1.5 py-0.5 text-[10px] text-kraft ring-1 ring-cizgi hover:text-muhur"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raflarım */}
      {sekme === 'raflarim' && (
        <div>
          {kullanici && (
            <button
              onClick={() => setRafFormuAcik((a) => !a)}
              className="mb-4 rounded-sm bg-muhur px-3 py-1.5 font-govde text-sm text-kagit"
            >
              {rafFormuAcik ? 'Vazgeç' : '+ Raf Oluştur'}
            </button>
          )}
          {rafFormuAcik && (
            <form onSubmit={rafOlusturTiklandi} className="mb-4 space-y-2 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
              <input
                type="text"
                value={rafBaslik}
                onChange={(e) => setRafBaslik(e.target.value)}
                required
                placeholder="Raf adı (örn. 2026 Okuma Listem)"
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
              <textarea
                value={rafAciklama}
                onChange={(e) => setRafAciklama(e.target.value)}
                rows={2}
                placeholder="Açıklama (opsiyonel)"
                className="w-full rounded-sm bg-kagit px-3 py-2 text-sm text-murekkep ring-1 ring-cizgi"
              />
              <button
                type="submit"
                disabled={rafKaydediliyor}
                className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
              >
                {rafKaydediliyor ? 'Oluşturuluyor...' : 'Oluştur'}
              </button>
            </form>
          )}

          {raflar.length === 0 && <p className="text-sm text-kraft">Henüz bir raf oluşturmadın.</p>}
          <ul className="space-y-2">
            {raflar.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
                <Link to={`/raf/${r.id}`} className="flex-1">
                  <p className="font-govde text-sm text-murekkep">{r.baslik}</p>
                  {r.aciklama && <p className="text-xs text-kraft">{r.aciklama}</p>}
                  <p className="mt-0.5 text-[11px] text-kraft">{r.ogeSayisi || 0} eser</p>
                </Link>
                {benimProfilimMi && (
                  <button onClick={() => rafiSil(r.id)} className="text-xs text-kraft hover:text-muhur">
                    Sil
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Yorumlarım */}
      {sekme === 'yorumlarim' && (
        <div>
          {yorumlarim.length === 0 && <p className="text-sm text-kraft">Henüz kimseye yorum yapılmamış.</p>}
          <ul className="space-y-3">
            {yorumlarim.map((y) => (
              <li key={y.id} className="rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
                <Link to={`/gonderi/${y.gonderiId}`} className="text-xs text-deniz hover:underline">
                  {y.gonderiBasligi || 'Günce'}
                </Link>
                <p className="mt-1 text-sm text-murekkep">{y.metin}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

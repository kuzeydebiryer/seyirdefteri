import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useGonderiler } from '../hooks/useGonderiler.js'
import { useTakip } from '../hooks/useTakip.js'
import { takipEt, takipBirak } from '../utils/takip.js'
import { uretDavetKodu } from '../utils/davetKodu.js'
import GonderiKarti from '../components/GonderiKarti.jsx'
import Avatar from '../components/Avatar.jsx'

export default function Profil() {
  const { uid } = useParams()
  const { kullanici, profil: kendiProfilim, profilGuncelle } = useAuth()
  const benimProfilimMi = kullanici?.uid === uid

  const [hedefProfil, setHedefProfil] = useState(benimProfilimMi ? kendiProfilim : null)
  const { gonderiler, hata: gonderilerHatasi } = useGonderiler({ yazarId: uid })
  const { takipEdiyorMu, setTakipEdiyorMu, takipciSayisi, takipEdilenSayisi } = useTakip(uid, kullanici?.uid)
  const [takipIsleniyor, setTakipIsleniyor] = useState(false)

  const [davetKodlari, setDavetKodlari] = useState([])
  const [uretiliyor, setUretiliyor] = useState(false)

  const [duzenlemeAcik, setDuzenlemeAcik] = useState(false)
  const [bioTaslak, setBioTaslak] = useState('')
  const [avatarTaslak, setAvatarTaslak] = useState('')
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
    }
  }, [hedefProfil, benimProfilimMi])

  async function profiliKaydet(e) {
    e.preventDefault()
    setKaydediliyor(true)
    try {
      await profilGuncelle({ bio: bioTaslak, avatarUrl: avatarTaslak })
      setHedefProfil((onceki) => ({ ...onceki, bio: bioTaslak, avatarUrl: avatarTaslak }))
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

  if (!hedefProfil) return <p className="text-kraft text-sm">Yükleniyor...</p>

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
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { diziMuzikBegeniliMi, diziMuzikBegen, diziMuzikBegeniKaldir } from '../utils/diziMuzigiBegeni.js'

const diziMuzigiGetirCallable = httpsCallable(functions, 'diziMuzigiGetir')

// FilmMuzigiWidget'ın dizi karşılığı — Spotify'da bu dizinin resmi soundtrack
// albümü varsa gömülü player olarak gösterir. Filmlerin aksine dizilerin
// çoğunda resmi bir soundtrack albümü YOK — bulunamazsa (beklenen, sık
// durum) sessizce hiçbir şey göstermez.
export default function DiziMuzigiWidget({ tmdbId, diziAdi, yil, posterUrl, bestekarAdi }) {
  const { kullanici, profil } = useAuth()
  const [sonuc, setSonuc] = useState(undefined) // undefined = yükleniyor
  const [yenidenAraniyor, setYenidenAraniyor] = useState(false)
  const [begenildi, setBegenildi] = useState(false)
  const [begeniIsleniyor, setBegeniIsleniyor] = useState(false)

  const guncelIstekRef = useRef(0)

  function ara(zorlaYenile = false) {
    const buIstekNo = ++guncelIstekRef.current
    setSonuc(undefined)
    diziMuzigiGetirCallable({ tmdbId, diziAdi, yil, bestekarAdi, zorlaYenile })
      .then((res) => {
        if (buIstekNo === guncelIstekRef.current) setSonuc(res.data)
      })
      .catch(() => {
        if (buIstekNo === guncelIstekRef.current) setSonuc({ spotifyAlbumId: null })
      })
  }

  useEffect(() => {
    ara(false)
  }, [tmdbId, diziAdi, yil, bestekarAdi])

  useEffect(() => {
    if (!kullanici || !sonuc?.spotifyAlbumId) {
      setBegenildi(false)
      return
    }
    let iptal = false
    diziMuzikBegeniliMi(kullanici.uid, tmdbId).then((deger) => {
      if (!iptal) setBegenildi(deger)
    })
    return () => {
      iptal = true
    }
  }, [kullanici, tmdbId, sonuc?.spotifyAlbumId])

  async function yenidenAraTiklandi() {
    setYenidenAraniyor(true)
    ara(true)
    setYenidenAraniyor(false)
  }

  async function begenTiklandi() {
    if (!kullanici) return
    setBegeniIsleniyor(true)
    try {
      if (begenildi) {
        await diziMuzikBegeniKaldir(kullanici.uid, tmdbId)
      } else {
        await diziMuzikBegen(kullanici.uid, {
          kullaniciAdi: profil?.adSoyad || kullanici.displayName,
          tmdbId,
          diziBaslik: diziAdi,
          diziYil: yil,
          posterUrl,
          spotifyAlbumId: sonuc.spotifyAlbumId,
        })
      }
      setBegenildi((b) => !b)
    } finally {
      setBegeniIsleniyor(false)
    }
  }

  if (sonuc === undefined) return null
  if (!sonuc.spotifyAlbumId) return null

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-baslik text-lg text-murekkep">🎵 Dizi Müziği</h2>
        <div className="flex items-center gap-3">
          {kullanici && (
            <button
              onClick={begenTiklandi}
              disabled={begeniIsleniyor}
              className={`text-sm transition ${begenildi ? 'text-muhur' : 'text-kraft hover:text-murekkep'}`}
              title={begenildi ? 'Beğeniyi kaldır' : 'Beğen'}
            >
              {begenildi ? '♥' : '♡'}
            </button>
          )}
          {kullanici && (
            <button
              onClick={yenidenAraTiklandi}
              disabled={yenidenAraniyor}
              className="text-[11px] text-kraft hover:text-deniz disabled:opacity-40"
              title="Bu eşleşme yanlışsa yeniden ara"
            >
              {yenidenAraniyor ? 'Aranıyor...' : '🔄 Yanlış mı?'}
            </button>
          )}
        </div>
      </div>
      <iframe
        src={`https://open.spotify.com/embed/album/${sonuc.spotifyAlbumId}?utm_source=generator&theme=0`}
        width="100%"
        height="152"
        style={{ borderRadius: 8, border: 'none' }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title="Dizi Müziği (Spotify)"
      />
      {sonuc.guvenSeviyesi && sonuc.guvenSeviyesi !== 'yuksek' && (
        <p className="mt-1 text-[10px] text-kraft">
          Bu eşleşme tam doğrulanamadı, {sonuc.guvenSeviyesi === 'orta' ? 'yıl yakınlığına göre tahmin edildi' : 'ilk sonuç kabul edildi'} — yanlışsa
          yukarıdan bildirin.
        </p>
      )}
    </div>
  )
}

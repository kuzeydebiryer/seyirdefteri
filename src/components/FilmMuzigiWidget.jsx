import { useEffect, useRef, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase.js'
import { gorunenAdGetir } from '../utils/gorunenAd.js'
import { useAuth } from '../context/AuthContext.jsx'
import { muzikBegeniliMi, muzikBegen, muzikBegeniKaldir } from '../utils/filmMuzigiBegeni.js'

const filmMuzigiGetirCallable = httpsCallable(functions, 'filmMuzigiGetir')

// Film sayfasında "Film Müziği" bölümü — Spotify'da bu filmin resmi
// soundtrack albümü varsa gömülü player olarak gösterir. Bulunamazsa
// (küçük/bağımsız yapımlarda sık) sessizce hiçbir şey göstermez.
//
// bestekarAdi verilirse (TMDB'den "Original Music Composer"), sunucu
// tarafında bulunan albümün sanatçısıyla karşılaştırılır — alakasız bir
// albümün yanlışlıkla eşleşmesini önlemek için (bkz. "Sil Baştan" hatası).
export default function FilmMuzigiWidget({ tmdbId, filmAdi, yil, posterUrl, bestekarAdi }) {
  const { kullanici, profil } = useAuth()
  const [sonuc, setSonuc] = useState(undefined) // undefined = yükleniyor
  const [yenidenAraniyor, setYenidenAraniyor] = useState(false)
  const [begenildi, setBegenildi] = useState(false)
  const [begeniIsleniyor, setBegeniIsleniyor] = useState(false)

  // Bileşen "Benzer Filmler" gibi bağlantılarla aynı kalıp sadece tmdbId'nin
  // değiştiği durumlarda YENİDEN MOUNT OLMUYOR — önceki filmin isteği geç
  // dönerse, yeni filmin doğru sonucunun üzerine yazabiliyordu (yarış
  // durumu). "iptalRef" ile, bir istek başladığında bir öncekini geçersiz
  // sayıp yanıtını görmezden geliyoruz — sitenin diğer veri çekme
  // efektlerindeki standart "iptal" desenin bu bileşene özel bir versiyonu
  // (burada normal useEffect cleanup yerine, yeniden arama butonunun da aynı
  // korumaya ihtiyacı olduğundan paylaşılan bir fonksiyon içinde tutuluyor).
  const guncelIstekRef = useRef(0)

  function ara(zorlaYenile = false) {
    const buIstekNo = ++guncelIstekRef.current
    setSonuc(undefined)
    filmMuzigiGetirCallable({ tmdbId, filmAdi, yil, bestekarAdi, zorlaYenile })
      .then((res) => {
        if (buIstekNo === guncelIstekRef.current) setSonuc(res.data)
      })
      .catch(() => {
        if (buIstekNo === guncelIstekRef.current) setSonuc({ spotifyAlbumId: null })
      })
  }

  useEffect(() => {
    ara(false)
  }, [tmdbId, filmAdi, yil, bestekarAdi])

  useEffect(() => {
    if (!kullanici || !sonuc?.spotifyAlbumId) {
      setBegenildi(false)
      return
    }
    let iptal = false
    muzikBegeniliMi(kullanici.uid, tmdbId).then((deger) => {
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
        await muzikBegeniKaldir(kullanici.uid, tmdbId)
      } else {
        await muzikBegen(kullanici.uid, {
          kullaniciAdi: gorunenAdGetir(profil, kullanici.displayName),
          tmdbId,
          filmBaslik: filmAdi,
          filmYil: yil,
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
        <h2 className="font-baslik text-lg text-murekkep">🎵 Film Müziği</h2>
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
        title="Film Müziği (Spotify)"
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

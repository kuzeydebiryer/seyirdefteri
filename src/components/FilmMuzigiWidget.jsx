import { useEffect, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase.js'

const filmMuzigiGetirCallable = httpsCallable(functions, 'filmMuzigiGetir')

// Film sayfasında "Film Müziği" bölümü — Spotify'da bu filmin resmi
// soundtrack albümü varsa gömülü player olarak gösterir. Bulunamazsa
// (küçük/bağımsız yapımlarda sık) sessizce hiçbir şey göstermez.
export default function FilmMuzigiWidget({ tmdbId, filmAdi, yil }) {
  const [albumId, setAlbumId] = useState(undefined) // undefined = yükleniyor, null = bulunamadı

  useEffect(() => {
    let iptal = false
    setAlbumId(undefined)
    filmMuzigiGetirCallable({ tmdbId, filmAdi, yil })
      .then((sonuc) => {
        if (!iptal) setAlbumId(sonuc.data?.spotifyAlbumId ?? null)
      })
      .catch(() => {
        if (!iptal) setAlbumId(null)
      })
    return () => {
      iptal = true
    }
  }, [tmdbId, filmAdi, yil])

  if (!albumId) return null

  return (
    <div className="mt-6">
      <h2 className="mb-2 font-baslik text-lg text-murekkep">🎵 Film Müziği</h2>
      <iframe
        src={`https://open.spotify.com/embed/album/${albumId}?utm_source=generator&theme=0`}
        width="100%"
        height="152"
        style={{ borderRadius: 8, border: 'none' }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title="Film Müziği (Spotify)"
      />
    </div>
  )
}

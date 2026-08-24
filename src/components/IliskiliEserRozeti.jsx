import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { iliskiliLink } from '../utils/ilhamPanosu.js'

const TUR_ETIKETI = { sinema: '🎬 Film', dizi: '📺 Dizi', kitap: '📖 Kitap', kisi: '🎭 Oyuncu' }
// Etiketin İLK KELİMESİNİN emoji'si — TUR_ETIKETI[...].charAt(0) DEĞİL.
// Emoji'ler UTF-16'da iki kod birimden (surrogate pair) oluşur; charAt(0)
// bunu ortadan bölüp geçersiz/yarım bir karakter döndürüyordu, tarayıcı da
// bunu kırık bir "◆" gibi gösteriyordu — ekran görüntüsündeki asıl sorun
// buydu (poster eksikliğinden BAĞIMSIZ, ayrı bir hataydı).
const TUR_IKONU = { sinema: '🎬', dizi: '📺', kitap: '📖', kisi: '🎭' }

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w200'

// Paylaşım oluşturulduğu ANDAKİ poster'ı donduruyoruz (iliskiliPosterUrl) —
// eser sayfasında poster SONRADAN eklenir/düzeltilirse (örn. "Bilgiyi
// Düzenle" ile) bu dondurulmuş kopya güncellenmiyordu, kart posteri hep eksik
// kalıyordu. Poster eksikse (ilk kayıtta hiç yoktu ya da sonradan eklendi)
// bir kereye mahsus, canlı kaynaktan (kitap için Firestore, film/dizi/kişi
// için TMDB) çekip yerelde saklıyoruz — her render'da tekrar sormuyoruz.
export default function IliskiliEserRozeti({ ilham }) {
  const [canliPosterUrl, setCanliPosterUrl] = useState(null)

  useEffect(() => {
    if (ilham.iliskiliPosterUrl || !ilham.iliskiliTur || ilham.iliskiliDisId == null) return
    let iptal = false
    async function getir() {
      try {
        if (ilham.iliskiliTur === 'kitap') {
          const snap = await getDoc(doc(db, 'kitaplar', String(ilham.iliskiliDisId)))
          if (!iptal && snap.exists() && snap.data().posterUrl) setCanliPosterUrl(snap.data().posterUrl)
          return
        }
        if (!TMDB_API_KEY) return
        const yol = ilham.iliskiliTur === 'sinema' ? 'movie' : ilham.iliskiliTur === 'dizi' ? 'tv' : 'person'
        const res = await fetch(`https://api.themoviedb.org/3/${yol}/${ilham.iliskiliDisId}?api_key=${TMDB_API_KEY}`)
        const veri = await res.json()
        const yol_ = veri.poster_path || veri.profile_path
        if (!iptal && yol_) setCanliPosterUrl(`${TMDB_POSTER}${yol_}`)
      } catch {
        // Sessizce vazgeç — poster olmadan da rozet çalışmaya devam ediyor.
      }
    }
    getir()
    return () => {
      iptal = true
    }
  }, [ilham.iliskiliPosterUrl, ilham.iliskiliTur, ilham.iliskiliDisId])

  const link = iliskiliLink(ilham.iliskiliTur, ilham.iliskiliDisId)
  if (!link || !ilham.iliskiliBaslik) return null

  const posterUrl = ilham.iliskiliPosterUrl || canliPosterUrl

  return (
    <Link
      to={link}
      className="mb-2 flex items-center gap-2 rounded-sm bg-kagit p-1.5 ring-1 ring-cizgi transition hover:ring-deniz/50"
    >
      {posterUrl ? (
        <img src={posterUrl} alt={ilham.iliskiliBaslik} className="h-10 w-7 shrink-0 rounded-sm object-cover" />
      ) : (
        <span className="flex h-10 w-7 shrink-0 items-center justify-center rounded-sm bg-kagitKoyu text-xs">
          {TUR_IKONU[ilham.iliskiliTur] || '🔗'}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[10px] text-kraft">{TUR_ETIKETI[ilham.iliskiliTur] || 'İlgili'}</p>
        <p className="truncate text-xs font-medium text-murekkep">
          {ilham.iliskiliBaslik}
          {ilham.iliskiliYil && <span className="text-kraft"> ({ilham.iliskiliYil})</span>}
        </p>
        {ilham.iliskiliAlt && <p className="truncate text-[11px] text-kraft">{ilham.iliskiliAlt}</p>}
      </div>
    </Link>
  )
}

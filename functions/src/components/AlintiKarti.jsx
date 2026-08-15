import { useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from './Avatar.jsx'

const KISALTMA_UZUNLUGU = 180

// Alıntı Duvarı, Anasayfa akışı, Kitap hub'ı ve kitap sayfası — hepsi aynı
// kart görünümünü kullanır ki kapak/beğen davranışı her yerde tutarlı olsun.
export default function AlintiKarti({ alinti, kullanici, onBegenTiklandi, onSilTiklandi, kapakGoster = true }) {
  const begeniyorMu = kullanici && (alinti.begenenler || []).includes(kullanici.uid)
  const [genisletildi, setGenisletildi] = useState(false)

  const uzunMu = alinti.metin.length > KISALTMA_UZUNLUGU
  const gosterilenMetin = genisletildi || !uzunMu ? alinti.metin : alinti.metin.slice(0, KISALTMA_UZUNLUGU).trimEnd() + '…'

  return (
    <li className="flex gap-3 rounded-sm bg-kagitKoyu p-4 ring-1 ring-cizgi">
      {kapakGoster && alinti.kitapPosterUrl && (
        <Link to={`/kitap/${alinti.kitapId}`} className="shrink-0">
          <img src={alinti.kitapPosterUrl} alt={alinti.kitapBaslik} className="h-16 w-11 rounded-sm object-cover ring-1 ring-cizgi" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-baslik text-sm italic text-murekkep">"{gosterilenMetin}"</p>
        {uzunMu && (
          <button onClick={() => setGenisletildi((g) => !g)} className="mt-0.5 text-[11px] text-kraft hover:text-deniz hover:underline">
            {genisletildi ? '↑ Daha Az Göster' : 'Devamını Oku →'}
          </button>
        )}
        {kapakGoster && (
          <Link to={`/kitap/${alinti.kitapId}`} className="mt-1 block text-xs text-kraft hover:text-deniz hover:underline">
            {alinti.kitapBaslik}
            {alinti.kitapYazar && ` · ${alinti.kitapYazar}`}
            {alinti.sayfa && ` · s. ${alinti.sayfa}`}
          </Link>
        )}
        {!kapakGoster && alinti.sayfa && <p className="mt-1 text-xs text-kraft">s. {alinti.sayfa}</p>}
        <div className="mt-2 flex items-center gap-2 text-xs text-kraft">
          <Link to={`/profil/${alinti.kullaniciId}`} className="flex items-center gap-2">
            <Avatar adSoyad={alinti.kullaniciAdi} avatarUrl={alinti.kullaniciAvatarUrl} boyut="h-5 w-5" />
            <span className="font-medium text-murekkep">{alinti.kullaniciAdi}</span>
          </Link>
          <button
            onClick={() => onBegenTiklandi(alinti)}
            disabled={!kullanici}
            className={`ml-auto ${begeniyorMu ? 'text-muhur' : 'text-kraft hover:text-muhur'}`}
          >
            {begeniyorMu ? '♥' : '♡'} {(alinti.begenenler || []).length || ''}
          </button>
          {onSilTiklandi && kullanici?.uid === alinti.kullaniciId && (
            <button onClick={() => onSilTiklandi(alinti.id)} className="text-kraft hover:text-muhur">
              Sil
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

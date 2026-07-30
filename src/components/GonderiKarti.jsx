import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { begeniDegistir } from '../utils/begeni.js'
import YildizPuan from './YildizPuan.jsx'
import Avatar from './Avatar.jsx'
import GonderiIcerik from './GonderiIcerik.jsx'

function tarihGoster(deger) {
  if (!deger) return ''
  // Firestore serverTimestamp() okurken bir Timestamp nesnesi döner (düz string değil),
  // bu yüzden önce onu gerçek bir Date'e çevirmemiz gerekiyor.
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function GonderiKarti({ gonderi }) {
  const { kullanici, profil } = useAuth()
  const [begenenler, setBegenenler] = useState(gonderi.begenenler || [])
  const benBegendimMi = kullanici && begenenler.includes(kullanici.uid)

  async function begenTiklandi() {
    if (!kullanici) return
    const yeni = benBegendimMi ? begenenler.filter((u) => u !== kullanici.uid) : [...begenenler, kullanici.uid]
    setBegenenler(yeni) // iyimser güncelleme
    await begeniDegistir(gonderi.id, kullanici.uid, benBegendimMi)
  }

  return (
    <article className="gonderi-karti flex gap-4 p-4">
      {(gonderi.posterUrl || gonderi.ilgiliPosterUrl) && (
        <Link to={`/gonderi/${gonderi.id}`} className="shrink-0">
          <img
            src={gonderi.posterUrl || gonderi.ilgiliPosterUrl}
            alt={gonderi.baslik}
            className="h-28 w-20 rounded-sm object-cover ring-1 ring-cizgi"
          />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-kraft">
          <Link to={`/profil/${gonderi.yazarId}`} className="shrink-0">
            <Avatar adSoyad={gonderi.yazarAdi} avatarUrl={gonderi.yazarAvatarUrl} boyut="h-5 w-5" />
          </Link>
          <Link to={`/profil/${gonderi.yazarId}`} className="font-medium text-murekkep hover:underline">
            {gonderi.yazarAdi}
          </Link>
          <span>·</span>
          <span>{tarihGoster(gonderi.tarih)}</span>
          <span className="rounded-full bg-kagitKoyu px-2 py-0.5 text-[10px] uppercase tracking-wide ring-1 ring-cizgi">
            {{ sinema: 'Sinema', kitap: 'Kitap', yazi: 'Yazı', gezi: 'Gezi', etkinlik: 'Etkinlik' }[gonderi.tur] || 'Sinema'}
          </span>
          {gonderi.tur === 'yazi' && gonderi.altTur && (
            <span className="text-[11px] text-kraft">
              {{ deneme: 'Deneme', 'film-incelemesi': 'Film İncelemesi', 'kitap-incelemesi': 'Kitap İncelemesi' }[gonderi.altTur]}
            </span>
          )}
        </div>

        <Link to={`/gonderi/${gonderi.id}`}>
          <h3 className="font-baslik text-lg text-murekkep mt-1">
            {gonderi.baslik} {gonderi.yil && <span className="text-kraft text-sm">({gonderi.yil})</span>}
          </h3>
        </Link>
        {gonderi.tur === 'kitap' && gonderi.yazar && <p className="text-xs text-kraft -mt-1">{gonderi.yazar}</p>}
        {(gonderi.tur === 'gezi' || gonderi.tur === 'etkinlik') && gonderi.konum && (
          <p className="text-xs text-kraft -mt-1">
            {gonderi.tur === 'etkinlik' && gonderi.turler && `${gonderi.turler} · `}
            {gonderi.konum}
            {gonderi.etkinlikTarihi && ` · ${new Date(gonderi.etkinlikTarihi).toLocaleDateString('tr-TR')}`}
          </p>
        )}
        {gonderi.tur === 'yazi' && gonderi.ilgiliBaslik && (
          <p className="text-xs text-kraft -mt-1">
            İncelenen: {gonderi.ilgiliBaslik} {gonderi.ilgiliYil && `(${gonderi.ilgiliYil})`}
            {gonderi.ilgiliYazar && ` · ${gonderi.ilgiliYazar}`}
          </p>
        )}

        {(gonderi.tur === 'sinema' || gonderi.tur === 'kitap') && (gonderi.turler || gonderi.sureDk || gonderi.sayfaSayisi) && (
          <p className="text-[11px] text-kraft">
            {[gonderi.turler, gonderi.sureDk && `${gonderi.sureDk} dk`, gonderi.sayfaSayisi && `${gonderi.sayfaSayisi} sayfa`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}

        {gonderi.kullaniciPuani && <YildizPuan puan={gonderi.kullaniciPuani} boyut="text-sm" />}

        {gonderi.gunce && <GonderiIcerik metin={gonderi.gunce} tam={false} />}

        <div className="mt-2 flex items-center gap-4 text-xs text-kraft">
          <button
            onClick={begenTiklandi}
            disabled={!kullanici}
            className={`transition ${benBegendimMi ? 'text-muhur font-medium' : 'hover:text-murekkep'}`}
          >
            {benBegendimMi ? '♥' : '♡'} {begenenler.length > 0 && begenenler.length}
          </button>
          <Link to={`/gonderi/${gonderi.id}`} className="hover:text-murekkep">
            💬 {gonderi.yorumSayisi || 0} yorum
          </Link>
        </div>
      </div>
    </article>
  )
}

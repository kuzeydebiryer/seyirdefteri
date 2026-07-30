import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { begeniDegistir } from '../utils/begeni.js'
import { kategoriBilgi } from '../data/kategoriler.js'
import YildizPuan from './YildizPuan.jsx'
import Avatar from './Avatar.jsx'
import GonderiIcerik from './GonderiIcerik.jsx'

const ALT_TUR_ETIKET = { deneme: 'Deneme', 'film-incelemesi': 'Film İncelemesi', 'kitap-incelemesi': 'Kitap İncelemesi' }

function tarihGoster(deger) {
  if (!deger) return ''
  const d = typeof deger?.toDate === 'function' ? deger.toDate() : new Date(deger)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function GonderiKarti({ gonderi }) {
  const { kullanici, profil } = useAuth()
  const navigate = useNavigate()
  const [begenenler, setBegenenler] = useState(gonderi.begenenler || [])
  const benBegendimMi = kullanici && begenenler.includes(kullanici.uid)
  const bilgi = kategoriBilgi(gonderi.tur)
  const gorsel = gonderi.posterUrl || gonderi.ilgiliPosterUrl
  const yatayGorsel = bilgi.oran === 'yatay'

  async function begenTiklandi(e) {
    e.stopPropagation()
    if (!kullanici) return
    const yeni = benBegendimMi ? begenenler.filter((u) => u !== kullanici.uid) : [...begenenler, kullanici.uid]
    setBegenenler(yeni)
    await begeniDegistir(gonderi.id, kullanici.uid, benBegendimMi)
  }

  function kartaTiklandi() {
    navigate(`/gonderi/${gonderi.id}`)
  }

  return (
    <article
      onClick={kartaTiklandi}
      className="gonderi-karti relative flex cursor-pointer gap-4 overflow-hidden p-4 pl-5 transition hover:ring-1 hover:ring-cizgi"
    >
      {/* Kategoriye özel renkli şerit — imza öğesinin kategori bazlı versiyonu */}
      <div className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: bilgi.renk }} />

      <div className={`shrink-0 overflow-hidden rounded-sm bg-kagit ring-1 ring-cizgi ${yatayGorsel ? 'h-20 w-28' : 'h-28 w-20'}`}>
        {gorsel ? (
          <img src={gorsel} alt={gonderi.baslik} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">{bilgi.ikon}</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-kraft">
          <Link to={`/profil/${gonderi.yazarId}`} onClick={(e) => e.stopPropagation()} className="shrink-0">
            <Avatar adSoyad={gonderi.yazarAdi} avatarUrl={gonderi.yazarAvatarUrl} boyut="h-5 w-5" />
          </Link>
          <Link
            to={`/profil/${gonderi.yazarId}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-murekkep hover:underline"
          >
            {gonderi.yazarAdi}
          </Link>
          <span>·</span>
          <span>{tarihGoster(gonderi.tarih)}</span>
          <span
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide text-kagit"
            style={{ backgroundColor: bilgi.renk }}
          >
            <span>{bilgi.ikon}</span>
            {bilgi.etiket}
          </span>
          {gonderi.tur === 'yazi' && gonderi.altTur && (
            <span className="text-[11px] text-kraft">{ALT_TUR_ETIKET[gonderi.altTur]}</span>
          )}
        </div>

        <h3 className="font-baslik text-lg text-murekkep mt-1">
          {gonderi.baslik} {gonderi.yil && <span className="text-kraft text-sm">({gonderi.yil})</span>}
        </h3>

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
            {[gonderi.turler, gonderi.sureDk && `⏱ ${gonderi.sureDk} dk`, gonderi.sayfaSayisi && `📄 ${gonderi.sayfaSayisi} sayfa`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}

        {gonderi.kullaniciPuani && <YildizPuan puan={gonderi.kullaniciPuani} boyut="text-sm" />}

        {gonderi.gunce && (
          <>
            <GonderiIcerik metin={gonderi.gunce} tam={false} />
            <span className="mt-0.5 inline-block text-xs text-kraft">Devamını oku →</span>
          </>
        )}

        <div className="mt-2 flex items-center gap-4 text-xs text-kraft">
          <button
            onClick={begenTiklandi}
            disabled={!kullanici}
            className={`transition ${benBegendimMi ? 'text-muhur font-medium' : 'hover:text-murekkep'}`}
          >
            {benBegendimMi ? '♥' : '♡'} {begenenler.length > 0 && begenenler.length}
          </button>
          <span>💬 {gonderi.yorumSayisi || 0} yorum</span>
        </div>
      </div>
    </article>
  )
}
